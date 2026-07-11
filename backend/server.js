require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { sequelize } = require('./db'); // استيراد الاتصال من الملف الجديد

const app = express();
app.use(cors());
app.use(express.json());

// ربط ملفات المسارات (Routes)
app.use('/api/auth', require('./routes/auth'));
app.use('/api/ai', require('./routes/ai')); 

app.get('/', (req, res) => {
    res.send('🚀 السيرفر يعمل ونظام المصادقة (Auth) جاهز!');
});

const PORT = process.env.PORT || 5000;

// 💡 تم دمج وتوحيد عملية تشغيل قاعدة البيانات والسيرفر معاً لضمان عدم حدوث تكرار أو تعارض
sequelize.authenticate()
    .then(() => {
        console.log('✅ تم الاتصال بقاعدة البيانات!');
        // إنشاء ومزامنة الجداول بأمان دون حذف البيانات القائمة
        return sequelize.sync({ force: false }); 
    })
    .then(() => {
        console.log('📂 جداول قاعدة البيانات جاهزة ومستقرة للعمل.');
        // تشغيل السيرفر فقط بعد التأكد من سلامة قاعدة البيانات
        app.listen(PORT, () => {
            console.log(`=================================`);
            console.log(`🚀 السيرفر شغال: http://localhost:${PORT}`);
            console.log(`=================================`);
        });
    })
    .catch(err => {
        console.error('❌ خطأ فادح في قاعدة البيانات، لم يتم تشغيل السيرفر:', err);
    });