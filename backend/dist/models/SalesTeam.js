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
class SalesTeam extends sequelize_1.Model {
    getSubordinates() {
        return __awaiter(this, void 0, void 0, function* () {
            return SalesTeam.findAll({
                where: {
                    reportingTo: this.id
                }
            });
        });
    }
    getManager() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.reportingTo)
                return null;
            return SalesTeam.findByPk(this.reportingTo);
        });
    }
}
SalesTeam.init({
    id: {
        type: sequelize_1.DataTypes.UUID,
        defaultValue: sequelize_1.DataTypes.UUIDV4,
        primaryKey: true,
    },
    userId: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
        references: {
            model: User_1.default,
            key: 'id',
        },
    },
    role: {
        type: sequelize_1.DataTypes.ENUM('SALES_EXECUTIVE', 'ZONAL_HEAD', 'COUNTRY_HEAD'),
        allowNull: false,
    },
    territory: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
    },
    reportingTo: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'SalesTeams',
            key: 'id',
        },
    },
    targetQuarter: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: true,
        validate: {
            min: 1,
            max: 4,
        },
    },
    targetYear: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: true,
    },
    targetAmount: {
        type: sequelize_1.DataTypes.DECIMAL(10, 2),
        allowNull: true,
        validate: {
            min: 0,
        },
    },
}, {
    sequelize: sequelize_2.default,
    modelName: 'SalesTeam',
    timestamps: true,
    hooks: {
        beforeCreate: (team) => __awaiter(void 0, void 0, void 0, function* () {
            // Validate reporting structure based on roles
            if (team.reportingTo) {
                const manager = yield SalesTeam.findByPk(team.reportingTo);
                if (!manager) {
                    throw new Error('Invalid reporting manager');
                }
                const validReporting = {
                    SALES_EXECUTIVE: ['ZONAL_HEAD'],
                    ZONAL_HEAD: ['COUNTRY_HEAD'],
                    COUNTRY_HEAD: [],
                };
                if (!validReporting[team.role].includes(manager.role)) {
                    throw new Error('Invalid reporting structure');
                }
            }
        }),
    },
});
// Define associations
SalesTeam.belongsTo(User_1.default, { foreignKey: 'userId' });
User_1.default.hasOne(SalesTeam, { foreignKey: 'userId' });
// Self-referential association for reporting hierarchy
SalesTeam.belongsTo(SalesTeam, { as: 'manager', foreignKey: 'reportingTo' });
SalesTeam.hasMany(SalesTeam, { as: 'subordinates', foreignKey: 'reportingTo' });
exports.default = SalesTeam;
