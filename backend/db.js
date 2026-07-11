const { Sequelize, DataTypes } = require('sequelize');
const sequelize = new Sequelize({ dialect: 'sqlite', storage: './database.sqlite', logging: false });

// 1. جدول المستخدمين
const User = sequelize.define('User', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    username: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    passwordHash: { type: DataTypes.STRING, allowNull: false }
});

// 2. جدول المحادثات
const Conversation = sequelize.define('Conversation', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    title: { type: DataTypes.STRING, defaultValue: 'New Chat' },
    selectedModel: { type: DataTypes.STRING, defaultValue: 'qwen' }
}, {
    // 💡 تطبيق الفهارس (Indexes) لسرعة جلب القائمة الجانبية
    indexes: [{ fields: ['userId'] }]
});

// 3. جدول الرسائل
const Message = sequelize.define('Message', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    role: { type: DataTypes.ENUM('user', 'assistant', 'system'), allowNull: false },
    content: { type: DataTypes.TEXT, allowNull: false },
    thinkingContent: { type: DataTypes.TEXT, allowNull: true } // لحفظ أفكار نماذج DeepSeek
}, {
    // 💡 تطبيق الفهارس لسرعة جلب تاريخ الدردشة وتجميعها
    indexes: [{ fields: ['conversationId'] }]
});

// ===============================================
// 🛠️ التهيئة الهندسية للعلاقات والحذف الآمن (Cascade)
// ===============================================

User.hasMany(Conversation, { foreignKey: 'userId', onDelete: 'CASCADE' });
Conversation.belongsTo(User, { foreignKey: 'userId' });

Conversation.hasMany(Message, { foreignKey: 'conversationId', onDelete: 'CASCADE' });
Message.belongsTo(Conversation, { foreignKey: 'conversationId' });

module.exports = { sequelize, User, Conversation, Message };