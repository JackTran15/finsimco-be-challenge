import { sequelize } from './sequelize';
import { Input } from './models/Input';
import { Approval } from './models/Approval';
import { Output } from './models/Output';

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const initDb = async () => {
    let retries = 5;
    while (retries > 0) {
        try {
            await sequelize.authenticate();
            console.log('Database connection has been established successfully.');
            
            await sequelize.sync({ force: false });
            console.log('Database models synchronized successfully (existing data preserved).');
            return;
        } catch (error) {
            console.error(`Unable to connect to the database (${retries} retries left):`, error);
            retries--;
            if (retries === 0) throw error;
            await wait(5000);
        }
    }
};

export const closeDb = async () => {
    try {
        await sequelize.close();
        console.log('Database connection closed successfully.');
    } catch (error) {
        console.error('Error closing database connection:', error);
        throw error;
    }
};


