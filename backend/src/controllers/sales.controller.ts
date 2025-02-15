import { Request, Response } from 'express';
import { Op, WhereOptions, Model, ModelStatic, Includeable } from 'sequelize';
import sequelize from '../config/sequelize';
import { SalesTeam, DealerVisit, Lead, Attendance, Message, User } from '../models';
import { LeadStatus } from '../models/Lead';
import { AttendanceStatus } from '../models/Attendance';
import { UserRole, SalesRole } from '../models/User';
import { getDateRange, createDateWhereClause } from '../utils/dateUtils';
import { DateRangeQuery } from '../utils/dateUtils';
import type { SalesTeamInstance } from '../models/SalesTeam';

interface AuthRequest extends Request {
  user?: any;
  salesTeam?: any;
  file?: Express.Multer.File;
}

// Team Management Controllers
export const createSalesTeam = async (req: AuthRequest, res: Response) => {
  try {
    console.log('=== createSalesTeam Debug ===');
    console.log('Request body:', req.body);
    
    const { userId, territory, reportingTo, targetQuarter, targetYear, targetAmount } = req.body;

    // Verify user exists and has appropriate role
    const user = await User.findByPk(userId);
    console.log('Found user:', user?.toJSON());
    
    if (!user || !user.isSalesRole()) {
      console.log('User not found or not a sales role');
      return res.status(400).json({ error: 'Invalid user or role' });
    }

    // Check if user already has a sales team entry
    const existingTeam = await SalesTeam.findOne({ where: { userId } });
    if (existingTeam) {
      console.log('User already has a sales team entry');
      return res.status(400).json({ error: 'User already has a sales team entry' });
    }

    // Extract the sales role from the user's role
    const salesRole = user.role as SalesRole;

    const salesTeam = await SalesTeam.create({
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
  } catch (error) {
    console.error('Error creating sales team:', error);
    res.status(500).json({ error: 'Failed to create sales team' });
  }
};

export const updateSalesTeam = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { territory, targetQuarter, targetYear, targetAmount } = req.body;

    const salesTeam = await SalesTeam.findByPk(id);
    if (!salesTeam) {
      return res.status(404).json({ error: 'Sales team not found' });
    }

    const updates: any = {};
    if (territory !== undefined) updates.territory = territory;
    if (targetQuarter !== undefined) updates.targetQuarter = targetQuarter;
    if (targetYear !== undefined) updates.targetYear = targetYear;
    if (targetAmount !== undefined) updates.targetAmount = targetAmount;

    await salesTeam.update(updates);

    // Fetch updated record with User data
    const updatedTeam = await SalesTeam.findByPk(id, {
      include: [{
        model: User,
        attributes: ['firstName', 'lastName']
      }]
    });

    res.json(updatedTeam);
  } catch (error) {
    console.error('Error updating sales team:', error);
    res.status(500).json({ 
      error: 'Failed to update sales team',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const deleteSalesTeam = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const salesTeam = await SalesTeam.findByPk(id);
    
    if (!salesTeam) {
      return res.status(404).json({ error: 'Sales team not found' });
    }

    await salesTeam.destroy();
    res.json({ message: 'Sales team deleted successfully' });
  } catch (error) {
    console.error('Error deleting sales team:', error);
    res.status(500).json({ error: 'Failed to delete sales team' });
  }
};

export const getSalesTeamDetails = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const salesTeam = await SalesTeam.findByPk(id, {
      include: [
        {
          model: User,
          attributes: ['id', 'username', 'email', 'role'],
        },
        {
          model: SalesTeam,
          as: 'subordinates',
          include: [{
            model: User,
            attributes: ['id', 'username', 'email', 'role'],
          }],
        },
      ],
    });

    if (!salesTeam) {
      return res.status(404).json({ error: 'Sales team not found' });
    }

    res.json(salesTeam);
  } catch (error) {
    console.error('Error fetching sales team details:', error);
    res.status(500).json({ error: 'Failed to fetch sales team details' });
  }
};

