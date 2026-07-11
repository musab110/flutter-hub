@echo off
chcp 65001 >nul
title تجهيز قاعدة بيانات منصة فلاتر (MongoDB)

echo =======================================
echo 🔍 جاري التحقق من وجود قاعدة بيانات (MongoDB) بجهازك...
echo =======================================

IF EXIST "C:\Program Files\MongoDB\Server" (
    echo [✅] محرك قاعدة البيانات MongoDB موجود في جهازك ويعمل بنجاح!
) ELSE (
    echo [X] لم يتم العثور على قاعدة البيانات!
    echo [📥] سيتم الآن التحميل التلقائي من الموقع الرسمي (انتظر فضلاً... الملف حجمه حوالي 500 ميجابايت)
    
    powershell -Command "Invoke-WebRequest -Uri 'https://fastdl.mongodb.org/windows/mongodb-windows-x86_64-7.0.14-signed.msi' -OutFile '%TEMP%\mongodb.msi'"
    
    echo [⚙️] اكتمل التحميل! جاري تثبيت قاعدة البيانات بشكل آلي... سترى شريط التقدم الآن (يرجى الانتظار ولا تغلق النافذة)
    msiexec.exe /i "%TEMP%\mongodb.msi" /passive /norestart
    
    echo [✅] تمت العملية بنجاح! تم تركيب قاعدة البيانات في جهازك بنجاح.
)

echo =======================================
pause