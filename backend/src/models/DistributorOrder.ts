import { Model, DataTypes, Sequelize, Optional } from 'sequelize';
import sequelize from '../config/sequelize';

interface DistributorOrderAttributes {
  id: number;
  distributor_id?: number;
  distributor_name: string;
  location: string;
  state?: string;
  order_date: Date;
  thickness_72_92: number;
  thickness_08: number;
  thickness_1mm: number;
  total_pieces: number;
  month_year?: string;
  quarter?: string;
  notes?: string;
  created_at?: Date;
  updated_at?: Date;
}

interface DistributorOrderCreationAttributes extends Optional<DistributorOrderAttributes, 'id'> {}

class DistributorOrder extends Model<DistributorOrderAttributes, DistributorOrderCreationAttributes>
  implements DistributorOrderAttributes {
  public id!: number;
  public distributor_id?: number;
  public distributor_name!: string;
  public location!: string;
  public state?: string;
  public order_date!: Date;
  public thickness_72_92!: number;
  public thickness_08!: number;
  public thickness_1mm!: number;
  public total_pieces!: number;
  public month_year?: string;
  public quarter?: string;
  public notes?: string;

  public readonly created_at!: Date;
  public readonly updated_at!: Date;

  // Helper method to calculate month_year from order_date
  static calculateMonthYear(date: Date): string {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return `${month} ${year}`;
  }

  // Helper method to calculate quarter from order_date
  static calculateQuarter(date: Date): string {
    const quarter = Math.floor(date.getMonth() / 3) + 1;
    const year = date.getFullYear();
    return `Q${quarter} ${year}`;
  }

  // Helper method to derive state from location
  static deriveState(location: string): string | undefined {
    const locationStateMap: { [key: string]: string } = {
      'mumbai': 'Maharashtra',
      'thane': 'Maharashtra',
      'vasai': 'Maharashtra',
      'latur': 'Maharashtra',
      'pune': 'Maharashtra',
      'nagpur': 'Maharashtra',
      'delhi': 'Delhi',
      'new delhi': 'Delhi',
      'jaipur': 'Rajasthan',
      'ahmedabad': 'Gujarat',
      'bangalore': 'Karnataka',
      'bengaluru': 'Karnataka',
      'chennai': 'Tamil Nadu',
      'kolkata': 'West Bengal',
      'hyderabad': 'Telangana',
      'kanpur': 'Uttar Pradesh',
      'lucknow': 'Uttar Pradesh',
      'ghaziabad': 'Uttar Pradesh',
      'dehradun': 'Uttarakhand',
      'gurgaon': 'Haryana',
      'gurugram': 'Haryana',
      'chandigarh': 'Chandigarh',
      'patiala': 'Punjab'
    };

    const locationLower = location?.toLowerCase().trim();
    return locationStateMap[locationLower];
  }
}

// Initialize the model
DistributorOrder.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    distributor_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'distributors',
        key: 'id'
      }
    },
    distributor_name: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    location: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    state: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    order_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    thickness_72_92: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    thickness_08: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    thickness_1mm: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    total_pieces: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    month_year: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    quarter: {
      type: DataTypes.STRING(10),
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'distributor_orders',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['distributor_id'] },
      { fields: ['location'] },
      { fields: ['order_date'] },
      { fields: ['month_year'] },
      { fields: ['distributor_name', 'location'] },
    ],
  }
);

// Before save hook to auto-calculate fields
DistributorOrder.beforeSave((instance: DistributorOrder) => {
  // Auto-calculate total_pieces if not provided
  if (instance.total_pieces === undefined || instance.total_pieces === null) {
    instance.total_pieces = (instance.thickness_72_92 || 0) +
                            (instance.thickness_08 || 0) +
                            (instance.thickness_1mm || 0);
  }

  // Auto-calculate month_year if not provided
  if (instance.order_date && !instance.month_year) {
    instance.month_year = DistributorOrder.calculateMonthYear(new Date(instance.order_date));
  }

  // Auto-calculate quarter if not provided
  if (instance.order_date && !instance.quarter) {
    instance.quarter = DistributorOrder.calculateQuarter(new Date(instance.order_date));
  }

  // Auto-derive state if not provided
  if (instance.location && !instance.state) {
    instance.state = DistributorOrder.deriveState(instance.location);
  }
});

export default DistributorOrder;