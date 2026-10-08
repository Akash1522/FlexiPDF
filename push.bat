@echo off
echo Cleaning up nested folders...
IF EXIST "FlexiPDF" rmdir /S /Q FlexiPDF

echo Initializing Git repository...
git init

echo Adding files...
git add .

echo Committing...
git commit -m "Initial commit: Client-side PDF Converter"

echo Setting main branch...
git branch -M main

echo Configuring remote...
git remote remove origin 2>nul
git remote add origin https://github.com/Akash1522/FlexiPDF.git

echo Pushing to GitHub...
git push -u origin main

echo.
echo Done! Press any key to close this window.
pause
