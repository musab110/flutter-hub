module.exports = (sequelize, DataTypes) => {
    const Chat = sequelize.define("Chat", {
        userId: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        // 🆔 المعرف الفريد لكل جلسة (مثال: محادثة رقم 102)
        chatId: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: "new-session"
        },
        // 📝 عنوان المحادثة الذي سيظهر في السايد بار
        title: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: "محادثة جديدة"
        },
        role: {
            type: DataTypes.STRING, // user أو assistant
            allowNull: false
        },
        content: {
            type: DataTypes.TEXT,
            allowNull: false
        }
    });
    return Chat;
};