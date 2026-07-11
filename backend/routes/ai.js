const express = require('express');
const router = express.Router();
const { OpenAI } = require("openai"); 
// 💡 استيراد الموديلات الجديدة بدلاً من Chat القديم
const { Conversation, Message } = require('../db'); 
const authMiddleware = require('../middleware/authMiddleware');

// إعداد عميل OpenAI ليعمل كـ "وسيط/راوتر" لخوادم HuggingFace
const client = new OpenAI({
    baseURL: "https://router.huggingface.co/v1",
    apiKey: process.env.HF_TOKEN, 
});

const SYSTEM_PROMPT = `
ROLE: You are "Flutter Master", a specialized AI dedicated ONLY to teaching Flutter and Dart development.

IDENTITY RULE (HIGHEST PRIORITY):
If the user asks about who you are, who created you, who programmed you, or your model (e.g. "من انت؟", "من برمجك؟", "من صممك؟"), you MUST reply EXACTLY with this Arabic sentence and add nothing else:
"أنا نموذج يساعدك في تعلم برمجة الموبايل باستخدام لغة flutter، تم تصميمي بواسطة المهندس مصعب الجعشني."

STRICT CONSTRAINTS:
1. You MUST refuse to answer any questions NOT related to:
   - Flutter Framework & Widgets.
   - Dart Programming Language.
   - Mobile UI/UX Design (Specifically for apps).
   - Mobile Backend Integration (Firebase, APIs, SQLite).
   - Deployment to App Store / Google Play.

OFF-TOPIC BEHAVIOR:
If the user asks about religion, politics, history, general science, or anything else NOT related to the topics above, you MUST respond exactly with:
"عذراً، أنا مخصص حصرياً لمساعدتك في احتراف برمجة تطبيقات الجوال باستخدام Flutter. لا يمكنني الإجابة على أسئلة خارج هذا التخصص."

RESPONSE RULES:
- Language: Professional Arabic.
- Code blocks: Always use strict Markdown \`\`\`dart.
- Tone: Technical, direct, and expert-level.
`;

const AI_MODELS = {
    'qwen': 'Qwen/Qwen2.5-Coder-32B-Instruct',
    'deepseek': 'deepseek-ai/DeepSeek-R1:fastest' // 💡 تم تحويله إلى التوجيه التلقائي والأسرع لتفادي الضغط
};

