import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models';
import bcrypt from 'bcrypt';
import sequelize from '../config/sequelize';

// Add this interface for typing the request with user
interface AuthRequest extends Request {
  user?: any;  // or more specifically: user?: User;
}

export const register = async (req: Request, res: Response) => {
  try {
    const { username, email, password, role, firstName, lastName, phoneNumber } = req.body;

    // Check if username already exists
    const existingUsername = await User.findOne({
      where: { username },
    });

    if (existingUsername) {
      return res.status(400).json({ error: 'Username already taken' });
    }

    // Check if email already exists
    const existingEmail = await User.findOne({
      where: { email },
    });

    if (existingEmail) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Create new user with required fields
    const user = await User.create({
      username,
      email,
      password,
      role,
      firstName,
      lastName,
      phoneNumber,
      version: 1
    });

    const token = jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

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
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Error registering user' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    console.log('Login attempt for username:', username);
    
    const user = await User.findOne({ 
      where: { username }
    });

    if (!user) {
      console.log('User not found:', username);
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    console.log('Password validation:', isValidPassword ? 'success' : 'failed');

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const token = jwt.sign(
      { 
        id: user.id, 
        role: user.role,
        version: user.version 
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

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
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Error logging in' });
  }
};

// Token validation endpoint
export const validateToken = async (req: AuthRequest, res: Response) => {
  try {
    // The auth middleware has already validated the token
    // If we reach here, the token is valid
    res.status(200).json({
      valid: true,
      user: req.user
    });
  } catch (error) {
    res.status(401).json({ valid: false });
  }
};

export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const users = await User.findAll({
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
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

export const updateUser = async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const { 
      username, 
      email, 
      password, 
      role, 
      firstName, 
      lastName, 
      phoneNumber 
    } = req.body;
    const requestingUser = req.user;

    console.log('Starting user update for ID:', userId);

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Create update object
    const updates: any = {};
    
    if (username && username !== user.username) {
      const existingUsername = await User.findOne({ where: { username } });
      if (existingUsername) {
        return res.status(400).json({ error: 'Username already taken' });
      }
      updates.username = username;
    }

    if (email && email !== user.email) {
      const existingEmail = await User.findOne({ where: { email } });
      if (existingEmail) {
        return res.status(400).json({ error: 'Email already registered' });
      }
      updates.email = email;
    }

    // Handle other fields
    if (firstName) updates.firstName = firstName;
    if (lastName) updates.lastName = lastName;
    if (phoneNumber) updates.phoneNumber = phoneNumber;
    if (role && role !== user.role) {
      if (userId === requestingUser.id) {
        return res.status(403).json({ error: 'Cannot change your own role' });
      }
      updates.role = role;
    }

    // Handle password separately to avoid double hashing
    if (password && password.trim() !== '') {
      // Hash password manually here instead of relying on hooks
      const hashedPassword = await bcrypt.hash(password, 10);
      updates.password = hashedPassword;
      console.log('Password updated with new hash');
    }

    // Increment version
    updates.version = (user.version || 1) + 1;
    
    // Update user with all changes at once
    await user.update(updates, { 
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
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  const t = await sequelize.transaction();
  
  try {
    const { userId } = req.params;
    
    console.log('\n=== Delete User Debug ===');
    console.log('1. Attempting to delete user:', userId);

    // First, find the user
    const user = await User.findByPk(userId);
    if (!user) {
      await t.rollback();
      return res.status(404).json({ error: 'User not found' });
    }

    console.log('2. Found user:', {
      id: user.id,
      role: user.role
    });

    // Sales team deletion removed - no longer needed
    console.log('3. Sales team entry: Not applicable (removed)');

    // Now delete the user
    await user.destroy({ transaction: t });
    console.log('5. Deleted user');

    await t.commit();
    console.log('6. Transaction committed successfully');

    res.json({ message: 'User deleted successfully' });
  } catch (error: any) {
    await t.rollback();
    console.error('\n=== Delete User Error ===');
    console.error('Error details:', error);
    console.error('Stack trace:', error?.stack);
    res.status(500).json({ error: 'Failed to delete user' });
  }
};

// Sales team functionality removed
// export const registerWithSalesTeam = async (req: Request, res: Response) => {
//   ... function body removed ...
// };

// Sales team functionality removed
// export const updateUserWithSalesTeam = ...
// export const getSalesTeamMembers = ... 