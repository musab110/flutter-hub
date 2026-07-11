const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { User } = require('../db'); 

// تسجيل حساب جديد
router.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        console.log(`📝 محاولة تسجيل حساب جديد: ${email}`);

        // تشفير كلمة المرور
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // 💡 تم تعديل الحقل هنا إلى passwordHash ليتوافق مع نموذج User في db.js
        const newUser = await User.create({ 
            username, 
            email, 
            passwordHash: hashedPassword 
        });

        console.log("✅ تم إنشاء المستخدم بنجاح في قاعدة البيانات");
        res.json({ 
            message: '✅ تم إنشاء الحساب بنجاح!', 
            userId: newUser.id 
        });
    } catch (error) {
        console.error("❌ خطأ أثناء التسجيل:", error);
        res.status(400).json({ error: 'خطأ: قد يكون البريد مسجلاً مسبقاً أو هناك مشكلة في البيانات' });
    }
});

// تسجيل الدخول
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log(`🔑 محاولة دخول للإيميل: ${email}`);

        const user = await User.findOne({ where: { email } });
        if (!user) {
            console.log("⚠️ المستخدم غير موجود");
            return res.status(400).json({ error: 'بيانات الدخول غير صحيحة' });
        }

        // 💡 تم التعديل هنا لقراءة الحقل الصحيح passwordHash من قاعدة البيانات
        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) {
            console.log("⚠️ كلمة المرور خاطئة");
            return res.status(400).json({ error: 'بيانات الدخول غير صحيحة' });
        }

        // التأكد من وجود المفتاح السري
        if (!process.env.JWT_SECRET) {
            throw new Error("ملف .env لا يحتوي على JWT_SECRET!");
        }

        // توحيد سياق معرف المستخدم لتسهيل عمل الـ middleware لاحقاً
        const token = jwt.sign(
            { id: user.id, userId: user.id, username: user.username }, 
            process.env.JWT_SECRET,
            { expiresIn: '7d' } // إضافة وقت انتهاء اختياري لزيادة الأمان
        );
        
        console.log("✅ تم تسجيل الدخول بنجاح");
        res.json({ 
            token, 
            user: {
                id: user.id,
                username: user.username,
                email: user.email
            }
        });
    } catch (error) {
        console.error("❌ خطأ قاتل أثناء تسجيل الدخول:", error);
        res.status(500).json({ error: 'حدث خطأ داخلي في السيرفر (راجع التيرمنال)' });
    }
});

module.exports = router;