// مسار إرسال الرسائل واستقبال الردود
router.post('/chat', authMiddleware, async (req, res) => {
    const { message, chatId = "default", modelType = 'qwen' } = req.body;
    const userId = req.user.id;
    const selectedModel = AI_MODELS[modelType] || AI_MODELS['qwen'];

    try {
        // 1. التحقق من وجود المحادثة (Conversation) أو إنشاؤها إن لم تكن موجودة
        let conversation;
        if (chatId && chatId !== 'default') {
            conversation = await Conversation.findOne({ where: { id: chatId, userId } });
        }

        if (!conversation) {
            conversation = await Conversation.create({
                // إذا كان chatId مرسل بقيمة UUID صالحة نستخدمها، وإلا نترك Sequelize يولدها تلقائياً
                id: (chatId && chatId !== 'default') ? chatId : undefined,
                userId,
                title: message.substring(0, 30) + "...",
                selectedModel: modelType
            });
        }

        // 2. تحديث الموديل المختار داخل المحادثة إذا تغير
        if (conversation.selectedModel !== modelType) {
            conversation.selectedModel = modelType;
            await conversation.save();
        }

        // 3. حفظ رسالة المستخدم في جدول الرسائل (Messages)
        await Message.create({
            conversationId: conversation.id,
            role: 'user',
            content: message
        });

        // 4. جلب تاريخ المحادثة التابع لهذه الجلسة فقط لبناء السياق (آخر 6 رسائل لسرعة المعالجة)
        const lastMessages = await Message.findAll({
            where: { conversationId: conversation.id },
            order: [['createdAt', 'DESC']],
            limit: 6 
        });

        // ترتيب الرسائل من الأقدم للأحدث لتغذية الموديل بشكل صحيح
        const history = lastMessages.reverse().map(msg => ({ 
            role: msg.role, 
            content: msg.content 
        }));
        
        const messagesPayload = [{ role: 'system', content: SYSTEM_PROMPT }, ...history];

        console.log(`🚀 يتم التفكير... عبر مسار [${selectedModel}] للمحادثة [${conversation.id}]`);

        const response = await client.chat.completions.create({
            model: selectedModel,
            messages: messagesPayload,
            max_tokens: 2000, 
        });

        let botReply = response.choices[0].message.content || '';
        let thinkingContent = null;

        // 5. فلترة واستخلاص مرحلة التفكير عند استخدام DeepSeek لعرضها بشكل مستقل
        if (modelType === 'deepseek' && botReply.includes('<think>')) {
            const thinkStart = botReply.indexOf('<think>');
            const thinkEnd = botReply.indexOf('</think>');
            
            if (thinkStart !== -1 && thinkEnd !== -1) {
                thinkingContent = botReply.substring(thinkStart + 7, thinkEnd).trim();
                botReply = botReply.substring(thinkEnd + 8).trim();
            } else if (botReply.includes('</think>')) {
                const parts = botReply.split('</think>');
                thinkingContent = parts[0].replace('<think>', '').trim();
                botReply = parts[1].trim();
            }
        }

        // 6. حفظ رد البوت في قاعدة البيانات بجدول الرسائل مع تخزين التفكير المستخلص
        await Message.create({
            conversationId: conversation.id,
            role: 'assistant',
            content: botReply,
            thinkingContent: thinkingContent
        });

        // إرسال الرد وتمرير الـ chatId الفعلي للواجهة الأمامية
        res.json({ 
            reply: botReply,
            thinking: thinkingContent,
            chatId: conversation.id 
        });

    } catch (error) {
        console.error("🚨 Router Connection Error:", error.message);
        res.status(500).json({ reply: "⚠️ حدث تذبذب في خوادم المعالجة.. يرجى التجربة عبر نموذج QWEN كبديل." });
    }
});

// === أكواد السجل (تم ترقيتها برمجياً لتتوافق مع الجداول الجديدة) ===

router.get('/history-titles', authMiddleware, async (req, res) => {
    try {
        // جلب قائمة الجلسات مباشرة بفضل جدول Conversations المخصص
        const conversations = await Conversation.findAll({
            where: { userId: req.user.id },
            attributes: ['id', 'title', 'createdAt'],
            order: [['createdAt', 'DESC']]
        });

        // تحويل المخرجات للأسماء التي تتوقعها الواجهة تفادياً لأي أخطاء
        const formattedHistory = conversations.map(c => ({
            chatId: c.id,
            title: c.title,
            createdAt: c.createdAt
        }));

        res.json(formattedHistory);
    } catch (e) { 
        console.error("Error fetching history titles:", e);
        res.status(500).send('Error'); 
    }
});

router.get('/history/:chatId', authMiddleware, async (req, res) => {
    try {
        // جلب الرسائل التابعة للـ conversationId
        const messages = await Message.findAll({
            where: { conversationId: req.params.chatId },
            order: [['createdAt', 'ASC']]
        });
        res.json(messages);
    } catch (e) { 
        console.error("Error fetching chat history:", e);
        res.status(500).send('Error'); 
    }
});

// --- مسار تدمير وحذف الجلسات للأبد ---
router.delete('/history/:chatId', authMiddleware, async (req, res) => {
    try {
        const { chatId } = req.params;
        const userId = req.user.id;

        // حذف الـ Conversation الأساسي، وخيار CASCADE في db.js سيتكفل بمحو كافة الرسائل المرتبطة تلقائياً
        const deletedRows = await Conversation.destroy({
            where: { id: chatId, userId }
        });

        if (deletedRows > 0) {
            res.json({ success: true, message: 'تم إبادة الكود وتاريخ المحادثة بنجاح' });
        } else {
            res.status(404).json({ error: 'الجلسة غير موجودة' });
        }
    } catch (e) {
        console.error("Error deleting conversation:", e);
        res.status(500).json({ error: 'عطل في عملية الحذف' });
    }
});

module.exports = router;