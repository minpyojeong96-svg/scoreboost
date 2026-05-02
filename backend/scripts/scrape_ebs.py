"""
실행: python scripts/scrape_ebs.py
EBS 중학 영어 공개 학습자료 크롤링 → sentences DB 저장

설치 필요:
  pip install requests beautifulsoup4 pymupdf openai supabase python-dotenv
"""

import os, time, re, json, tempfile
import requests
from bs4 import BeautifulSoup
import fitz  # PyMuPDF
from openai import OpenAI
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

supabase = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_KEY"] or os.environ["SUPABASE_KEY"])
openai   = OpenAI(api_key=os.environ["OPENAI_API_KEY"])

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36",
    "Accept-Language": "ko-KR,ko;q=0.9"
}

# ── EBS 중학 영어 강좌 목록 URL ───────────────────────────────────────────────
EBS_MIDDLE_URLS = [
    "https://www.ebs.co.kr/middle/search?query=중학+영어&grade=M1&subject=EN",
    "https://www.ebs.co.kr/middle/search?query=중학+영어&grade=M2&subject=EN",
    "https://www.ebs.co.kr/middle/search?query=중학+영어&grade=M3&subject=EN",
]

# ── PDF에서 영어 문장 추출 (GPT-4o-mini 활용) ─────────────────────────────────
def extract_sentences_from_text(raw_text: str, source: str) -> list[dict]:
    """GPT-4o-mini로 영어 문장 추출 + 분석"""
    if not raw_text.strip():
        return []

    # 영어 문장만 필터링 (한글이 대부분이면 스킵)
    english_ratio = len(re.findall(r'[a-zA-Z]', raw_text)) / max(len(raw_text), 1)
    if english_ratio < 0.2:
        return []

    response = openai.chat.completions.create(
        model="gpt-4o-mini",
        max_tokens=2000,
        response_format={"type": "json_object"},
        messages=[
            {
                "role": "system",
                "content": """중학교 영어 문법 학습에 유용한 문장을 추출하는 전문가야.
JSON으로만 답해.
{
  "sentences": [
    {
      "sentence": "완전한 영어 문장 (단어 5개 이상)",
      "translation": "한국어 해석",
      "grammar_tags": ["해당문법카테고리"],
      "blocks": {
        "A": "자연스러운 한국어 해석",
        "B": "핵심 단어 3~4개: 단어-뜻",
        "C": "주어/동사/목적어 구조",
        "G": "빈칸 채우기 문제. 반드시 마지막에 (정답) 형식. 예: She ___ happy. (is)"
      }
    }
  ]
}"""
            },
            {
                "role": "user",
                "content": f"아래 텍스트에서 중학교 영어 문법 학습에 유용한 완전한 영어 문장을 최대 15개 추출해. 단편적인 단어/구는 제외.\n\n{raw_text[:3000]}"
            }
        ]
    )

    data = json.loads(response.choices[0].message.content)
    return data.get("sentences", [])


def get_embedding(text: str) -> list[float]:
    res = openai.embeddings.create(model="text-embedding-3-small", input=text)
    return res.data[0].embedding


def save_sentence(s: dict, source: str):
    """중복 확인 후 DB 저장"""
    existing = supabase.table("sentences").select("id").eq("sentence", s["sentence"].strip()).maybe_single().execute()
    if existing.data:
        return False

    embedding = get_embedding(s["sentence"])
    supabase.table("sentences").insert({
        "sentence":    s["sentence"].strip(),
        "translation": s.get("translation", ""),
        "grammar_tags": s.get("grammar_tags", []),
        "embedding":   embedding,
        "blocks":      s.get("blocks", {}),
        "trust_score": 0.80,
        "source":      f"ebs_{source}"
    }).execute()
    return True


