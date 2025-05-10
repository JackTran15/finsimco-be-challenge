import { sequelize } from './sequelize';
import { CompanyPricing } from './models/CompanyPricing';
import { SharesBid } from './models/SharesBid';
import { BiddingOutput } from './models/BiddingOutput';
import { InvestorAllocation } from './models/InvestorAllocation';

export const initDb = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connection established successfully.');

    // Sync all models
    await sequelize.sync();
    console.log('Database models synchronized successfully.');

    return true;
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    return false;
  }
};

export const closeDb = async () => {
  try {
    await sequelize.close();
    console.log('Database connection closed successfully.');
    return true;
  } catch (error) {
    console.error('Error closing database connection:', error);
    return false;
  }
};

export { CompanyPricing, SharesBid, BiddingOutput, InvestorAllocation }; 