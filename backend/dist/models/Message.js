"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const sequelize_2 = __importDefault(require("../config/sequelize"));
const User_1 = __importDefault(require("./User"));
const SalesTeam_1 = __importDefault(require("./SalesTeam"));
class Message extends sequelize_1.Model {
    // Helper method to mark message as read
    markAsRead() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.update({ isRead: true });
        });
    }
}
Message.init({
    id: {
        type: sequelize_1.DataTypes.UUID,
        defaultValue: sequelize_1.DataTypes.UUIDV4,
        primaryKey: true,
    },
    senderId: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
        references: {
            model: User_1.default,
            key: 'id',
        },
    },
    receiverId: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'SalesTeams',
            key: 'id',
        },
    },
    message: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: false,
    },
    isRead: {
        type: sequelize_1.DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false,
    },
}, {
    sequelize: sequelize_2.default,
    modelName: 'Message',
    timestamps: true,
    indexes: [
        {
            fields: ['senderId'],
        },
        {
            fields: ['receiverId'],
        },
    ],
});
// Define associations
Message.belongsTo(User_1.default, { as: 'sender', foreignKey: 'senderId' });
Message.belongsTo(SalesTeam_1.default, { as: 'receiver', foreignKey: 'receiverId' });
User_1.default.hasMany(Message, { as: 'sentMessages', foreignKey: 'senderId' });
SalesTeam_1.default.hasMany(Message, { as: 'receivedMessages', foreignKey: 'receiverId' });
exports.default = Message;