export const getTeamHierarchy = async (req: AuthRequest, res: Response) => {
  try {
    const salesTeams = await SalesTeam.findAll({
      include: [
        {
          model: User,
          attributes: ['id', 'username', 'email', 'role'],
        },
      ],
      order: [['role', 'ASC']],
    });

    const hierarchy = buildHierarchy(salesTeams);
    res.json(hierarchy);
  } catch (error) {
    console.error('Error fetching team hierarchy:', error);
    res.status(500).json({ error: 'Failed to fetch team hierarchy' });
  }
};

// Dealer Visit Controllers
export const recordDealerVisit = async (req: AuthRequest, res: Response) => {
  try {
    const {
      dealerName,
      location,
      visitDate,
      notes,
      salesAmount,
      isOfflineEntry,
      offlineId,
    } = req.body;

    const photoUrl = req.file?.path || '';

    const dealerVisit = await DealerVisit.create({
      salesTeamId: req.salesTeam.id,
      dealerName,
      location,
      visitDate,
      photoUrl,
      notes,
      salesAmount,
      isOfflineEntry,
      offlineId,
    });

    res.status(201).json(dealerVisit);
  } catch (error) {
    console.error('Error recording dealer visit:', error);
    res.status(500).json({ error: 'Failed to record dealer visit' });
  }
};

export const getDealerVisits = async (req: AuthRequest, res: Response) => {
  try {
    const { teamId } = req.params;
    const dateRange = getDateRange(req.query as DateRangeQuery);

    const where = {
      salesTeamId: teamId,
      ...createDateWhereClause(dateRange, 'visitDate'),
    };

    const visits = await DealerVisit.findAll({
      where,
      order: [['visitDate', 'DESC']],
    });

    res.json(visits);
  } catch (error) {
    console.error('Error fetching dealer visits:', error);
    res.status(500).json({ error: 'Failed to fetch dealer visits' });
  }
};

export const syncOfflineVisits = async (req: AuthRequest, res: Response) => {
  try {
    const { visits } = req.body;
    const results = [];

    for (const visit of visits) {
      const existingVisit = await DealerVisit.findOne({
        where: { offlineId: visit.offlineId },
      });

      if (!existingVisit) {
        const newVisit = await DealerVisit.create({
          ...visit,
          salesTeamId: req.salesTeam.id,
        });
        results.push(newVisit);
      }
    }

    res.json(results);
  } catch (error) {
    console.error('Error syncing offline visits:', error);
    res.status(500).json({ error: 'Failed to sync offline visits' });
  }
};

export const updateDealerVisit = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { dealerName, location, visitDate, notes, salesAmount } = req.body;

    const visit = await DealerVisit.findByPk(id);
    if (!visit) {
      return res.status(404).json({ error: 'Visit not found' });
    }

    await visit.update({
      dealerName,
      location,
      visitDate,
      notes,
      salesAmount,
    });

    res.json(visit);
  } catch (error) {
    console.error('Error updating dealer visit:', error);
    res.status(500).json({ error: 'Failed to update dealer visit' });
  }
};

export const deleteDealerVisit = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const visit = await DealerVisit.findByPk(id);
    
    if (!visit) {
      return res.status(404).json({ error: 'Visit not found' });
    }

    await visit.destroy();
    res.json({ message: 'Visit deleted successfully' });
  } catch (error) {
    console.error('Error deleting visit:', error);
    res.status(500).json({ error: 'Failed to delete visit' });
  }
};

