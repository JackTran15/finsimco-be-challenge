import { Sequelize } from 'sequelize';

import { config } from 'dotenv';

config();

// Database configuration - can be overridden with environment variables
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'postgres',
};

console.log(dbConfig);

// First connect to the default postgres database
const defaultSequelize = new Sequelize({
  dialect: 'postgres',
  host: dbConfig.host,
  port: dbConfig.port,
  username: dbConfig.username,
  password: dbConfig.password,
  database: 'postgres',
  logging: false,
});

// Then create our application database if it doesn't exist
const createDatabase = async () => {
  try {
    await defaultSequelize.authenticate();
    await defaultSequelize.query(`CREATE DATABASE ${dbConfig.database};`);
    console.log(`Database ${dbConfig.database} created successfully.`);
  } catch (error: any) {
    // If database already exists, that's fine
    if (error.message.includes('already exists')) {
      console.log(`Database ${dbConfig.database} already exists.`);
    } else {
      console.error('Error creating database:', error);
    }
  } finally {
    await defaultSequelize.close();
  }
};

// Create the database if it doesn't exist
createDatabase();

// Export the main sequelize instance for the application
export const sequelize = new Sequelize({
  dialect: 'postgres',
  host: dbConfig.host,
  port: dbConfig.port,
  username: dbConfig.username,
  password: dbConfig.password,
  database: dbConfig.database,
  logging: false,
  sync: {
    force: true,
  },
  pool: {
    max: 5,
    min: 0,
    acquire: 60000,
    idle: 10000
  },
  retry: {
    max: 5,
    match: [/Deadlock/i, /ConnectionError/],
  }
}); 