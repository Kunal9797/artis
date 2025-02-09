import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/sequelize';
import User, { UserRole } from './User';

type SalesRole = Extract<UserRole, 'SALES_EXECUTIVE' | 'ZONAL_HEAD' | 'COUNTRY_HEAD'>;

interface ValidReportingStructure {
  SALES_EXECUTIVE: SalesRole[];
  ZONAL_HEAD: SalesRole[];
  COUNTRY_HEAD: SalesRole[];
}

interface SalesTeamAttributes {
  id: string;
  userId: string;
  role: SalesRole;
  territory: string;
  reportingTo: string | null;
  targetQuarter: number;
  targetYear: number;
  targetAmount: number;
}

interface SalesTeamCreationAttributes extends Omit<SalesTeamAttributes, 'id'> {}

class SalesTeam extends Model<SalesTeamAttributes, SalesTeamCreationAttributes> {
  public id!: string;
  public userId!: string;
  public role!: SalesRole;
  public territory!: string;
  public reportingTo!: string | null;
  public targetQuarter!: number;
  public targetYear!: number;
  public targetAmount!: number;

  // Timestamps
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Helper method to get subordinates
  public async getSubordinates(): Promise<SalesTeam[]> {
    return SalesTeam.findAll({
      where: {
        reportingTo: this.id
      }
    });
  }

  // Helper method to get reporting manager
  public async getManager(): Promise<SalesTeam | null> {
    if (!this.reportingTo) return null;
    return SalesTeam.findByPk(this.reportingTo);
  }
}

SalesTeam.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: User,
        key: 'id',
      },
    },
    role: {
      type: DataTypes.ENUM('SALES_EXECUTIVE', 'ZONAL_HEAD', 'COUNTRY_HEAD'),
      allowNull: false,
    },
    territory: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    reportingTo: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'SalesTeams',
        key: 'id',
      },
    },
    targetQuarter: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
        max: 4,
      },
    },
    targetYear: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    targetAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0,
      },
    },
  },
  {
    sequelize,
    modelName: 'SalesTeam',
    timestamps: true,
    hooks: {
      beforeCreate: async (team: SalesTeam) => {
        // Validate reporting structure based on roles
        if (team.reportingTo) {
          const manager = await SalesTeam.findByPk(team.reportingTo);
          if (!manager) {
            throw new Error('Invalid reporting manager');
          }
          
          const validReporting: ValidReportingStructure = {
            SALES_EXECUTIVE: ['ZONAL_HEAD'],
            ZONAL_HEAD: ['COUNTRY_HEAD'],
            COUNTRY_HEAD: [],
          };

          if (!validReporting[team.role].includes(manager.role as SalesRole)) {
            throw new Error('Invalid reporting structure');
          }
        }
      },
    },
  }
);

// Define associations
SalesTeam.belongsTo(User, { foreignKey: 'userId' });
User.hasOne(SalesTeam, { foreignKey: 'userId' });

// Self-referential association for reporting hierarchy
SalesTeam.belongsTo(SalesTeam, { as: 'manager', foreignKey: 'reportingTo' });
SalesTeam.hasMany(SalesTeam, { as: 'subordinates', foreignKey: 'reportingTo' });

export default SalesTeam; 