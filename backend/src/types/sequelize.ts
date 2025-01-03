import { QueryInterface } from 'sequelize';

export interface Migration {
  up: (queryInterface: QueryInterface) => Promise<void>;
  down: (queryInterface: QueryInterface) => Promise<void>;
} 