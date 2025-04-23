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
const SalesTeam_1 = __importDefault(require("./SalesTeam"));
class DealerVisit extends sequelize_1.Model {
    // Helper method to mark as synced
    markAsSynced() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.update({
                syncedAt: new Date(),
                isOfflineEntry: false,
            });
        });
    }
    // Helper method to get unsynced visits for a sales team
    static getUnsyncedVisits(salesTeamId) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.findAll({
                where: {
                    salesTeamId,
                    isOfflineEntry: true,
                    syncedAt: null
                } // Type assertion to avoid TypeScript error with Op.is
            });
        });
    }
    // Helper method to get total sheets
    getTotalSheets() {
        return Object.values(this.sales).reduce((sum, count) => sum + count, 0);
    }
    // Helper method to validate same-day edit
    canEdit() {
        const today = new Date();
        const visitDate = new Date(this.visitDate);
        return today.toDateString() === visitDate.toDateString();
    }
}
DealerVisit.init({
    id: {
        type: sequelize_1.DataTypes.UUID,
        defaultValue: sequelize_1.DataTypes.UUIDV4,
        primaryKey: true,
    },
    salesTeamId: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
        references: {
            model: SalesTeam_1.default,
            key: 'id',
        },
    },
    dealerNames: {
        type: sequelize_1.DataTypes.ARRAY(sequelize_1.DataTypes.STRING),
        allowNull: false,
        defaultValue: [],
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
    visitDate: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
    },
    photoUrl: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
    },
    notes: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true,
    },
    sales: {
        type: sequelize_1.DataTypes.JSON,
        allowNull: false,
        defaultValue: {
            liner: 0,
            artvio08: 0,
            woodrica08: 0,
            artis1: 0
        },
        validate: {
            isValidSales(value) {
                if (!value)
                    throw new Error('Sales data is required');
                const validKeys = ['liner', 'artvio08', 'woodrica08', 'artis1'];
                for (const key of validKeys) {
                    if (typeof value[key] !== 'number' || value[key] < 0) {
                        throw new Error(`Invalid sales value for ${key}`);
                    }
                }
            }
        }
    },
    isOfflineEntry: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    },
    offlineId: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
    },
    syncedAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true,
    },
}, {
    sequelize: sequelize_2.default,
    modelName: 'DealerVisit',
    timestamps: true,
    indexes: [
        {
            fields: ['salesTeamId', 'visitDate'],
        },
        {
            fields: ['isOfflineEntry', 'syncedAt'],
        },
        {
            fields: ['offlineId'],
            unique: true,
            where: {
                offlineId: {
                    [sequelize_1.Op.not]: null,
                },
            },
        },
    ],
});
// Define association
DealerVisit.belongsTo(SalesTeam_1.default, { foreignKey: 'salesTeamId' });
SalesTeam_1.default.hasMany(DealerVisit, { foreignKey: 'salesTeamId' });
exports.default = DealerVisit;
