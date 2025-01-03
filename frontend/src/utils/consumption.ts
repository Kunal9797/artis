import { Transaction } from '../types/transaction';

export const aggregateMonthlyConsumption = (transactions: Transaction[]) => {
  const monthlyData = transactions.reduce((acc: Record<string, number>, t: Transaction) => {
    if (t.type === 'OUT') {
      const month = new Date(t.date).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short' 
      });
      acc[month] = (acc[month] || 0) + Number(t.quantity);
    }
    return acc;
  }, {});

  const sortedEntries = Object.entries(monthlyData)
    .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime());
  
  const monthlyValues = Object.values(monthlyData);
  const averageConsumption = monthlyValues.length > 0 
    ? monthlyValues.reduce((a, b) => a + b, 0) / monthlyValues.length 
    : 0;

  return sortedEntries.map(([month, amount], index, array) => {
    const prevAmount = index > 0 ? Number(array[index - 1][1]) : Number(amount);
    const percentChange = prevAmount !== 0 
      ? ((Number(amount) - prevAmount) / prevAmount * 100).toFixed(1)
      : '0';

    return {
      month,
      amount: Number(amount),
      average: Number(averageConsumption.toFixed(2)),
      percentChange: Number(percentChange)
    };
  });
};
