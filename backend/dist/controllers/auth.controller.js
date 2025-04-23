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
exports.getSalesTeamMembers = exports.updateUserWithSalesTeam = exports.registerWithSalesTeam = exports.deleteUser = exports.updateUser = exports.getAllUsers = exports.login = exports.register = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const models_1 = require("../models");
const bcrypt_1 = __importDefault(require("bcrypt"));
const sequelize_1 = __importDefault(require("../config/sequelize"));
const register = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { username, email, password, role, firstName, lastName, phoneNumber } = req.body;
        // Check if username already exists
        const existingUsername = yield models_1.User.findOne({
            where: { username },
        });
        if (existingUsername) {
            return res.status(400).json({ error: 'Username already taken' });
        }
        // Check if email already exists
        const existingEmail = yield models_1.User.findOne({
            where: { email },
        });
        if (existingEmail) {
            return res.status(400).json({ error: 'Email already registered' });
        }
        // Create new user with required fields
        const user = yield models_1.User.create({
            username,
            email,
            password,
            role,
            firstName,
            lastName,
            phoneNumber,
            version: 1
        });
        const token = jsonwebtoken_1.default.sign({ id: user.id }, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '24h' });
        res.status(201).json({
            message: 'User registered successfully',
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                firstName: user.firstName,
                lastName: user.lastName,
                phoneNumber: user.phoneNumber
            },
        });
    }
    catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Error registering user' });
    }
});
exports.register = register;
const login = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { username, password } = req.body;
        console.log('Login attempt for username:', username);
        const user = yield models_1.User.findOne({
            where: { username }
        });
        if (!user) {
            console.log('User not found:', username);
            return res.status(401).json({ error: 'Invalid username or password' });
        }
        const isValidPassword = yield bcrypt_1.default.compare(password, user.password);
        console.log('Password validation:', isValidPassword ? 'success' : 'failed');
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }
        const token = jsonwebtoken_1.default.sign({
            id: user.id,
            role: user.role,
            version: user.version
        }, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '24h' });
        console.log('Login successful for user:', user.id);
        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                firstName: user.firstName,
                lastName: user.lastName,
                phoneNumber: user.phoneNumber,
                version: user.version
            },
        });
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Error logging in' });
    }
});
exports.login = login;
const getAllUsers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const users = yield models_1.User.findAll({
            attributes: [
                'id',
                'username',
                'email',
                'role',
                'firstName',
                'lastName',
                'phoneNumber',
                'createdAt'
            ],
            order: [['createdAt', 'DESC']]
        });
        res.json(users);
    }
    catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});
