@echo off
rem Rebuilds the Novi hype video end to end (needs Ollama running and the Novi project at C:\va).
rem Step 1 takes over the screen for ~2 minutes (dark stage, silent); step 2 renders for ~10 minutes.
cd /d "%~dp0"
python capture_scenes.py || exit /b 1
python compose_hype.py || exit /b 1
echo Done: ..\media\demo-loop.mp4, demo-loop.webm, poster.jpg
