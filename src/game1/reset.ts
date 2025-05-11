import { initDb } from './db';
import { Approval } from './db/models/Approval';
import { Input } from './db/models/Input';
import { Output } from './db/models/Output';
import { sequelize } from './db/sequelize';


async function resetDatabase() {
    try {
        console.log('Truncating all tables...');
        
        // Truncate all tables in reverse order of dependencies
        await Input.destroy({ truncate: true, cascade: true });
        await Approval.destroy({ truncate: true, cascade: true });
        await Output.destroy({ truncate: true, cascade: true });
        
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