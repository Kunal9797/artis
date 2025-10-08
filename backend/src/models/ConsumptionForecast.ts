import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/sequelize';

class ConsumptionForecast extends Model {
  public id!: string;
  public productId!: string;
  public forecastDate!: Date;
  public forecastMonth!: string; // YYYY-MM format
  public predictedConsumption!: number;
  public actualConsumption?: number;
  public forecastMethod!: string;
  public confidence!: number;
  public seasonalFactor?: number;
  public trendFactor?: number;
  public mape?: number; // Mean Absolute Percentage Error
  public isBaseline!: boolean;
  public notes?: string;
  public createdBy?: string;
  public updatedAt!: Date;
}

ConsumptionForecast.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  productId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Products',
      key: 'id'
    },
    comment: 'Product being forecasted'
  },
  forecastDate: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    comment: 'Date when forecast was generated'
  },
  forecastMonth: {
    type: DataTypes.STRING(7), // YYYY-MM format
    allowNull: false,
    comment: 'Month being forecasted (YYYY-MM)'
  },
  predictedConsumption: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    comment: 'Predicted consumption in kg'
  },
  actualConsumption: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    comment: 'Actual consumption in kg (filled after month ends)'
  },
  forecastMethod: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'moving_average',
    comment: 'Method used: moving_average, exponential_smoothing, linear_trend, seasonal'
  },
  confidence: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    defaultValue: 0.0,
    comment: 'Confidence level (0-100%)'
  },
  seasonalFactor: {
    type: DataTypes.DECIMAL(5, 3),
    allowNull: true,
    comment: 'Seasonal adjustment factor'
  },
  trendFactor: {
    type: DataTypes.DECIMAL(5, 3),
    allowNull: true,
    comment: 'Trend adjustment factor'
  },
  mape: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    comment: 'Mean Absolute Percentage Error (%)'
  },
  isBaseline: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Whether this is the baseline forecast'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Additional notes about the forecast'
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id'
    },
    comment: 'User who generated the forecast'
  },
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  sequelize,
  modelName: 'ConsumptionForecast',
  tableName: 'ConsumptionForecasts',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['productId', 'forecastMonth', 'isBaseline'],
      name: 'idx_unique_baseline_forecast'
    }
  ],
  hooks: {
    // Calculate MAPE when actual consumption is updated
    beforeUpdate: async (forecast) => {
      if (forecast.actualConsumption && forecast.predictedConsumption) {
        const error = Math.abs(
          (forecast.actualConsumption - forecast.predictedConsumption) / forecast.actualConsumption
        );
        forecast.mape = error * 100;
      }
    }
  }
});

export default ConsumptionForecast;