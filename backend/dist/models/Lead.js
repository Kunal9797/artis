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
exports.LeadStatus = void 0;
const sequelize_1 = require("sequelize");
const sequelize_2 = __importDefault(require("../config/sequelize"));
const User_1 = __importDefault(require("./User"));
var LeadStatus;
(function (LeadStatus) {
    LeadStatus["NEW"] = "NEW";
    LeadStatus["FOLLOWUP"] = "FOLLOWUP";
    LeadStatus["NEGOTIATION"] = "NEGOTIATION";
    LeadStatus["CLOSED"] = "CLOSED";
})(LeadStatus || (exports.LeadStatus = LeadStatus = {}));
class Lead extends sequelize_1.Model {
    // Helper method to reassign lead
    reassign(newAssigneeId, assignedBy) {
        return __awaiter(this, void 0, void 0, function* () {
            const oldAssigneeId = this.assignedTo;
            const noteEntry = {
                timestamp: new Date().toISOString(),
                note: `Reassigned from ${oldAssigneeId} to ${newAssigneeId}`,
                author: assignedBy
            };
            yield this.update({
                assignedTo: newAssigneeId,
                assignedBy,
                notesHistory: [...(this.notesHistory || []), noteEntry]
            });
        });
    }
}
Lead.init({
    id: {
        type: sequelize_1.DataTypes.UUID,
        defaultValue: sequelize_1.DataTypes.UUIDV4,
        primaryKey: true,
    },
    customerName: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    phoneNumber: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
        validate: {
            is: /^\+?[1-9][0-9]{7,14}$/, // Updated phone validation
        },
    },
    enquiryDetails: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: false,
    },
    status: {
        type: sequelize_1.DataTypes.ENUM(...Object.values(LeadStatus)),
        defaultValue: LeadStatus.NEW,
        allowNull: false,
    },
    assignedTo: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'SalesTeams',
            key: 'id',
        },
    },
    assignedBy: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
        references: {
            model: User_1.default,
            key: 'id',
        },
    },
    notes: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true,
    },
    location: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    notesHistory: {
        type: sequelize_1.DataTypes.JSONB,
        allowNull: false,
        defaultValue: [],
    },
}, {
    sequelize: sequelize_2.default,
    modelName: 'Lead',
    tableName: 'Leads',
    timestamps: true,
    hooks: {
        beforeUpdate: (lead) => __awaiter(void 0, void 0, void 0, function* () {
            // Add timestamp to notes when status changes
            if (lead.changed('status')) {
                const noteEntry = {
                    timestamp: new Date().toISOString(),
                    note: `Status changed to ${lead.status}`,
                    author: lead.assignedBy
                };
                lead.notesHistory = [...(lead.notesHistory || []), noteEntry];
            }
        }),
    },
});
exports.default = Lead;
