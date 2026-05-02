-- ScoreBoost DB Schema v3 (Phase 1 + pgvector 캐싱)
-- Supabase SQL Editor에서 전체 실행

-- ── pgvector 확장 ────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS vector;

-- ── 기존 초기화 ──────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS wrong_notes    CASCADE;
DROP TABLE IF EXISTS problems       CASCADE;
DROP TABLE IF EXISTS users          CASCADE;
DROP TABLE IF EXISTS sentences      CASCADE;
DROP TABLE IF EXISTS grammar_patterns CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user CASCADE;
DROP FUNCTION IF EXISTS match_sentences CASCADE;
DROP FUNCTION IF EXISTS match_patterns  CASCADE;

-- ── grammar_patterns: 문법 패턴 사전 (씨드 스크립트로 채움) ──────────────────
CREATE TABLE grammar_patterns (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_name     text NOT NULL UNIQUE,
  grammar_category text NOT NULL,
  school_level     text NOT NULL CHECK (school_level IN ('중학교', '고등학교_공통', '고등학교_심화')),
  curriculum       text DEFAULT '2022',
  embedding        vector(1536),
  blocks           jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- blocks: { D: "문법설명", E: "왜쓰는지", F: "틀린예비교" }
  example_sentences jsonb DEFAULT '[]'::jsonb,
  common_mistakes   jsonb DEFAULT '[]'::jsonb,
  vocab_level       int  DEFAULT 1500,
  created_at        timestamptz DEFAULT now()
);

-- ── sentences: GPT 분석 캐시 (공유, 인증 불필요) ────────────────────────────
CREATE TABLE sentences (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sentence         text NOT NULL UNIQUE,
  translation      text,
  grammar_tags     text[],
  embedding        vector(1536),
  blocks           jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- blocks: { A, B, C, D?, E?, F?, G }
  pattern_id       uuid REFERENCES grammar_patterns(id) ON DELETE SET NULL,
  difficulty_level text,
  trust_score      float DEFAULT 0.7,
  source           text DEFAULT 'ai_generated',
  -- source: 'ai_generated' | 'db_hit' | 'pattern_hit'
  created_at       timestamptz DEFAULT now()
);

-- ── users: Supabase Auth 연동 ────────────────────────────────────────────────
CREATE TABLE users (
  id           uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name         text,
  email        text,
  telegram_id  text,
  school_level text CHECK (school_level IN ('중1','중2','중3','고1','고2','고3')),
  created_at   timestamptz DEFAULT now()
);

-- ── problems: 텔레그램 /복습 커맨드용 ────────────────────────────────────────
CREATE TABLE problems (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sentence_id uuid REFERENCES sentences(id) ON DELETE CASCADE,
  question    text NOT NULL,
  answer      text NOT NULL,
  explanation text,
  created_at  timestamptz DEFAULT now()
);

-- ── wrong_notes: 사용자별 오답 + 망각곡선 스케줄 ────────────────────────────
CREATE TABLE wrong_notes (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  sentence_id  uuid REFERENCES sentences(id) ON DELETE SET NULL,
  sentence     text NOT NULL,
  translation  text,
  grammar_tag  text,
  blocks       jsonb,
  review_count integer     DEFAULT 0,
  next_review  timestamptz DEFAULT (now() + interval '1 day'),
  created_at   timestamptz DEFAULT now()
);

-- ── 인덱스 ───────────────────────────────────────────────────────────────────
-- hnsw: 소규모 데이터셋에서 ivfflat보다 안정적
CREATE INDEX ON sentences       USING hnsw (embedding vector_cosine_ops);
CREATE INDEX ON grammar_patterns USING hnsw (embedding vector_cosine_ops);
CREATE INDEX ON sentences       USING GIN  (grammar_tags);
CREATE INDEX ON wrong_notes     (user_id);
CREATE INDEX ON wrong_notes     (user_id, next_review);
CREATE INDEX ON wrong_notes     (grammar_tag);
CREATE INDEX ON problems        (sentence_id);

-- ── 벡터 유사도 검색 함수 (문장) ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION match_sentences(
  query_embedding  vector(1536),
  match_threshold  float DEFAULT 0.90,
  match_count      int   DEFAULT 1
)
RETURNS TABLE (
  id               uuid,
  sentence         text,
  translation      text,
  grammar_tags     text[],
  blocks           jsonb,
  pattern_id       uuid,
  difficulty_level text,
  trust_score      float,
  similarity       float
)
LANGUAGE sql STABLE AS $$
  SELECT
    s.id, s.sentence, s.translation, s.grammar_tags,
    s.blocks, s.pattern_id, s.difficulty_level, s.trust_score,
    1 - (s.embedding <=> query_embedding) AS similarity
  FROM sentences s
  WHERE s.embedding IS NOT NULL
    AND 1 - (s.embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
$$;

-- ── 벡터 유사도 검색 함수 (패턴) ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION match_patterns(
  query_embedding  vector(1536),
  match_threshold  float DEFAULT 0.75,
  match_count      int   DEFAULT 1
)
RETURNS TABLE (
  id               uuid,
  pattern_name     text,
  grammar_category text,
  school_level     text,
  blocks           jsonb,
  similarity       float
)
LANGUAGE sql STABLE AS $$
  SELECT
    gp.id, gp.pattern_name, gp.grammar_category,
    gp.school_level, gp.blocks,
    1 - (gp.embedding <=> query_embedding) AS similarity
  FROM grammar_patterns gp
  WHERE gp.embedding IS NOT NULL
    AND 1 - (gp.embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
$$;

-- ── RLS 활성화 ───────────────────────────────────────────────────────────────
ALTER TABLE users       ENABLE ROW LEVEL SECURITY;
ALTER TABLE wrong_notes ENABLE ROW LEVEL SECURITY;

-- users 정책
CREATE POLICY "본인 조회" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "본인 생성" ON users FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "본인 수정" ON users FOR UPDATE USING (auth.uid() = id);

-- wrong_notes 정책
CREATE POLICY "본인 오답 조회" ON wrong_notes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "본인 오답 추가" ON wrong_notes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "본인 오답 수정" ON wrong_notes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "본인 오답 삭제" ON wrong_notes FOR DELETE USING (auth.uid() = user_id);

-- sentences/problems/grammar_patterns: 공개 읽기 + 추가
CREATE POLICY "공개 읽기"  ON sentences        FOR SELECT USING (true);
CREATE POLICY "공개 추가"  ON sentences        FOR INSERT WITH CHECK (true);
CREATE POLICY "공개 읽기"  ON problems         FOR SELECT USING (true);
CREATE POLICY "공개 추가"  ON problems         FOR INSERT WITH CHECK (true);
CREATE POLICY "공개 읽기"  ON grammar_patterns FOR SELECT USING (true);
CREATE POLICY "공개 추가"  ON grammar_patterns FOR INSERT WITH CHECK (true);

-- ── Google 로그인 시 users 자동 생성 트리거 ──────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, name, email)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
