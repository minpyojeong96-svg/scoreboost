@echo off
chcp 65001 >nul
echo.
echo ====================================
echo  EBS 수동 PDF 처리
echo ====================================
echo.

cd /d C:\ClaudeCode\scoreboost\backend

echo [1/2] 패키지 설치 중...
pip install requests beautifulsoup4 pymupdf openai supabase python-dotenv -q
echo 설치 완료
echo.

echo [2/2] 수능 문제지 + 수동 PDF 처리 시작...
python scripts/scrape_ebs.py --manual "C:\Users\정민표\Downloads\영어영역_문제지.pdf"

echo.
echo 완료! 아무 키나 누르면 닫힙니다.
pause >nul
