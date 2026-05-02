# ScoreBoost — Claude 작업 기록

## 앱 소개
영어 교과서 사진 → OCR → GPT 문법 해설 + 퀴즈 → 텔레그램 리포트

## 기술 스택
- Frontend: React + Vite + Tailwind → **Vercel** 배포
- Backend: Node.js + Express → **Render** 배포
- DB: **Supabase** (벡터 캐시, 오답노트, 인증)
- AI: OpenAI GPT-4o-mini + text-embedding-3-small
- 알림: Telegram Bot

## 현재 상태
코드 완성. **배포 진행 중.**

## 배포 체크리스트
- [ ] 1. GitHub 가입 + 코드 업로드
- [ ] 2. Supabase 프로젝트 생성 + `backend/db/schema.sql` 실행
- [ ] 3. Render 가입 + 백엔드 배포 + 환경변수 설정
- [ ] 4. Vercel 가입 + 프론트엔드 배포 + 환경변수 설정

## 환경변수 목록
### Backend (Render에 입력)
- `OPENAI_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_KEY` (서비스 롤 키)
- `TELEGRAM_BOT_TOKEN` ✅ 보유
- `FRONTEND_URL` (Vercel 배포 후 채움)
- `CRON_SECRET` (아무 랜덤 문자열)

### Frontend (Vercel에 입력)
- `VITE_API_URL` (Render 배포 후 채움)
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## 사용자 참고
비개발자. 단계별 상세 안내 필요. 전문용어 설명 병기.
