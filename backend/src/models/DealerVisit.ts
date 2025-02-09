import { Model, DataTypes, Op } from 'sequelize';
import sequelize from '../config/sequelize';
import SalesTeam from './SalesTeam';

interface Location {
  latitude: number;
  longitude: number;
}

interface DealerVisitAttributes {
  id: string;
  salesTeamId: string;
  dealerName: string;
  location: Location;
  visitDate: Date;
  photoUrl: string;
  notes: string;
  salesAmount: number;
  isOfflineEntry: boolean;
  offlineId?: string;
  syncedAt?: Date;
}

interface DealerVisitCreationAttributes extends Omit<DealerVisitAttributes, 'id'> {}

class DealerVisit extends Model<DealerVisitAttributes, DealerVisitCreationAttributes> {
  public id!: string;
  public salesTeamId!: string;
  public dealerName!: string;
  public location!: Location;
  public visitDate!: Date;
  public photoUrl!: string;
  public notes!: string;
  public salesAmount!: number;
  public isOfflineEntry!: boolean;
  public offlineId?: string;
  public syncedAt?: Date;

  // Timestamps
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Helper method to mark as synced
  public async markAsSynced(): Promise<void> {
    await this.update({
      syncedAt: new Date(),
      isOfflineEntry: false,
    });
  }

  // Helper method to get unsynced visits for a sales team
  public static async getUnsyncedVisits(salesTeamId: string): Promise<DealerVisit[]> {
    return this.findAll({
      where: {
        salesTeamId,
        isOfflineEntry: true,
        syncedAt: null
      } as any // Type assertion to avoid TypeScript error with Op.is
    });
  }
}

DealerVisit.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    salesTeamId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: SalesTeam,
        key: 'id',
      },
    },
    dealerName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    location: {
      type: DataTypes.JSON,
      allowNull: false,
      validate: {
        isValidLocation(value: Location) {
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
      type: DataTypes.DATE,
      allowNull: false,
    },
    photoUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    salesAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    isOfflineEntry: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    offlineId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    syncedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
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
            [Op.not]: null,
          },
        },
      },
    ],
  }
);

// Define association
DealerVisit.belongsTo(SalesTeam, { foreignKey: 'salesTeamId' });
SalesTeam.hasMany(DealerVisit, { foreignKey: 'salesTeamId' });

export default DealerVisit; 