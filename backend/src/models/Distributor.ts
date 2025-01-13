import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/sequelize';

interface DistributorAttributes {
  id?: number;
  name: string;
  city: string;
  state: string;
  phoneNumber: string;
  catalogs: string[];
  latitude?: number;
  longitude?: number;
}

class Distributor extends Model<DistributorAttributes> implements DistributorAttributes {
  public id!: number;
  public name!: string;
  public city!: string;
  public state!: string;
  public phoneNumber!: string;
  public catalogs!: string[];
  public latitude!: number;
  public longitude!: number;
}

Distributor.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    city: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    state: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    phoneNumber: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    catalogs: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: [],
    },
    latitude: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    longitude: {
      type: DataTypes.FLOAT,
      allowNull: true,
    }
  },
  {
    sequelize,
    tableName: 'distributors',
    timestamps: true,
  }
);

export default Distributor; 