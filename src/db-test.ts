import { sequelize } from './db/sequelize';
import { initDb } from './db';

async function testDatabaseConnection() {
  try {
    console.log('Testing database connection...');
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');

    console.log('Initializing database models...');
    await initDb();
    console.log('Database models initialized successfully.');

    console.log('All tests passed!');
  } catch (error) {
    console.error('Unable to connect to the database or initialize models! Error:', error);
  } finally {
    await sequelize.close();
  }
}

testDatabaseConnection(); 