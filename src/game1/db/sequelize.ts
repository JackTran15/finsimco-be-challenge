import { Sequelize } from 'sequelize';
import { config } from 'dotenv';

config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'postgres',
};


const defaultSequelize = new Sequelize({
  dialect: 'postgres',
  host: dbConfig.host,
  port: dbConfig.port,
  username: dbConfig.username,
  password: dbConfig.password,
  database: 'postgres',
  logging: false,
});

const createDatabase = async () => {
  try {
    await defaultSequelize.authenticate();
    await defaultSequelize.query(`CREATE DATABASE ${dbConfig.database};`);
    console.log(`Database ${dbConfig.database} created successfully.`);
  } catch (error: any) {
    if (error.message.includes('already exists')) {
      console.log(`Database ${dbConfig.database} already exists.`);
    } else {
      console.error('Error creating database:', error);
    }
  } finally {
    await defaultSequelize.close();
  }
};

createDatabase();

export const sequelize = new Sequelize({
  dialect: 'postgres',
  host: dbConfig.host,
  port: dbConfig.port,
  username: dbConfig.username,
  password: dbConfig.password,
  database: dbConfig.database,
  logging: false,
  sync: {
    force: false,
  },
}); 