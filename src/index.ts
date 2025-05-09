import { initDb } from './db';
import { sequelize } from './db/sequelize';

const startApp = async () => {
  try {
    // Initialize database connection
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('Database connection established successfully.');
    
    // Initialize database models
    console.log('Initializing models...');
    await initDb();
    console.log('Models initialized successfully.');
    
    // Application logic will go here
    console.log('Application started successfully!');
    console.log('Use Ctrl+C to stop the application');
    
    // Keep the application running
    process.on('SIGINT', async () => {
      console.log('Shutting down...');
      await sequelize.close();
      console.log('Database connection closed.');
      process.exit(0);
    });
  } catch (error) {
    console.error('Failed to start application:', error);
    await sequelize.close();
    process.exit(1);
  }
};

startApp(); 