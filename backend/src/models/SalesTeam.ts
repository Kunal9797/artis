import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/sequelize';
import User, { UserRole, SalesRole } from './User';

// Export these interfaces
export interface ValidReportingStructure {
  SALES_EXECUTIVE: SalesRole[];
  ZONAL_HEAD: SalesRole[];
  COUNTRY_HEAD: SalesRole[];
}

export interface SalesTeamAttributes {
  id: string;
  userId: string;
  role: SalesRole;
  territory: string;
  reportingTo: string | null;
  targetQuarter: number;
  targetYear: number;
  targetAmount: number;
}

export interface UserAssociation {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  firstName: string;
  lastName: string;
}

export interface SalesTeamInstance extends Model<SalesTeamAttributes, Omit<SalesTeamAttributes, 'id'>>, SalesTeamAttributes {
  readonly createdAt: Date;
  readonly updatedAt: Date;
  User?: UserAssociation;
  getSubordinates(): Promise<SalesTeamInstance[]>;
  getManager(): Promise<SalesTeamInstance | null>;
}

class SalesTeam extends Model<SalesTeamAttributes, Omit<SalesTeamAttributes, 'id'>> {
  public id!: string;
  public userId!: string;
  public role!: SalesRole;
  public territory!: string;
  public reportingTo!: string | null;
  public targetQuarter!: number;
  public targetYear!: number;
  public targetAmount!: number;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  public User?: UserAssociation;

  public async getSubordinates(): Promise<SalesTeamInstance[]> {
    return SalesTeam.findAll({
      where: {
        reportingTo: this.id
      }
    }) as Promise<SalesTeamInstance[]>;
  }

  public async getManager(): Promise<SalesTeamInstance | null> {
    if (!this.reportingTo) return null;
    return SalesTeam.findByPk(this.reportingTo) as Promise<SalesTeamInstance | null>;
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
      allowNull: true,
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
      allowNull: true,
      validate: {
        min: 1,
        max: 4,
      },
    },
    targetYear: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    targetAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
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