// Lead Management Controllers
export const createLead = async (req: AuthRequest, res: Response) => {
  try {
    console.log('\n=== Create Lead Debug ===');
    console.log('Request user:', req.user);
    console.log('Request body:', req.body);
    
    const { customerName, phoneNumber, enquiryDetails, assignedTo, location, notes } = req.body;
    
    console.log('\nLooking up sales team member:', assignedTo);
    const salesTeamMember = await SalesTeam.findByPk(assignedTo);
    console.log('Found sales team member:', salesTeamMember?.toJSON());

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
      status: LeadStatus.NEW,
      assignedTo,
      assignedBy: req.user?.id,
      location,
      notes
    });

    const lead = await Lead.create({
      customerName,
      phoneNumber,
      enquiryDetails,
      status: LeadStatus.NEW,
      assignedTo,
      assignedBy: req.user?.id,
      location,
      notes,
      notesHistory: notes ? [{
        timestamp: new Date().toISOString(),
        note: notes,
        author: req.user?.id
      }] : []
    });

    console.log('\nLead created successfully:', lead?.toJSON());
    res.status(201).json(lead);
  } catch (error) {
    console.error('\nError in createLead:', error);
    console.error('Error details:', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ 
      error: 'Failed to create lead',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const getLeads = async (req: AuthRequest, res: Response) => {
  try {
    const { status, assignedTo, page = 0, limit = 10, searchTerm } = req.query;
    
    const where: any = {};
    
    // Admin can see all leads, others can only see assigned leads
    if (req.user.role !== 'admin') {
      if (req.salesTeam) {
        where.assignedTo = req.salesTeam.id;
      } else {
        where.assignedTo = req.user.id;
      }
    }
    
    // Apply filters with validation
    if (status) {
      // Validate status value
      if (!Object.values(LeadStatus).includes(status as LeadStatus)) {
        return res.status(400).json({ 
          error: 'Invalid status value',
          validValues: Object.values(LeadStatus)
        });
      }
      where.status = status;
    }
    
    if (assignedTo && req.user.role === 'admin') where.assignedTo = assignedTo;
    if (searchTerm) {
      where[Op.or] = [
        { customerName: { [Op.iLike]: `%${searchTerm}%` } },
        { phoneNumber: { [Op.iLike]: `%${searchTerm}%` } },
        { location: { [Op.iLike]: `%${searchTerm}%` } }
      ];
    }

    const { rows: leads, count } = await Lead.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: Number(limit),
      offset: Number(page) * Number(limit),
      include: [{
        model: SalesTeam,
        as: 'assignee',
        attributes: ['id', 'role', 'userId'],
        include: [{
          model: User,
          attributes: ['firstName', 'lastName', 'id']
        }]
      }]
    });

    res.setHeader('X-Total-Count', count);
    res.json(leads);
  } catch (error) {
    console.error('Error fetching leads:', error);
    res.status(500).json({ 
      error: 'Failed to fetch leads',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const getLeadDetails = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const lead = await Lead.findByPk(id, {
      include: [
        {
          model: User,
          as: 'assignee',
          attributes: ['id', 'firstName', 'lastName']
        },
        {
          model: User,
          as: 'assigner',
          attributes: ['id', 'firstName', 'lastName']
        }
      ]
    });

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    res.json(lead);
  } catch (error) {
    console.error('Error fetching lead details:', error);
    res.status(500).json({ error: 'Failed to fetch lead details' });
  }
};

export const updateLead = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, notes, ...updateData } = req.body;

    const lead = await Lead.findByPk(id);
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

    await lead.update({
      ...updateData,
      status: status || lead.status
    });

    res.json(lead);
  } catch (error) {
    console.error('Error updating lead:', error);
    res.status(500).json({ error: 'Failed to update lead' });
  }
};

export const deleteLead = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const lead = await Lead.findByPk(id);
    
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    await lead.destroy();
    res.json({ message: 'Lead deleted successfully' });
  } catch (error) {
    console.error('Error deleting lead:', error);
    res.status(500).json({ error: 'Failed to delete lead' });
  }
};

export const reassignLead = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { assignedTo, notes } = req.body;

    const lead = await Lead.findByPk(id);
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const noteEntry = {
      timestamp: new Date().toISOString(),
      note: `Reassigned to new team member. ${notes || ''}`,
      author: req.user.id
    };

    await lead.update({
      assignedTo,
      notesHistory: [...(lead.notesHistory || []), noteEntry]
    });

    res.json(lead);
  } catch (error) {
    console.error('Error reassigning lead:', error);
    res.status(500).json({ error: 'Failed to reassign lead' });
  }
};

