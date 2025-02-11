import { Dialect } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

interface DatabaseConfig {
  host?: string;
  username?: string;
  password?: string;
  database?: string;
  url?: string;
  dialect: Dialect;
  dialectOptions?: {
    ssl?: {
      require: boolean;
      rejectUnauthorized: boolean;
    };
  };
  define: {
    timestamps: boolean;
    underscored: boolean;
  };
}

interface Config {
  development: DatabaseConfig;
  production: DatabaseConfig;
}

const config: Config = {
  development: {
    host: process.env.DB_HOST || 'localhost',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'artis_db',
    dialect: 'postgres',
    define: {
      timestamps: true,
      underscored: false
    }
  },
  production: {
    url: process.env.DATABASE_URL,
    dialect: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    },
    define: {
      timestamps: true,
      underscored: false
    }
  }
};

export default config; 