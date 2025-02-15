import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/sequelize';
import bcrypt from 'bcrypt';

export type UserRole = 'admin' | 'user' | 'SALES_EXECUTIVE' | 'ZONAL_HEAD' | 'COUNTRY_HEAD';
export type SalesRole = Extract<UserRole, 'SALES_EXECUTIVE' | 'ZONAL_HEAD' | 'COUNTRY_HEAD'>;

interface RoleHierarchy {
  COUNTRY_HEAD: SalesRole[];
  ZONAL_HEAD: SalesRole[];
  SALES_EXECUTIVE: SalesRole[];
}

interface UserAttributes {
  id: string;
  username: string;
  email: string;
  password: string;
  role: UserRole;
  version: number;
  firstName: string;
  lastName: string;
  phoneNumber: string;
}

interface UserCreationAttributes extends Omit<UserAttributes, 'id'> {}

class User extends Model<UserAttributes, UserCreationAttributes> {
  public id!: string;
  public username!: string;
  public email!: string;
  public password!: string;
  public role!: UserRole;
  public version!: number;
  public firstName!: string;
  public lastName!: string;
  public phoneNumber!: string;

  public async validatePassword(password: string): Promise<boolean> {
    return bcrypt.compare(password, this.password);
  }

  public isSalesRole(): boolean {
    return ['SALES_EXECUTIVE', 'ZONAL_HEAD', 'COUNTRY_HEAD'].includes(this.role as SalesRole);
  }

  public canManage(otherRole: SalesRole): boolean {
    const roleHierarchy: RoleHierarchy = {
      COUNTRY_HEAD: ['ZONAL_HEAD', 'SALES_EXECUTIVE'],
      ZONAL_HEAD: ['SALES_EXECUTIVE'],
      SALES_EXECUTIVE: [],
    };

    if (!this.isSalesRole()) return false;
    return roleHierarchy[this.role as keyof RoleHierarchy]?.includes(otherRole) || false;
  }
}

User.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
        len: [3, 30]
      }
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    role: {
      type: DataTypes.ENUM('admin', 'user', 'SALES_EXECUTIVE', 'ZONAL_HEAD', 'COUNTRY_HEAD'),
      defaultValue: 'user',
    },
    version: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      allowNull: false
    },
    firstName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    phoneNumber: {
      type: DataTypes.STRING,
      allowNull: false,
    }
  },
  {
    sequelize,
    modelName: 'User',
    hooks: {
      beforeCreate: async (user: User) => {
        user.password = await bcrypt.hash(user.password, 10);
      },
      beforeUpdate: async (user: User) => {
        if (user.changed('password')) {
          user.password = await bcrypt.hash(user.password, 10);
        }
      }
    },
  }
);

export default User; 