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
// مسار تسجيل الدخول والمصادقة عبر جوجل (OAuth 2.0 Verification)
router.post('/google', async (req, res) => {
    try {
        const { credential } = req.body;
        if (!credential) {
            return res.status(400).json({ error: 'لم يتم استلام رمز التحقق من جوجل' });
        }

        // 💡 التحقق من صحة التوكن بالاتصال المباشر بمخدم جوجل دون حزم إضافية (Node.js native fetch)
        const googleResponse = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);
        if (!googleResponse.ok) {
            return res.status(400).json({ error: 'رمز التوكن غير صالح أو منتهي الصلاحية' });
        }

        const payload = await googleResponse.json();
        
        // 🔒 حماية أمنية حرجة: مطابقة الـ Client ID الخاص بك لمنع هجمات التزييف التوافقي
        const CLIENT_ID = "1068580495439-4f8pf38fsbbthpmqeosoi70jg4grurol.apps.googleusercontent.com";
        if (payload.aud !== CLIENT_ID) {
            return res.status(400).json({ error: 'تحذير أمني: معرّف التطبيق غير متطابق' });
        }

        const { sub: googleId, email, name } = payload;

        // 1. البحث عن المستخدم عبر معرّف جوجل الفريد (googleId)
        let user = await User.findOne({ where: { googleId } });

        if (!user) {
            // 2. إذا لم يكن مسجلاً بجوجل، نبحث ببريده الإلكتروني لمزامنة الحسابين معاً تلقائياً
            user = await User.findOne({ where: { email } });
            if (user) {
                user.googleId = googleId; // ربط حساب قاعدة البيانات الحالي بجوجل
                await user.save();
            } else {
                // 3. إذا كان مستخدماً جديداً كلياً، نقوم بإنشائه بأمان (مع إبقاء حقل الباسوورد فارغاً)
                user = await User.create({
                    username: name || email.split('@')[0],
                    email,
                    passwordHash: null, // لا يملك باسوورد محلي
                    googleId
                });
            }
        }

        // توليد رمز المصادقة الـ JWT المحلي لمشروعك Flutter Hub
        const token = jwt.sign(
            { id: user.id, userId: user.id, username: user.username }, 
            process.env.JWT_SECRET || 'fallback_secret',
            { expiresIn: '7d' }
        );

        console.log(`👤 تم الدخول بنجاح عبر حساب جوجل للمستخدم: ${user.username}`);
        res.status(200).json({
            message: 'تم تسجيل الدخول عبر جوجل بنجاح',
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email
            }
        });

    } catch (error) {
        console.error("❌ خطأ فني أثناء معالجة دخول جوجل:", error);
        res.status(500).json({ error: 'حدث خطأ فني أثناء معالجة حساب جوجل، يرجى المحاولة لاحقاً' });
    }
});

module.exports = router;