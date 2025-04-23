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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAttendanceStatus = exports.getTeamMembers = exports.getAllSalesTeam = exports.getVisitMetrics = exports.getTeamPerformance = exports.getSalesReport = exports.markMessageRead = exports.getMessages = exports.sendMessage = exports.getAttendanceReport = exports.getCurrentUserAttendance = exports.getTeamAttendance = exports.markAttendance = exports.addLeadNote = exports.reassignLead = exports.deleteLead = exports.updateLead = exports.getLeadDetails = exports.getLeads = exports.createLead = exports.deleteDealerVisit = exports.updateDealerVisit = exports.syncOfflineVisits = exports.getDealerVisits = exports.recordDealerVisit = exports.getTeamHierarchy = exports.getSalesTeamDetails = exports.deleteSalesTeam = exports.updateSalesTeam = exports.createSalesTeam = void 0;
const sequelize_1 = require("sequelize");
const sequelize_2 = __importDefault(require("../config/sequelize"));
const models_1 = require("../models");
const Lead_1 = require("../models/Lead");
const dateUtils_1 = require("../utils/dateUtils");
// Team Management Controllers
const createSalesTeam = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log('=== createSalesTeam Debug ===');
        console.log('Request body:', req.body);
        const { userId, territory, reportingTo, targetQuarter, targetYear, targetAmount } = req.body;
        // Verify user exists and has appropriate role
        const user = yield models_1.User.findByPk(userId);
        console.log('Found user:', user === null || user === void 0 ? void 0 : user.toJSON());
        if (!user || !user.isSalesRole()) {
            console.log('User not found or not a sales role');
            return res.status(400).json({ error: 'Invalid user or role' });
        }
        // Check if user already has a sales team entry
        const existingTeam = yield models_1.SalesTeam.findOne({ where: { userId } });
        if (existingTeam) {
            console.log('User already has a sales team entry');
            return res.status(400).json({ error: 'User already has a sales team entry' });
        }
        // Extract the sales role from the user's role
        const salesRole = user.role;
        const salesTeam = yield models_1.SalesTeam.create({
            userId,
            role: salesRole,
            territory: territory || '',
            reportingTo: reportingTo || null,
            targetQuarter: targetQuarter || 1,
            targetYear: targetYear || new Date().getFullYear(),
            targetAmount: targetAmount || 0,
        });
        console.log('Created sales team:', salesTeam.toJSON());
        res.status(201).json(salesTeam);
    }
    catch (error) {
        console.error('Error creating sales team:', error);
        res.status(500).json({ error: 'Failed to create sales team' });
    }
});
exports.createSalesTeam = createSalesTeam;
const updateSalesTeam = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { territory, targetQuarter, targetYear, targetAmount } = req.body;
        const salesTeam = yield models_1.SalesTeam.findByPk(id);
        if (!salesTeam) {
            return res.status(404).json({ error: 'Sales team not found' });
        }
        const updates = {};
        if (territory !== undefined)
            updates.territory = territory;
        if (targetQuarter !== undefined)
            updates.targetQuarter = targetQuarter;
        if (targetYear !== undefined)
            updates.targetYear = targetYear;
        if (targetAmount !== undefined)
            updates.targetAmount = targetAmount;
        yield salesTeam.update(updates);
        // Fetch updated record with User data
        const updatedTeam = yield models_1.SalesTeam.findByPk(id, {
            include: [{
                    model: models_1.User,
                    attributes: ['firstName', 'lastName']
                }]
        });
        res.json(updatedTeam);
    }
    catch (error) {
        console.error('Error updating sales team:', error);
        res.status(500).json({
            error: 'Failed to update sales team',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
exports.updateSalesTeam = updateSalesTeam;
const deleteSalesTeam = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const salesTeam = yield models_1.SalesTeam.findByPk(id);
        if (!salesTeam) {
            return res.status(404).json({ error: 'Sales team not found' });
        }
        yield salesTeam.destroy();
        res.json({ message: 'Sales team deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting sales team:', error);
        res.status(500).json({ error: 'Failed to delete sales team' });
    }
});
exports.deleteSalesTeam = deleteSalesTeam;
const getSalesTeamDetails = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const salesTeam = yield models_1.SalesTeam.findByPk(id, {
            include: [
                {
                    model: models_1.User,
                    attributes: ['id', 'username', 'email', 'role'],
                },
                {
                    model: models_1.SalesTeam,
                    as: 'subordinates',
                    include: [{
                            model: models_1.User,
                            attributes: ['id', 'username', 'email', 'role'],
                        }],
                },
            ],
        });
        if (!salesTeam) {
            return res.status(404).json({ error: 'Sales team not found' });
        }
        res.json(salesTeam);
    }
    catch (error) {
        console.error('Error fetching sales team details:', error);
        res.status(500).json({ error: 'Failed to fetch sales team details' });
    }
});
exports.getSalesTeamDetails = getSalesTeamDetails;
const getTeamHierarchy = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const salesTeams = yield models_1.SalesTeam.findAll({
            include: [
                {
                    model: models_1.User,
                    attributes: ['id', 'username', 'email', 'role'],
                },
            ],
            order: [['role', 'ASC']],
        });
        const hierarchy = buildHierarchy(salesTeams);
        res.json(hierarchy);
    }
    catch (error) {
        console.error('Error fetching team hierarchy:', error);
        res.status(500).json({ error: 'Failed to fetch team hierarchy' });
    }
});
exports.getTeamHierarchy = getTeamHierarchy;
// Dealer Visit Controllers
const recordDealerVisit = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { dealerNames, sales, notes, location, isOfflineEntry = false, offlineId, } = req.body;
        // Validate sales data
        if (!sales || typeof sales !== 'object') {
            return res.status(400).json({ error: 'Invalid sales data' });
        }
        // Create dealer visit with optional photo
        const visit = yield models_1.DealerVisit.create({
            salesTeamId: req.salesTeam.id,
            dealerNames,
            location,
            visitDate: new Date(),
            photoUrl: (_a = req.file) === null || _a === void 0 ? void 0 : _a.path, // Add photo URL if file was uploaded
            notes,
            sales,
            isOfflineEntry,
            offlineId,
        });
        res.status(201).json(visit);
    }
    catch (error) {
        console.error('Error recording dealer visit:', error);
        res.status(500).json({
            error: 'Failed to record dealer visit',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
exports.recordDealerVisit = recordDealerVisit;
const getDealerVisits = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { startDate, endDate } = req.query;
        const teamId = req.params.teamId || req.salesTeam.id;
        const whereClause = {
            salesTeamId: teamId,
        };
        // Add date filtering if provided
        if (startDate && endDate) {
            whereClause.visitDate = {
                [sequelize_1.Op.between]: [new Date(startDate), new Date(endDate)]
            };
        }
        const visits = yield models_1.DealerVisit.findAll({
            where: whereClause,
            order: [['visitDate', 'DESC']],
            include: [{
                    model: models_1.SalesTeam,
                    include: [{
                            model: models_1.User,
                            attributes: ['firstName', 'lastName']
                        }]
                }]
        });
        // Calculate totals
        const totals = visits.reduce((acc, visit) => {
            Object.entries(visit.sales).forEach(([key, value]) => {
                acc[key] = (acc[key] || 0) + value;
            });
            return acc;
        }, {});
        res.json({
            visits,
            totals,
            totalVisits: visits.length
        });
    }
    catch (error) {
        console.error('Error fetching dealer visits:', error);
        res.status(500).json({ error: 'Failed to fetch dealer visits' });
    }
});
exports.getDealerVisits = getDealerVisits;
const syncOfflineVisits = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { visits } = req.body;
        const results = [];
        for (const visit of visits) {
            const existingVisit = yield models_1.DealerVisit.findOne({
                where: { offlineId: visit.offlineId },
            });
            if (!existingVisit) {
                const newVisit = yield models_1.DealerVisit.create(Object.assign(Object.assign({}, visit), { salesTeamId: req.salesTeam.id }));
                results.push(newVisit);
            }
        }
        res.json(results);
    }
    catch (error) {
        console.error('Error syncing offline visits:', error);
        res.status(500).json({ error: 'Failed to sync offline visits' });
    }
});
exports.syncOfflineVisits = syncOfflineVisits;
const updateDealerVisit = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const visit = yield models_1.DealerVisit.findByPk(id);
        if (!visit) {
            return res.status(404).json({ error: 'Visit not found' });
        }
        // Check if edit is allowed (same day only)
        if (!visit.canEdit()) {
            return res.status(403).json({ error: 'Visits can only be edited on the same day' });
        }
        // Update visit
        const updatedVisit = yield visit.update(req.body);
        res.json(updatedVisit);
    }
    catch (error) {
        console.error('Error updating dealer visit:', error);
        res.status(500).json({ error: 'Failed to update dealer visit' });
    }
});
exports.updateDealerVisit = updateDealerVisit;
const deleteDealerVisit = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const visit = yield models_1.DealerVisit.findByPk(id);
        if (!visit) {
            return res.status(404).json({ error: 'Visit not found' });
        }
        yield visit.destroy();
        res.json({ message: 'Visit deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting visit:', error);
        res.status(500).json({ error: 'Failed to delete visit' });
    }
});
exports.deleteDealerVisit = deleteDealerVisit;
// Lead Management Controllers
const createLead = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        console.log('\n=== Create Lead Debug ===');
        console.log('Request user:', req.user);
        console.log('Request body:', req.body);
        const { customerName, phoneNumber, enquiryDetails, assignedTo, location, notes } = req.body;
        console.log('\nLooking up sales team member:', assignedTo);
        const salesTeamMember = yield models_1.SalesTeam.findByPk(assignedTo);
        console.log('Found sales team member:', salesTeamMember === null || salesTeamMember === void 0 ? void 0 : salesTeamMember.toJSON());
        if (!salesTeamMember) {
            console.log('Sales team member not found');
            return res.status(400).json({
                error: 'Invalid assignedTo value. Sales team member not found.',
                details: `Sales team member with ID ${assignedTo} does not exist.`
            });
        }
        console.log('\nCreating lead with data:', {
            customerName,
            phoneNumber,
            enquiryDetails,
            status: Lead_1.LeadStatus.NEW,
            assignedTo,
            assignedBy: (_a = req.user) === null || _a === void 0 ? void 0 : _a.id,
            location,
            notes
        });
        const lead = yield models_1.Lead.create({
            customerName,
            phoneNumber,
            enquiryDetails,
            status: Lead_1.LeadStatus.NEW,
            assignedTo,
            assignedBy: (_b = req.user) === null || _b === void 0 ? void 0 : _b.id,
            location,
            notes,
            notesHistory: notes ? [{
                    timestamp: new Date().toISOString(),
                    note: notes,
                    author: (_c = req.user) === null || _c === void 0 ? void 0 : _c.id
                }] : []
        });
        console.log('\nLead created successfully:', lead === null || lead === void 0 ? void 0 : lead.toJSON());
        res.status(201).json(lead);
    }
    catch (error) {
        console.error('\nError in createLead:', error);
        console.error('Error details:', error instanceof Error ? error.message : 'Unknown error');
        res.status(500).json({
            error: 'Failed to create lead',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
exports.createLead = createLead;
const getLeads = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { status, assignedTo, page = 0, limit = 10, searchTerm } = req.query;
        const where = {};
        // Admin can see all leads, others can only see assigned leads
        if (req.user.role !== 'admin') {
            if (req.salesTeam) {
                where.assignedTo = req.salesTeam.id;
            }
            else {
                where.assignedTo = req.user.id;
            }
        }
        // Apply filters with validation
        if (status) {
            // Validate status value
            if (!Object.values(Lead_1.LeadStatus).includes(status)) {
                return res.status(400).json({
                    error: 'Invalid status value',
                    validValues: Object.values(Lead_1.LeadStatus)
                });
            }
            where.status = status;
        }
        if (assignedTo && req.user.role === 'admin')
            where.assignedTo = assignedTo;
        if (searchTerm) {
            where[sequelize_1.Op.or] = [
                { customerName: { [sequelize_1.Op.iLike]: `%${searchTerm}%` } },
                { phoneNumber: { [sequelize_1.Op.iLike]: `%${searchTerm}%` } },
                { location: { [sequelize_1.Op.iLike]: `%${searchTerm}%` } }
            ];
        }
        const { rows: leads, count } = yield models_1.Lead.findAndCountAll({
            where,
            order: [['createdAt', 'DESC']],
            limit: Number(limit),
            offset: Number(page) * Number(limit),
            include: [{
                    model: models_1.SalesTeam,
                    as: 'assignee',
                    attributes: ['id', 'role', 'userId'],
                    include: [{
                            model: models_1.User,
                            attributes: ['firstName', 'lastName', 'id']
                        }]
                }]
        });
        res.setHeader('X-Total-Count', count);
        res.json(leads);
    }
    catch (error) {
        console.error('Error fetching leads:', error);
        res.status(500).json({
            error: 'Failed to fetch leads',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
exports.getLeads = getLeads;
const getLeadDetails = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const lead = yield models_1.Lead.findByPk(id, {
            include: [
                {
                    model: models_1.User,
                    as: 'assignee',
                    attributes: ['id', 'firstName', 'lastName']
                },
                {
                    model: models_1.User,
                    as: 'assigner',
                    attributes: ['id', 'firstName', 'lastName']
                }
            ]
        });
        if (!lead) {
            return res.status(404).json({ error: 'Lead not found' });
        }
        res.json(lead);
    }
    catch (error) {
        console.error('Error fetching lead details:', error);
        res.status(500).json({ error: 'Failed to fetch lead details' });
    }
});
exports.getLeadDetails = getLeadDetails;
const updateLead = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const _a = req.body, { status, notes } = _a, updateData = __rest(_a, ["status", "notes"]);
        const lead = yield models_1.Lead.findByPk(id);
        if (!lead) {
            return res.status(404).json({ error: 'Lead not found' });
        }
        if (notes) {
            const noteEntry = {
                timestamp: new Date().toISOString(),
                note: notes,
                author: req.user.id
            };
            updateData.notesHistory = [...(lead.notesHistory || []), noteEntry];
        }
        yield lead.update(Object.assign(Object.assign({}, updateData), { status: status || lead.status }));
        res.json(lead);
    }
    catch (error) {
        console.error('Error updating lead:', error);
        res.status(500).json({ error: 'Failed to update lead' });
    }
});
exports.updateLead = updateLead;
const deleteLead = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const lead = yield models_1.Lead.findByPk(id);
        if (!lead) {
            return res.status(404).json({ error: 'Lead not found' });
        }
        yield lead.destroy();
        res.json({ message: 'Lead deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting lead:', error);
        res.status(500).json({ error: 'Failed to delete lead' });
    }
});
exports.deleteLead = deleteLead;
const reassignLead = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { assignedTo, notes } = req.body;
        const lead = yield models_1.Lead.findByPk(id);
        if (!lead) {
            return res.status(404).json({ error: 'Lead not found' });
        }
        const noteEntry = {
            timestamp: new Date().toISOString(),
            note: `Reassigned to new team member. ${notes || ''}`,
            author: req.user.id
        };
        yield lead.update({
            assignedTo,
            notesHistory: [...(lead.notesHistory || []), noteEntry]
        });
        res.json(lead);
    }
    catch (error) {
        console.error('Error reassigning lead:', error);
        res.status(500).json({ error: 'Failed to reassign lead' });
    }
});
exports.reassignLead = reassignLead;
const addLeadNote = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { id } = req.params;
        const { note } = req.body;
        console.log('\n=== Add Lead Note Debug ===');
        console.log('Lead ID:', id);
        console.log('Note:', note);
        console.log('User:', req.user);
        const lead = yield models_1.Lead.findByPk(id, {
            include: [{
                    model: models_1.SalesTeam,
                    as: 'assignee',
                    include: [{
                            model: models_1.User,
                            attributes: ['id', 'firstName', 'lastName']
                        }]
                }]
        });
        if (!lead) {
            return res.status(404).json({ error: 'Lead not found' });
        }
        // Create new note entry
        const noteEntry = {
            timestamp: new Date().toISOString(),
            note,
            author: (_a = req.user) === null || _a === void 0 ? void 0 : _a.id
        };
        // Update the notesHistory array
        const updatedNotesHistory = [...(lead.notesHistory || []), noteEntry];
        // Update the lead with new note
        yield lead.update({
            notesHistory: updatedNotesHistory,
            notes: note // Update the main notes field as well
        });
        // Return the updated lead directly
        res.json(lead);
    }
    catch (error) {
        console.error('Error adding note to lead:', error);
        res.status(500).json({
            error: 'Failed to add note to lead',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
exports.addLeadNote = addLeadNote;
// Attendance Controllers
const markAttendance = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { date, location, status } = req.body;
        // Check for existing attendance
        const existingAttendance = yield models_1.Attendance.findOne({
            where: {
                salesTeamId: req.salesTeam.id,
                date: date
            }
        });
        if (existingAttendance) {
            return res.status(400).json({
                error: 'Attendance already marked for today'
            });
        }
        const attendance = yield models_1.Attendance.create({
            salesTeamId: req.salesTeam.id,
            date,
            location,
            status: status || 'PRESENT'
        });
        res.status(201).json(attendance);
    }
    catch (error) {
        console.error('Error marking attendance:', error);
        res.status(500).json({
            error: 'Failed to mark attendance',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
exports.markAttendance = markAttendance;
const getTeamAttendance = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { teamId } = req.params;
        const dateRange = (0, dateUtils_1.getDateRange)(req.query);
        const where = Object.assign({ salesTeamId: teamId }, (0, dateUtils_1.createDateWhereClause)(dateRange, 'date'));
        const attendance = yield models_1.Attendance.findAll({
            where,
            order: [['date', 'DESC']],
        });
        res.json(attendance);
    }
    catch (error) {
        console.error('Error fetching team attendance:', error);
        res.status(500).json({ error: 'Failed to fetch team attendance' });
    }
});
exports.getTeamAttendance = getTeamAttendance;
const getCurrentUserAttendance = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const dateRange = (0, dateUtils_1.getDateRange)(req.query);
        if (!dateRange) {
            return res.status(400).json({ error: 'Valid start date and end date are required' });
        }
        const where = Object.assign({ salesTeamId: req.salesTeam.id }, (0, dateUtils_1.createDateWhereClause)(dateRange, 'date'));
        const attendance = yield models_1.Attendance.findAll({
            where,
            order: [['date', 'DESC']],
        });
        res.json(attendance);
    }
    catch (error) {
        console.error('Error fetching user attendance:', error);
        res.status(500).json({ error: 'Failed to fetch attendance history' });
    }
});
exports.getCurrentUserAttendance = getCurrentUserAttendance;
const getAttendanceReport = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const dateRange = (0, dateUtils_1.getDateRange)(req.query);
        if (!dateRange) {
            return res.status(400).json({ error: 'Valid start date and end date are required' });
        }
        const where = (0, dateUtils_1.createDateWhereClause)(dateRange, 'date');
        const include = [{
                model: models_1.SalesTeam,
                include: [{
                        model: models_1.User,
                        attributes: ['id', 'username', 'email', 'role'],
                    }],
            }];
        const attendance = yield models_1.Attendance.findAll({
            where,
            include,
            order: [['date', 'DESC']],
        });
        res.json(attendance);
    }
    catch (error) {
        console.error('Error generating attendance report:', error);
        res.status(500).json({ error: 'Failed to generate attendance report' });
    }
});
exports.getAttendanceReport = getAttendanceReport;
// Messaging Controllers
const sendMessage = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { receiverId, message } = req.body;
        const newMessage = yield models_1.Message.create({
            senderId: req.user.id,
            receiverId,
            message,
            isRead: false,
        });
        res.status(201).json(newMessage);
    }
    catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ error: 'Failed to send message' });
    }
});
exports.sendMessage = sendMessage;
const getMessages = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const messages = yield models_1.Message.findAll({
            where: {
                [sequelize_1.Op.or]: [
                    { senderId: req.user.id },
                    { receiverId: (_a = req.salesTeam) === null || _a === void 0 ? void 0 : _a.id },
                ],
            },
            include: [
                {
                    model: models_1.User,
                    as: 'sender',
                    attributes: ['id', 'username', 'email'],
                },
                {
                    model: models_1.SalesTeam,
                    as: 'receiver',
                    include: [{
                            model: models_1.User,
                            attributes: ['id', 'username', 'email'],
                        }],
                },
            ],
            order: [['createdAt', 'DESC']],
        });
        res.json(messages);
    }
    catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});