export const addLeadNote = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { note } = req.body;

    const lead = await Lead.findByPk(id);
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const noteEntry = {
      timestamp: new Date().toISOString(),
      note,
      author: req.user.id
    };

    await lead.update({
      notesHistory: [...(lead.notesHistory || []), noteEntry]
    });

    res.json(lead);
  } catch (error) {
    console.error('Error adding note to lead:', error);
    res.status(500).json({ error: 'Failed to add note' });
  }
};

// Attendance Controllers
export const markAttendance = async (req: AuthRequest, res: Response) => {
  try {
    const { date, location, status } = req.body;

    const attendance = await Attendance.create({
      salesTeamId: req.salesTeam.id,
      date,
      location,
      status,
    });

    res.status(201).json(attendance);
  } catch (error) {
    console.error('Error marking attendance:', error);
    res.status(500).json({ error: 'Failed to mark attendance' });
  }
};

export const getTeamAttendance = async (req: AuthRequest, res: Response) => {
  try {
    const { teamId } = req.params;
    const dateRange = getDateRange(req.query as DateRangeQuery);

    const where = {
      salesTeamId: teamId,
      ...createDateWhereClause(dateRange, 'date'),
    };

    const attendance = await Attendance.findAll({
      where,
      order: [['date', 'DESC']],
    });

    res.json(attendance);
  } catch (error) {
    console.error('Error fetching team attendance:', error);
    res.status(500).json({ error: 'Failed to fetch team attendance' });
  }
};

export const getAttendanceReport = async (req: AuthRequest, res: Response) => {
  try {
    const dateRange = getDateRange(req.query as DateRangeQuery);
    if (!dateRange) {
      return res.status(400).json({ error: 'Valid start date and end date are required' });
    }

    const where = createDateWhereClause(dateRange, 'date');
    const include: Includeable[] = [{
      model: SalesTeam,
      include: [{
        model: User,
        attributes: ['id', 'username', 'email', 'role'],
      }],
    }];

    const attendance = await Attendance.findAll({
      where,
      include,
      order: [['date', 'DESC']],
    });

    res.json(attendance);
  } catch (error) {
    console.error('Error generating attendance report:', error);
    res.status(500).json({ error: 'Failed to generate attendance report' });
  }
};

