@echo off
rem Double-click: opens After Effects and runs Shno_Tstafad_Animator.jsx
rem (keep this file next to the .jsx). Paths are relative, so the Arabic
rem project folder does not need to be typed here.
setlocal
set "SCRIPT=%~dp0Shno_Tstafad_Animator.jsx"
if not exist "%SCRIPT%" (
    echo Shno_Tstafad_Animator.jsx was not found next to this file.
    pause
    exit /b 1
)

set "AE="
rem Any installed version first, then prefer the newest "Adobe After Effects 20xx"
for /d %%D in ("%ProgramFiles%\Adobe\Adobe After Effects*") do (
    if exist "%%D\Support Files\AfterFX.exe" set "AE=%%D\Support Files\AfterFX.exe"
)
for /d %%D in ("%ProgramFiles%\Adobe\Adobe After Effects 20*") do (
    if exist "%%D\Support Files\AfterFX.exe" set "AE=%%D\Support Files\AfterFX.exe"
)
if not defined AE (
    echo After Effects was not found in "%ProgramFiles%\Adobe".
    echo Open After Effects and use File ^> Scripts ^> Run Script File instead.
    pause
    exit /b 1
)

echo After Effects: "%AE%"
echo Script:        "%SCRIPT%"
start "" "%AE%" -r "%SCRIPT%"