def process_pdf_url(pdf_url: str, source_label: str) -> int:
    """PDF 다운로드 → 텍스트 추출 → DB 저장"""
    try:
        r = requests.get(pdf_url, headers=HEADERS, timeout=30)
        if not r.ok:
            return 0

        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as f:
            f.write(r.content)
            tmp_path = f.name

        doc   = fitz.open(tmp_path)
        saved = 0

        for page_num in range(min(len(doc), 20)):  # 최대 20페이지
            page = doc[page_num]
            text = page.get_text()

            if not text.strip():
                # 이미지 기반 PDF → GPT-4o Vision으로 OCR
                pix  = page.get_pixmap(dpi=150)
                img  = pix.tobytes("png")
                r2   = openai.chat.completions.create(
                    model="gpt-4o",
                    max_tokens=1000,
                    messages=[{
                        "role": "user",
                        "content": [
                            {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{__import__('base64').b64encode(img).decode()}"}},
                            {"type": "text", "text": "이 페이지의 영어 텍스트를 전부 추출해줘. 영어 문장만."}
                        ]
                    }]
                )
                text = r2.choices[0].message.content

            sentences = extract_sentences_from_text(text, source_label)
            for s in sentences:
                if save_sentence(s, source_label):
                    saved += 1
                time.sleep(0.1)

        doc.close()
        os.unlink(tmp_path)
        return saved

    except Exception as e:
        print(f"  PDF 처리 오류: {e}")
        return 0


def crawl_ebs_middle():
    """EBS 중학 영어 페이지 크롤링"""
    session = requests.Session()
    session.headers.update(HEADERS)
    found_pdfs = []

    print("📡 EBS 중학 영어 페이지 크롤링 중...")

    for url in EBS_MIDDLE_URLS:
        try:
            r = session.get(url, timeout=15)
            if not r.ok:
                print(f"  접근 실패: {url}")
                continue

            soup = BeautifulSoup(r.text, "html.parser")

            # PDF 링크 찾기
            for a in soup.find_all("a", href=True):
                href = a["href"]
                if ".pdf" in href.lower():
                    full_url = href if href.startswith("http") else f"https://www.ebs.co.kr{href}"
                    found_pdfs.append(full_url)

            # 강좌 목록에서 개별 페이지 링크 찾기
            for a in soup.find_all("a", href=True):
                href = a["href"]
                if "/middle/course" in href or "/middle/lecture" in href:
                    course_url = href if href.startswith("http") else f"https://www.ebs.co.kr{href}"
                    try:
                        r2   = session.get(course_url, timeout=15)
                        soup2 = BeautifulSoup(r2.text, "html.parser")
                        for a2 in soup2.find_all("a", href=True):
                            if ".pdf" in a2["href"].lower():
                                pdf_url = a2["href"] if a2["href"].startswith("http") else f"https://www.ebs.co.kr{a2['href']}"
                                found_pdfs.append(pdf_url)
                        time.sleep(1)
                    except:
                        pass

            time.sleep(1.5)

        except Exception as e:
            print(f"  크롤링 오류: {e}")

    return list(set(found_pdfs))


def main():
    print("🎓 EBS 중학 영어 스크래퍼 시작\n")

    pdf_urls = crawl_ebs_middle()
    print(f"  발견된 PDF: {len(pdf_urls)}개\n")

    if not pdf_urls:
        print("⚠️  PDF를 찾지 못했습니다.")
        print("   EBS 사이트 구조가 변경됐을 수 있습니다.")
        print("   아래 수동 방법을 사용하세요:\n")
        print("   python scripts/scrape_ebs.py --manual PDF경로")
        return

    total = 0
    for i, url in enumerate(pdf_urls, 1):
        print(f"[{i}/{len(pdf_urls)}] {url[:60]}...")
        saved = process_pdf_url(url, "middle_ebs")
        print(f"  → {saved}개 저장")
        total += saved
        time.sleep(2)

    print(f"\n✅ 총 {total}개 문장 저장 완료")


# ── 수동 모드: PDF 파일 직접 지정 ─────────────────────────────────────────────
# python scripts/scrape_ebs.py --manual "C:\Users\...\파일.pdf"
import sys
if __name__ == "__main__":
    if "--manual" in sys.argv:
        idx      = sys.argv.index("--manual")
        pdf_path = sys.argv[idx + 1]
        print(f"📄 수동 처리: {pdf_path}")
        doc   = fitz.open(pdf_path)
        total = 0

        for page_num in range(len(doc)):
            page = doc[page_num]
            text = page.get_text()

            if not text.strip():
                pix = page.get_pixmap(dpi=150)
                img = pix.tobytes("png")
                r   = openai.chat.completions.create(
                    model="gpt-4o",
                    max_tokens=1000,
                    messages=[{
                        "role": "user",
                        "content": [
                            {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{__import__('base64').b64encode(img).decode()}"}},
                            {"type": "text", "text": "이 페이지의 영어 텍스트를 전부 추출해줘."}
                        ]
                    }]
                )
                text = r.choices[0].message.content

            sentences = extract_sentences_from_text(text, "ebs_manual")
            for s in sentences:
                if save_sentence(s, "ebs_manual"):
                    total += 1
                    print(f"  ✅ {s['sentence'][:50]}...")
            time.sleep(0.5)

        print(f"\n✅ 총 {total}개 저장")
    else:
        main()