exports.getAllUsers = getAllUsers;
const updateUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId } = req.params;
        const { username, email, password, role, firstName, lastName, phoneNumber } = req.body;
        const requestingUser = req.user;
        console.log('Starting user update for ID:', userId);
        const user = yield models_1.User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        // Create update object
        const updates = {};
        if (username && username !== user.username) {
            const existingUsername = yield models_1.User.findOne({ where: { username } });
            if (existingUsername) {
                return res.status(400).json({ error: 'Username already taken' });
            }
            updates.username = username;
        }
        if (email && email !== user.email) {
            const existingEmail = yield models_1.User.findOne({ where: { email } });
            if (existingEmail) {
                return res.status(400).json({ error: 'Email already registered' });
            }
            updates.email = email;
        }
        // Handle other fields
        if (firstName)
            updates.firstName = firstName;
        if (lastName)
            updates.lastName = lastName;
        if (phoneNumber)
            updates.phoneNumber = phoneNumber;
        if (role && role !== user.role) {
            if (userId === requestingUser.id) {
                return res.status(403).json({ error: 'Cannot change your own role' });
            }
            updates.role = role;
        }
        // Handle password separately to avoid double hashing
        if (password && password.trim() !== '') {
            // Hash password manually here instead of relying on hooks
            const hashedPassword = yield bcrypt_1.default.hash(password, 10);
            updates.password = hashedPassword;
            console.log('Password updated with new hash');
        }
        // Increment version
        updates.version = (user.version || 1) + 1;
        // Update user with all changes at once
        yield user.update(updates, {
            hooks: false // Disable hooks to prevent double hashing
        });
        console.log('User updated successfully:', {
            id: user.id,
            username: user.username,
            version: user.version
        });
        res.json({
            message: 'User updated successfully',
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                firstName: user.firstName,
                lastName: user.lastName,
                phoneNumber: user.phoneNumber,
                version: user.version
            }
        });
    }
    catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ error: 'Failed to update user' });
    }
});
exports.updateUser = updateUser;
const deleteUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const t = yield sequelize_1.default.transaction();
    try {
        const { userId } = req.params;
        console.log('\n=== Delete User Debug ===');
        console.log('1. Attempting to delete user:', userId);
        // First, find the user
        const user = yield models_1.User.findByPk(userId);
        if (!user) {
            yield t.rollback();
            return res.status(404).json({ error: 'User not found' });
        }
        console.log('2. Found user:', {
            id: user.id,
            role: user.role
        });
        // Check if user has a sales team entry
        const salesTeam = yield models_1.SalesTeam.findOne({
            where: { userId },
            transaction: t
        });
        console.log('3. Sales team entry:', salesTeam ? 'Found' : 'Not found');
        // If sales team entry exists, delete it first
        if (salesTeam) {
            yield salesTeam.destroy({ transaction: t });
            console.log('4. Deleted sales team entry');
        }
        // Now delete the user
        yield user.destroy({ transaction: t });
        console.log('5. Deleted user');
        yield t.commit();
        console.log('6. Transaction committed successfully');
        res.json({ message: 'User deleted successfully' });
    }
    catch (error) {
        yield t.rollback();
        console.error('\n=== Delete User Error ===');
        console.error('Error details:', error);
        console.error('Stack trace:', error === null || error === void 0 ? void 0 : error.stack);
        res.status(500).json({ error: 'Failed to delete user' });
    }
});
exports.deleteUser = deleteUser;
const registerWithSalesTeam = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const t = yield sequelize_1.default.transaction();
    try {
        const userData = req.body.user;
        const salesTeamData = req.body.salesTeam;
        // Create user
        const user = yield models_1.User.create(userData, { transaction: t });
        // Create sales team entry
        if (['SALES_EXECUTIVE', 'ZONAL_HEAD', 'COUNTRY_HEAD'].includes(user.role)) {
            yield models_1.SalesTeam.create(Object.assign({ userId: user.id, role: user.role }, salesTeamData), { transaction: t });
        }
        yield t.commit();
        res.status(201).json(user);
    }
    catch (error) {
        yield t.rollback();
        console.error('Error in registerWithSalesTeam:', error);
        res.status(400).json({ error: 'Failed to create user with sales team' });
    }
});
exports.registerWithSalesTeam = registerWithSalesTeam;
const updateUserWithSalesTeam = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const t = yield sequelize_1.default.transaction();
    try {
        const { userId } = req.params;
        const userData = req.body.user;
        const salesTeamData = req.body.salesTeam;
        console.log('\n=== Update User With Sales Team Debug ===');
        console.log('1. Request Data:', {
            userId,
            userData,
            salesTeamData
        });
        // Find user
        const user = yield models_1.User.findByPk(userId);
        console.log('2. Found User:', user ? {
            id: user.id,
            currentRole: user.role,
            newRole: userData.role
        } : 'User not found');
        if (!user) {
            yield t.rollback();
            return res.status(404).json({ error: 'User not found' });
        }
        // Update user
        yield user.update(userData, { transaction: t });
        console.log('3. Updated User Role:', {
            from: user.role,
            to: userData.role
        });
        // Handle sales team data
        const isSalesRole = ['SALES_EXECUTIVE', 'ZONAL_HEAD', 'COUNTRY_HEAD'].includes(userData.role);
        console.log('4. Is Sales Role:', isSalesRole);
        // Find existing sales team entry
        let salesTeam = yield models_1.SalesTeam.findOne({
            where: { userId: user.id },
            transaction: t
        });
        console.log('5. Existing Sales Team:', salesTeam ? {
            id: salesTeam.id,
            currentRole: salesTeam.role,
            newRole: userData.role
        } : 'No existing sales team entry');
        if (isSalesRole) {
            const updateData = {
                role: userData.role,
                territory: salesTeamData.territory || ((salesTeam === null || salesTeam === void 0 ? void 0 : salesTeam.territory) || ''),
                reportingTo: salesTeamData.reportingTo || null,
                targetQuarter: salesTeamData.targetQuarter || ((salesTeam === null || salesTeam === void 0 ? void 0 : salesTeam.targetQuarter) || 1),
                targetYear: salesTeamData.targetYear || ((salesTeam === null || salesTeam === void 0 ? void 0 : salesTeam.targetYear) || new Date().getFullYear()),
                targetAmount: salesTeamData.targetAmount || ((salesTeam === null || salesTeam === void 0 ? void 0 : salesTeam.targetAmount) || 0)
            };
            console.log('6. Update/Create Data:', updateData);
            if (salesTeam) {
                // Update existing entry with new role and data
                yield salesTeam.update(updateData, { transaction: t });
                console.log('7. Updated existing sales team entry');
            }
            else {
                // Create new sales team entry
                salesTeam = yield models_1.SalesTeam.create(Object.assign({ userId: user.id }, updateData), { transaction: t });
                console.log('7. Created new sales team entry');
            }
        }
        else if (salesTeam) {
            // If user is no longer in a sales role but has a sales team entry, remove it
            yield salesTeam.destroy({ transaction: t });
            console.log('7. Removed sales team entry (no longer sales role)');
        }
        yield t.commit();
        console.log('8. Transaction committed successfully');
        res.json({
            message: 'User updated successfully',
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                firstName: user.firstName,
                lastName: user.lastName,
                phoneNumber: user.phoneNumber
            }
        });
    }
    catch (error) {
        yield t.rollback();
        console.error('\n=== Update User With Sales Team Error ===');
        console.error('Error details:', error);
        console.error('Stack trace:', error === null || error === void 0 ? void 0 : error.stack);
        res.status(500).json({ error: 'Failed to update user with sales team' });
    }
});
exports.updateUserWithSalesTeam = updateUserWithSalesTeam;
const getSalesTeamMembers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const salesTeamMembers = yield models_1.SalesTeam.findAll({
            include: [{
                    model: models_1.User,
                    attributes: ['firstName', 'lastName', 'role'],
                    required: true // This ensures User exists
                }],
            where: {
                role: ['SALES_EXECUTIVE', 'ZONAL_HEAD', 'COUNTRY_HEAD']
            }
        });
        const formattedMembers = salesTeamMembers.map(member => {
            if (!member.User) {
                console.warn(`Sales team member ${member.id} has no associated user`);
                return null;
            }
            return {
                id: member.id,
                userId: member.userId,
                name: `${member.User.firstName} ${member.User.lastName}`,
                role: member.role
            };
        }).filter((member) => member !== null);
        console.log('Fetched sales team members:', formattedMembers);
        res.json(formattedMembers);
    }
    catch (error) {
        console.error('Error fetching sales team members:', error);
        res.status(500).json({ error: 'Failed to fetch sales team members' });
    }
});
exports.getSalesTeamMembers = getSalesTeamMembers;
