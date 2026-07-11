const jwt = require('jsonwebtoken');
const { User } = require('../db');

module.exports = async (req, res, next) => {
    // جلب الهيدر (Express يتعامل مع الحروف الكبيرة والصغيرة تلقائياً هنا)
    const authHeader = req.header('Authorization');
    
    if (!authHeader) {
        return res.status(401).json({ error: 'دخول غير مسموح، يرجى تسجيل الدخول أولاً' });
    }

    try {
        // استخراج التوكن بشكل مرن سواء كان يبدأ بـ Bearer أو تم إرساله مباشراً
        const token = authHeader.startsWith('Bearer ') 
            ? authHeader.slice(7).trim() 
            : authHeader.trim();

        // التحقق من صحة التوكن وفكه
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // التحقق من وجود المستخدم الفعلي وصلاحية حسابه في قاعدة البيانات
        const user = await User.findByPk(decoded.id);
        
        if (!user) {
            return res.status(401).json({ error: 'انتهت صلاحية الجلسة، يرجى إعادة تسجيل الدخول' });
        }

        // إرفاق بيانات المستخدم المحققة من قاعدة البيانات بطلب الـ Request
        req.user = {
            id: user.id,
            username: user.username,
            email: user.email
        };

        next();
    } catch (err) {
        console.error("❌ خطأ في التحقق من التوكن:", err.message);
        res.status(401).json({ error: 'الرمز البرمجي (Token) غير صالح أو منتهي الصلاحية' });
    }
};