exports.getMessages = getMessages;
const markMessageRead = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const message = yield models_1.Message.findByPk(id);
        if (!message) {
            return res.status(404).json({ error: 'Message not found' });
        }
        yield message.markAsRead();
        res.json(message);
    }
    catch (error) {
        console.error('Error marking message as read:', error);
        res.status(500).json({ error: 'Failed to mark message as read' });
    }
});
exports.markMessageRead = markMessageRead;
// Analytics Controllers
const getSalesReport = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const dateRange = (0, dateUtils_1.getDateRange)(req.query);
        if (!dateRange) {
            return res.status(400).json({ error: 'Valid start date and end date are required' });
        }
        const teamId = req.salesTeam.id;
        const where = Object.assign({ salesTeamId: teamId }, (0, dateUtils_1.createDateWhereClause)(dateRange, 'visitDate'));
        const visits = yield models_1.DealerVisit.findAll({
            where,
            attributes: [
                [sequelize_2.default.fn('count', sequelize_2.default.col('id')), 'totalVisits'],
                [
                    sequelize_2.default.literal(`
            SUM(
              CAST(sales->>'liner' AS INTEGER) +
              CAST(sales->>'artvio08' AS INTEGER) +
              CAST(sales->>'woodrica08' AS INTEGER) +
              CAST(sales->>'artis1' AS INTEGER)
            )
          `),
                    'totalSheets'
                ],
            ],
        });
        res.json(visits[0]);
    }
    catch (error) {
        console.error('Error generating sales report:', error);
        res.status(500).json({ error: 'Failed to generate sales report' });
    }
});
exports.getSalesReport = getSalesReport;
const getTeamPerformance = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const view = req.query.view;
        const timeRange = req.query.timeRange;
        const dateRange = (0, dateUtils_1.getDateRange)({ timeRange });
        if (view === 'personal') {
            const salesTeamId = (_a = req.salesTeam) === null || _a === void 0 ? void 0 : _a.id;
            if (!salesTeamId) {
                return res.status(400).json({ error: 'Sales team not found' });
            }
            // Get current period visits
            const currentVisits = yield models_1.DealerVisit.findAll({
                where: Object.assign({ salesTeamId }, (0, dateUtils_1.createDateWhereClause)(dateRange, 'visitDate'))
            });
            // Get previous period visits for trend calculation
            const previousDateRange = (0, dateUtils_1.getDateRange)({
                timeRange,
                endDate: dateRange.startDate.toISOString()
            });
            const previousVisits = yield models_1.DealerVisit.findAll({
                where: Object.assign({ salesTeamId }, (0, dateUtils_1.createDateWhereClause)(previousDateRange, 'visitDate'))
            });
            // Calculate metrics
            const currentTotalSheets = currentVisits.reduce((sum, visit) => {
                const totalSheets = Object.values(visit.sales).reduce((a, b) => a + b, 0);
                return sum + totalSheets;
            }, 0);
            const previousTotalSheets = previousVisits.reduce((sum, visit) => {
                const totalSheets = Object.values(visit.sales).reduce((a, b) => a + b, 0);
                return sum + totalSheets;
            }, 0);
            const currentVisitsCount = currentVisits.length;
            const previousVisitsCount = previousVisits.length;
            const avgSheetsPerVisit = currentVisitsCount > 0 ? currentTotalSheets / currentVisitsCount : 0;
            const previousAvgSheetsPerVisit = previousVisitsCount > 0 ? previousTotalSheets / previousVisitsCount : 0;
            // Get sales target
            const salesTeam = yield models_1.SalesTeam.findByPk(salesTeamId);
            const targetAmount = (salesTeam === null || salesTeam === void 0 ? void 0 : salesTeam.targetAmount) || 0;
            // Calculate trends
            const sheetsTrend = previousTotalSheets > 0
                ? ((currentTotalSheets - previousTotalSheets) / previousTotalSheets) * 100
                : 0;
            const visitsTrend = previousVisitsCount > 0
                ? ((currentVisitsCount - previousVisitsCount) / previousVisitsCount) * 100
                : 0;
            res.json({
                currentPeriod: {
                    totalSheets: currentTotalSheets,
                    totalVisits: currentVisitsCount,
                    avgSheetsPerVisit
                },
                previousPeriod: {
                    totalSheets: previousTotalSheets,
                    totalVisits: previousVisitsCount,
                    avgSheetsPerVisit: previousAvgSheetsPerVisit
                },
                trends: {
                    sheets: sheetsTrend,
                    visits: visitsTrend
                },
                target: targetAmount
            });
        }
        // Zone/Country views will be implemented later
        return res.status(400).json({ error: 'Zone and country views not yet implemented' });
    }
    catch (error) {
        console.error('Error calculating team performance:', error);
        res.status(500).json({ error: 'Failed to calculate team performance' });
    }
});
exports.getTeamPerformance = getTeamPerformance;
const getVisitMetrics = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { teamId } = req.params;
        const dateRange = (0, dateUtils_1.getDateRange)(req.query);
        if (!dateRange) {
            return res.status(400).json({ error: 'Valid start date and end date are required' });
        }
        const where = Object.assign({ salesTeamId: teamId }, (0, dateUtils_1.createDateWhereClause)(dateRange, 'visitDate'));
        const metrics = yield models_1.DealerVisit.findAll({
            where,
            attributes: [
                [sequelize_2.default.fn('date_trunc', 'day', sequelize_2.default.col('visitDate')), 'date'],
                [sequelize_2.default.fn('count', sequelize_2.default.col('id')), 'visitCount'],
                [sequelize_2.default.fn('sum', sequelize_2.default.col('salesAmount')), 'salesAmount'],
            ],
            group: [sequelize_2.default.fn('date_trunc', 'day', sequelize_2.default.col('visitDate'))],
            order: [[sequelize_2.default.fn('date_trunc', 'day', sequelize_2.default.col('visitDate')), 'ASC']],
        });
        res.json(metrics);
    }
    catch (error) {
        console.error('Error fetching visit metrics:', error);
        res.status(500).json({ error: 'Failed to fetch visit metrics' });
    }
});
exports.getVisitMetrics = getVisitMetrics;
// Helper function to build team hierarchy
const buildHierarchy = (teams) => {
    const hierarchy = {};
    const roleOrder = ['COUNTRY_HEAD', 'ZONAL_HEAD', 'SALES_EXECUTIVE'];
    teams.forEach(team => {
        if (!team.reportingTo) {
            hierarchy[team.id] = Object.assign(Object.assign({}, team.toJSON()), { subordinates: {} });
        }
    });
    roleOrder.slice(1).forEach(role => {
        teams
            .filter(team => team.role === role)
            .forEach(team => {
            if (team.reportingTo) {
                const manager = findManager(hierarchy, team.reportingTo);
                if (manager) {
                    manager.subordinates[team.id] = Object.assign(Object.assign({}, team.toJSON()), { subordinates: {} });
                }
            }
        });
    });
    return hierarchy;
};
const findManager = (hierarchy, managerId) => {
    for (const id in hierarchy) {
        if (id === managerId)
            return hierarchy[id];
        const found = findManager(hierarchy[id].subordinates, managerId);
        if (found)
            return found;
    }
    return null;
};
// Add this function to get all sales team members
const getAllSalesTeam = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const salesTeams = yield models_1.SalesTeam.findAll({
            include: [{
                    model: models_1.User,
                    attributes: ['id', 'firstName', 'lastName', 'email', 'role']
                }],
            order: [['createdAt', 'DESC']]
        });
        res.json(salesTeams);
    }
    catch (error) {
        console.error('Error fetching all sales teams:', error);
        res.status(500).json({ error: 'Failed to fetch sales teams' });
    }
});
exports.getAllSalesTeam = getAllSalesTeam;
const getTeamMembers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        console.log('=== getTeamMembers Debug ===');
        console.log('User:', {
            id: (_a = req.user) === null || _a === void 0 ? void 0 : _a.id,
            role: (_b = req.user) === null || _b === void 0 ? void 0 : _b.role
        });
        if (!req.user) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        const userRole = req.user.role.toLowerCase();
        console.log('User role (lowercase):', userRole);
        let members;
        if (userRole === 'admin') {
            console.log('Processing admin request');
            members = yield models_1.SalesTeam.findAll({
                include: [{
                        model: models_1.User,
                        attributes: ['id', 'firstName', 'lastName', 'role']
                    }]
            });
        }
        else {
            // For non-admin users, only show their team
            if (!((_c = req.salesTeam) === null || _c === void 0 ? void 0 : _c.id)) {
                return res.status(403).json({ error: 'Sales team access required' });
            }
            members = yield models_1.SalesTeam.findAll({
                where: {
                    [sequelize_1.Op.or]: [
                        { id: req.salesTeam.id },
                        { reportingTo: req.salesTeam.id }
                    ]
                },
                include: [{
                        model: models_1.User,
                        attributes: ['id', 'firstName', 'lastName', 'role']
                    }]
            });
        }
        const formattedMembers = members.map(member => {
            var _a;
            return ({
                id: member.id,
                name: member.User
                    ? `${member.User.firstName} ${member.User.lastName}`
                    : 'Unknown',
                role: ((_a = member.User) === null || _a === void 0 ? void 0 : _a.role) || member.role,
                territory: member.territory || '',
                targetQuarter: member.targetQuarter,
                targetYear: member.targetYear,
                targetAmount: member.targetAmount
            });
        });
        console.log('Returning formatted members:', formattedMembers.length);
        return res.json(formattedMembers);
    }
    catch (error) {
        console.error('Error in getTeamMembers:', error);
        res.status(500).json({ error: 'Failed to fetch team members' });
    }
});
exports.getTeamMembers = getTeamMembers;
const getAttendanceStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const date = req.query.date;
        const attendance = yield models_1.Attendance.findOne({
            where: {
                salesTeamId: req.salesTeam.id,
                date: date
            }
        });
        res.json(attendance);
    }
    catch (error) {
        console.error('Error getting attendance status:', error);
        res.status(500).json({ error: 'Failed to get attendance status' });
    }
});
exports.getAttendanceStatus = getAttendanceStatus;
