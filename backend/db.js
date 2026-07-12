const { Sequelize, DataTypes } = require('sequelize');
const path = require('path'); // 💡 استيراد مكتبة إدارة المسارات المدمجة

// 💡 تعديل مسار الحفظ ليكون مطلقاً وموجهاً لمجلد backend دائماً من خلال __dirname
const sequelize = new Sequelize({ 
    dialect: 'sqlite', 
    storage: path.join(__dirname, 'database.sqlite'), 
    logging: false 
});

// 1. جدول المستخدمين
const User = sequelize.define('User', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    username: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    // تم جعله allowNull: true ليدعم مصادقة جوجل
    passwordHash: { type: DataTypes.STRING, allowNull: true },
    googleId: { type: DataTypes.STRING, allowNull: true, unique: true }
});

// 2. جدول المحادثات
const Conversation = sequelize.define('Conversation', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    title: { type: DataTypes.STRING, defaultValue: 'New Chat' },
    selectedModel: { type: DataTypes.STRING, defaultValue: 'qwen' }
}, {
    indexes: [{ fields: ['userId'] }]
});

// 3. جدول الرسائل
const Message = sequelize.define('Message', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    role: { type: DataTypes.ENUM('user', 'assistant', 'system'), allowNull: false },
    content: { type: DataTypes.TEXT, allowNull: false },
    thinkingContent: { type: DataTypes.TEXT, allowNull: true }
}, {
    indexes: [{ fields: ['conversationId'] }]
});

// العلاقات والحذف التلقائي
User.hasMany(Conversation, { foreignKey: 'userId', onDelete: 'CASCADE' });
Conversation.belongsTo(User, { foreignKey: 'userId' });

Conversation.hasMany(Message, { foreignKey: 'conversationId', onDelete: 'CASCADE' });
Message.belongsTo(Conversation, { foreignKey: 'conversationId' });

module.exports = { sequelize, User, Conversation, Message };