@echo off
chcp 65001 >nul
echo.
echo ====================================
echo  EBS 중학 영어 스크래퍼
echo ====================================
echo.

cd /d C:\ClaudeCode\scoreboost\backend

echo [1/2] 패키지 설치 중...
pip install requests beautifulsoup4 pymupdf openai supabase python-dotenv -q
echo 설치 완료
echo.

echo [2/2] EBS 크롤링 시작...
python scripts/scrape_ebs.py

echo.
echo 완료! 아무 키나 누르면 닫힙니다.
pause >nul
