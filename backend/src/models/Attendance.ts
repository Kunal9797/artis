import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/sequelize';
import SalesTeam from './SalesTeam';

export enum AttendanceStatus {
  PRESENT = 'PRESENT',
  ABSENT = 'ABSENT',
}

interface Location {
  latitude: number;
  longitude: number;
}

interface AttendanceAttributes {
  id: string;
  salesTeamId: string;
  date: Date;
  location: Location;
  status: AttendanceStatus;
}

interface AttendanceCreationAttributes extends Omit<AttendanceAttributes, 'id'> {}

class Attendance extends Model<AttendanceAttributes, AttendanceCreationAttributes> {
  public id!: string;
  public salesTeamId!: string;
  public date!: Date;
  public location!: Location;
  public status!: AttendanceStatus;

  // Timestamps
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Attendance.init(
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
    date: {
      type: DataTypes.DATEONLY,
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
    status: {
      type: DataTypes.ENUM(...Object.values(AttendanceStatus)),
      allowNull: false,
      defaultValue: AttendanceStatus.PRESENT,
    },
  },
  {
    sequelize,
    modelName: 'Attendance',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['salesTeamId', 'date'],
      },
    ],
  }
);

// Define association
Attendance.belongsTo(SalesTeam, { foreignKey: 'salesTeamId' });
SalesTeam.hasMany(Attendance, { foreignKey: 'salesTeamId' });

export default Attendance; 