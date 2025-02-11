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
    const { userId, role, territory, reportingTo, targetQuarter, targetYear, targetAmount } = req.body;

    // Verify user exists and has appropriate role
    const user = await User.findByPk(userId);
    if (!user || !user.isSalesRole()) {
      return res.status(400).json({ error: 'Invalid user or role' });
    }

    const salesTeam = await SalesTeam.create({
      userId,
      role,
      territory,
      reportingTo,
      targetQuarter,
      targetYear,
      targetAmount,
    });

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

    await salesTeam.update({
      territory,
      targetQuarter,
      targetYear,
      targetAmount,
    });

    res.json(salesTeam);
  } catch (error) {
    console.error('Error updating sales team:', error);
    res.status(500).json({ error: 'Failed to update sales team' });
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
    const { customerName, phoneNumber, enquiryDetails, assignedTo } = req.body;

    const lead = await Lead.create({
      customerName,
      phoneNumber,
      enquiryDetails,
      status: LeadStatus.NEW,
      assignedTo,
      assignedBy: req.user.id,
      notes: '',
    });

    res.status(201).json(lead);
  } catch (error) {
    console.error('Error creating lead:', error);
    res.status(500).json({ error: 'Failed to create lead' });
  }
};

export const updateLead = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const lead = await Lead.findByPk(id);
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    await lead.update({ status, notes });
    res.json(lead);
  } catch (error) {
    console.error('Error updating lead:', error);
    res.status(500).json({ error: 'Failed to update lead' });
  }
};

export const reassignLead = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { newAssigneeId } = req.body;

    const lead = await Lead.findByPk(id);
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    await lead.reassign(newAssigneeId, req.user.id);
    res.json(lead);
  } catch (error) {
    console.error('Error reassigning lead:', error);
    res.status(500).json({ error: 'Failed to reassign lead' });
  }
};

export const getLeads = async (req: AuthRequest, res: Response) => {
  try {
    const { teamId } = req.params;
    const { status } = req.query;

    const whereClause: any = { assignedTo: teamId };
    if (status) {
      whereClause.status = status;
    }

    const leads = await Lead.findAll({
      where: whereClause,
      order: [['createdAt', 'DESC']],
    });

    res.json(leads);
  } catch (error) {
    console.error('Error fetching leads:', error);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
};

export const getLeadDetails = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const lead = await Lead.findByPk(id, {
      include: [
        {
          model: SalesTeam,
          as: 'assignee',
          include: [{
            model: User,
            attributes: ['id', 'username', 'email'],
          }],
        },
        {
          model: User,
          as: 'assigner',
          attributes: ['id', 'username', 'email'],
        },
      ],
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
export const getAllSalesTeam = async (req: Request, res: Response) => {
  try {
    const salesTeam = await SalesTeam.findAll({
      include: [{
        model: User,
        attributes: ['id', 'username', 'email', 'role', 'firstName', 'lastName']
      }],
      order: [['createdAt', 'DESC']]
    }) as SalesTeamInstance[];

    const formattedTeam = salesTeam.map(member => ({
      id: member.id,
      userId: member.userId,
      name: member.User ? `${member.User.firstName} ${member.User.lastName}` : 'Unknown',
      role: member.role,
      territory: member.territory,
      targetQuarter: member.targetQuarter,
      targetYear: member.targetYear,
      targetAmount: member.targetAmount,
      reportingTo: member.reportingTo,
      performance: {
        currentSales: 0,
        targetAchievement: 0,
        visitsCompleted: 0,
        avgDealSize: 0
      },
      attendance: {
        present: 0,
        absent: 0,
        total: 0
      },
      status: 'online' as const
    }));

    res.json(formattedTeam);
  } catch (error) {
    console.error('Error fetching sales team:', error);
    res.status(500).json({ 
      error: 'Failed to fetch sales team',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const getTeamMembers = async (req: Request, res: Response) => {
  try {
    const role = req.query.role as SalesRole;
    
    if (!role || !['SALES_EXECUTIVE', 'ZONAL_HEAD', 'COUNTRY_HEAD'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const members = await SalesTeam.findAll({
      where: { role: role },
      include: [{
        model: User,
        attributes: ['firstName', 'lastName']
      }]
    }) as SalesTeamInstance[];

    const formattedMembers = members.map(member => ({
      id: member.id,
      name: `${member.User?.firstName} ${member.User?.lastName}`
    }));

    res.json(formattedMembers);
  } catch (error) {
    console.error('Error fetching team members:', error);
    res.status(500).json({ error: 'Failed to fetch team members' });
  }
}; 