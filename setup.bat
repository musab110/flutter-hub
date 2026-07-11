@echo off
chcp 65001 >nul
echo 🔍 جاري التحقق من بيئة العمل (Node.js)...
echo ------------------------------------------

node -v >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo[X] لم يتم العثور على Node.js في جهازك.
    echo ⏳ جاري تحميل وتثبيت Node.js تلقائياً...
    echo يرجى الموافقة إذا ظهرت لك نافذة تطلب صلاحيات المسؤول (Administrator)
    
    winget install -e --id OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements
    
    echo ✅ تم التثبيت بنجاح! يرجى إغلاق هذه النافذة وإعادة تشغيلها ليتم تحديث مسارات النظام.
) ELSE (
    echo [✅] بيئة Node.js موجودة وجاهزة للعمل!
)

echo ------------------------------------------
pause