// Messaging Controllers
export const sendMessage = async (req: AuthRequest, res: Response) => {
  try {
    const { receiverId, message } = req.body;

    const newMessage = await Message.create({
      senderId: req.user.id,
      receiverId,
      message,
      isRead: false,
    });

    res.status(201).json(newMessage);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
};

export const getMessages = async (req: AuthRequest, res: Response) => {
  try {
    const messages = await Message.findAll({
      where: {
        [Op.or]: [
          { senderId: req.user.id },
          { receiverId: req.salesTeam?.id },
        ],
      },
      include: [
        {
          model: User,
          as: 'sender',
          attributes: ['id', 'username', 'email'],
        },
        {
          model: SalesTeam,
          as: 'receiver',
          include: [{
            model: User,
            attributes: ['id', 'username', 'email'],
          }],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
};

export const markMessageRead = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const message = await Message.findByPk(id);

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    await message.markAsRead();
    res.json(message);
  } catch (error) {
    console.error('Error marking message as read:', error);
    res.status(500).json({ error: 'Failed to mark message as read' });
  }
};

// Analytics Controllers
export const getSalesReport = async (req: AuthRequest, res: Response) => {
  try {
    const dateRange = getDateRange(req.query as DateRangeQuery);
    if (!dateRange) {
      return res.status(400).json({ error: 'Valid start date and end date are required' });
    }

    const teamId = req.salesTeam.id;
    const where = {
      salesTeamId: teamId,
      ...createDateWhereClause(dateRange, 'visitDate'),
    };

    const visits = await DealerVisit.findAll({
      where,
      attributes: [
        [sequelize.fn('sum', sequelize.col('salesAmount')), 'totalSales'],
        [sequelize.fn('count', sequelize.col('id')), 'totalVisits'],
      ],
    });

    res.json(visits[0]);
  } catch (error) {
    console.error('Error generating sales report:', error);
    res.status(500).json({ error: 'Failed to generate sales report' });
  }
};

export const getTeamPerformance = async (req: AuthRequest, res: Response) => {
  try {
    const view = req.query.view as 'personal' | 'zone' | 'country';
    const timeRange = req.query.timeRange as 'week' | 'month' | 'quarter';
    const dateRange = getDateRange({ timeRange });

    if (view === 'personal') {
      const salesTeamId = req.salesTeam?.id;
      if (!salesTeamId) {
        return res.status(400).json({ error: 'Sales team not found' });
      }

      // Get current period visits
      const currentVisits = await DealerVisit.findAll({
        where: {
          salesTeamId,
          ...createDateWhereClause(dateRange, 'visitDate')
        }
      });

      // Get previous period visits for trend calculation
      const previousDateRange = getDateRange({ 
        timeRange, 
        endDate: dateRange.startDate.toISOString() 
      });
      
      const previousVisits = await DealerVisit.findAll({
        where: {
          salesTeamId,
          ...createDateWhereClause(previousDateRange, 'visitDate')
        }
      });

      // Calculate metrics
      const currentSales = currentVisits.reduce((sum, visit) => sum + Number(visit.salesAmount || 0), 0);
      const previousSales = previousVisits.reduce((sum, visit) => sum + Number(visit.salesAmount || 0), 0);
      
      const currentVisitsCount = currentVisits.length;
      const previousVisitsCount = previousVisits.length;
      
      const avgDealSize = currentVisitsCount > 0 ? currentSales / currentVisitsCount : 0;
      const previousAvgDealSize = previousVisitsCount > 0 ? previousSales / previousVisitsCount : 0;

      // Get sales target
      const salesTeam = await SalesTeam.findByPk(salesTeamId);
      const targetAmount = salesTeam?.targetAmount || 0;

      // Calculate trends
      const salesTrend = previousSales > 0 
        ? ((currentSales - previousSales) / previousSales * 100).toFixed(1) + '%'
        : '0.0%';
        
      const visitsTrend = previousVisitsCount > 0
        ? ((currentVisitsCount - previousVisitsCount) / previousVisitsCount * 100).toFixed(1) + '%'
        : '0.0%';
        
      const dealSizeTrend = previousAvgDealSize > 0
        ? ((avgDealSize - previousAvgDealSize) / previousAvgDealSize * 100).toFixed(1) + '%'
        : '0.0%';

      // Format response
      const response = {
        timeSeriesData: currentVisits.map(visit => ({
          date: visit.visitDate,
          sales: Number(visit.salesAmount || 0)
        })),
        comparisonData: [{
          name: 'Current Period',
          current: currentSales,
          target: targetAmount
        }],
        metrics: {
          targetAchievement: targetAmount > 0 ? (currentSales / targetAmount * 100) : 0,
          targetAchievementTrend: salesTrend,
          visitsCompleted: currentVisitsCount,
          visitsCompletedTrend: visitsTrend,
          avgDealSize,
          avgDealSizeTrend: dealSizeTrend
        }
      };

      return res.json(response);
    }

    // Zone/Country views will be implemented later
    return res.status(400).json({ error: 'Zone and country views not yet implemented' });

  } catch (error) {
    console.error('Error fetching performance metrics:', error);
    res.status(500).json({ error: 'Failed to fetch performance metrics' });
  }
};

export const getVisitMetrics = async (req: AuthRequest, res: Response) => {
  try {
    const { teamId } = req.params;
    const dateRange = getDateRange(req.query as DateRangeQuery);
    if (!dateRange) {
      return res.status(400).json({ error: 'Valid start date and end date are required' });
    }

    const where = {
      salesTeamId: teamId,
      ...createDateWhereClause(dateRange, 'visitDate'),
    };

    const metrics = await DealerVisit.findAll({
      where,
      attributes: [
        [sequelize.fn('date_trunc', 'day', sequelize.col('visitDate')), 'date'],
        [sequelize.fn('count', sequelize.col('id')), 'visitCount'],
        [sequelize.fn('sum', sequelize.col('salesAmount')), 'salesAmount'],
      ],
      group: [sequelize.fn('date_trunc', 'day', sequelize.col('visitDate'))],
      order: [[sequelize.fn('date_trunc', 'day', sequelize.col('visitDate')), 'ASC']],
    });

    res.json(metrics);
  } catch (error) {
    console.error('Error fetching visit metrics:', error);
    res.status(500).json({ error: 'Failed to fetch visit metrics' });
  }
};

// Helper function to build team hierarchy
const buildHierarchy = (teams: SalesTeam[]) => {
  const hierarchy: any = {};
  const roleOrder = ['COUNTRY_HEAD', 'ZONAL_HEAD', 'SALES_EXECUTIVE'];

  teams.forEach(team => {
    if (!team.reportingTo) {
      hierarchy[team.id] = {
        ...team.toJSON(),
        subordinates: {},
      };
    }
  });

  roleOrder.slice(1).forEach(role => {
    teams
      .filter(team => team.role === role)
      .forEach(team => {
        if (team.reportingTo) {
          const manager = findManager(hierarchy, team.reportingTo);
          if (manager) {
            manager.subordinates[team.id] = {
              ...team.toJSON(),
              subordinates: {},
            };
          }
        }
      });
  });

  return hierarchy;
};

const findManager = (hierarchy: any, managerId: string): any => {
  for (const id in hierarchy) {
    if (id === managerId) return hierarchy[id];
    const found = findManager(hierarchy[id].subordinates, managerId);
    if (found) return found;
  }
  return null;
};

// Add this function to get all sales team members
export const getAllSalesTeam = async (req: AuthRequest, res: Response) => {
  try {
    const salesTeams = await SalesTeam.findAll({
      include: [{
        model: User,
        attributes: ['id', 'firstName', 'lastName', 'email', 'role']
      }],
      order: [['createdAt', 'DESC']]
    });

    res.json(salesTeams);
  } catch (error) {
    console.error('Error fetching all sales teams:', error);
    res.status(500).json({ error: 'Failed to fetch sales teams' });
  }
};

export const getTeamMembers = async (req: AuthRequest, res: Response) => {
  try {
    console.log('=== getTeamMembers Debug ===');
    console.log('User:', {
      id: req.user?.id,
      role: req.user?.role
    });

    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const userRole = req.user.role.toLowerCase();
    console.log('User role (lowercase):', userRole);

    let members;
    
    if (userRole === 'admin') {
      console.log('Processing admin request');
      members = await SalesTeam.findAll({
        include: [{
          model: User,
          attributes: ['id', 'firstName', 'lastName', 'role']
        }]
      });
    } else {
      // For non-admin users, only show their team
      if (!req.salesTeam?.id) {
        return res.status(403).json({ error: 'Sales team access required' });
      }
      
      members = await SalesTeam.findAll({
        where: {
          [Op.or]: [
            { id: req.salesTeam.id },
            { reportingTo: req.salesTeam.id }
          ]
        },
        include: [{
          model: User,
          attributes: ['id', 'firstName', 'lastName', 'role']
        }]
      });
    }

    const formattedMembers = members.map(member => ({
      id: member.id,
      name: member.User 
        ? `${member.User.firstName} ${member.User.lastName}`
        : 'Unknown',
      role: member.User?.role || member.role,
      territory: member.territory || '',
      targetQuarter: member.targetQuarter,
      targetYear: member.targetYear,
      targetAmount: member.targetAmount
    }));

    console.log('Returning formatted members:', formattedMembers.length);
    return res.json(formattedMembers);
  } catch (error) {
    console.error('Error in getTeamMembers:', error);
    res.status(500).json({ error: 'Failed to fetch team members' });
  }
}; 