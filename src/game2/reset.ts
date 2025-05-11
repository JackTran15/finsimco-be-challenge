import { initDb } from './db';
import { sequelize } from './db/sequelize';
import { BiddingOutput } from './db/models/BiddingOutput';
import { CompanyPricing } from './db/models/CompanyPricing';
import { SharesBid } from './db/models/SharesBid';

async function resetDatabase() {
    try {
        console.log('Truncating all tables...');
        
        // Truncate all tables in reverse order of dependencies
        await BiddingOutput.destroy({ truncate: true, cascade: true });
        await SharesBid.destroy({ truncate: true, cascade: true });
        await CompanyPricing.destroy({ truncate: true, cascade: true });
        
        console.log('All tables truncated successfully');

        console.log('Initializing database...');
        await initDb();
        console.log('Database initialized successfully');

        console.log('Syncing all models...');
        await sequelize.sync();
        console.log('All models synced successfully');

        console.log('Database reset completed successfully');
    } catch (error) {
        console.error('Error resetting database:', error);
    } finally {
        await sequelize.close();
    }
}

resetDatabase();