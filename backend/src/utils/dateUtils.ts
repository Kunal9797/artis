import { Op } from 'sequelize';

export interface DateRangeQuery {
  timeRange?: 'week' | 'month' | 'quarter';
  startDate?: string;
  endDate?: string;
}

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export const getDateRange = (query: DateRangeQuery): DateRange => {
  // If explicit dates are provided, use them
  if (query.startDate && query.endDate) {
    return {
      startDate: new Date(query.startDate),
      endDate: new Date(query.endDate)
    };
  }

  // Otherwise calculate based on timeRange
  const endDate = new Date();
  const startDate = new Date();

  switch (query.timeRange) {
    case 'week':
      startDate.setDate(endDate.getDate() - 7);
      break;
    case 'month':
      startDate.setMonth(endDate.getMonth() - 1);
      break;
    case 'quarter':
      startDate.setMonth(endDate.getMonth() - 3);
      break;
    default:
      startDate.setMonth(endDate.getMonth() - 1); // Default to month
  }

  return { startDate, endDate };
};

export const createDateWhereClause = (dateRange: DateRange, fieldName: string) => ({
  [fieldName]: {
    [Op.between]: [dateRange.startDate, dateRange.endDate]
  }
}); 