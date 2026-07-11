// هذا الملف يحدد شكل بيانات المستخدم في قاعدة SQLite
module.exports = (sequelize, DataTypes) => {
    const User = sequelize.define("User", {
        username: {
            type: DataTypes.STRING,
            allowNull: false
        },
        email: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true // ممنوع تكرار الإيميل
        },
        password: {
            type: DataTypes.STRING,
            allowNull: false
        }
    });
    return User;
};