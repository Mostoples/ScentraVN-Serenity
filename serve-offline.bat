@echo off
REM ============================================================================
REM  ScentraVN Serenity - Launcher PWA Offline (Windows)
REM  Dobel-klik untuk menyajikan PWA di http://localhost:8000 dan membuka browser.
REM  Tanpa internet. Memilih otomatis: Python (bawaan) -> Node -> PHP.
REM  Pakai port lain:  serve-offline.bat 9000
REM ============================================================================
setlocal
cd /d "%~dp0"

set "PORT=8000"
if not "%~1"=="" set "PORT=%~1"
set "URL=http://localhost:%PORT%/"

set "RUN="
where python >nul 2>nul && set "RUN=python -m http.server %PORT% --bind 127.0.0.1"
if not defined RUN ( where py     >nul 2>nul && set "RUN=py -m http.server %PORT% --bind 127.0.0.1" )
if not defined RUN ( where node   >nul 2>nul && set "RUN=node serve-offline.js %PORT%" )
if not defined RUN ( where php    >nul 2>nul && set "RUN=php -S 127.0.0.1:%PORT%" )

if not defined RUN (
  echo.
  echo [ScentraVN] Tidak menemukan Python, Node, atau PHP di laptop ini.
  echo            Pasang salah satu ^(disarankan Python dari https://python.org^),
  echo            saat instalasi centang "Add Python to PATH", lalu jalankan lagi.
  echo.
  pause
  exit /b 1
)

echo.
echo [ScentraVN] Menyajikan PWA di %URL%
echo [ScentraVN] Biarkan jendela ini TERBUKA selama dipakai. Tutup jendela untuk berhenti.
echo.

REM Buka browser (server menyusul siap dalam sekejap; refresh bila perlu)
start "" "%URL%"

%RUN%
