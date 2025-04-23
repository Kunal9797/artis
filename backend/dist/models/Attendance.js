"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AttendanceStatus = void 0;
const sequelize_1 = require("sequelize");
const sequelize_2 = __importDefault(require("../config/sequelize"));
const SalesTeam_1 = __importDefault(require("./SalesTeam"));
var AttendanceStatus;
(function (AttendanceStatus) {
    AttendanceStatus["PRESENT"] = "PRESENT";
    AttendanceStatus["ABSENT"] = "ABSENT";
})(AttendanceStatus || (exports.AttendanceStatus = AttendanceStatus = {}));
class Attendance extends sequelize_1.Model {
}
Attendance.init({
    id: {
        type: sequelize_1.DataTypes.UUID,
        defaultValue: sequelize_1.DataTypes.UUIDV4,
        primaryKey: true,
    },
    salesTeamId: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'SalesTeams',
            key: 'id',
        },
    },
    date: {
        type: sequelize_1.DataTypes.DATEONLY,
        allowNull: false,
    },
    location: {
        type: sequelize_1.DataTypes.JSON,
        allowNull: false,
        validate: {
            isValidLocation(value) {
                if (!value.latitude || !value.longitude) {
                    throw new Error('Location must include latitude and longitude');
                }
                if (value.latitude < -90 || value.latitude > 90) {
                    throw new Error('Invalid latitude');
                }
                if (value.longitude < -180 || value.longitude > 180) {
                    throw new Error('Invalid longitude');
                }
            },
        },
    },
    status: {
        type: sequelize_1.DataTypes.ENUM(...Object.values(AttendanceStatus)),
        allowNull: false,
        defaultValue: AttendanceStatus.PRESENT,
    },
}, {
    sequelize: sequelize_2.default,
    modelName: 'Attendance',
    timestamps: true,
    indexes: [
        {
            unique: true,
            fields: ['salesTeamId', 'date'],
        },
    ],
});
// Define association
Attendance.belongsTo(SalesTeam_1.default, { foreignKey: 'salesTeamId' });
SalesTeam_1.default.hasMany(Attendance, { foreignKey: 'salesTeamId' });
exports.default = Attendance;
