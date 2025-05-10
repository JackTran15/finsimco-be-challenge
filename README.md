# Backend CLI

A TypeScript-based backend CLI application with game functionality and database integration.

## Prerequisites

- Node.js (v22 or higher)
- PostgreSQL
- TypeScript

## Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

## Environment Setup

Create a `.env` file in the root directory with your database configuration:
```env
DB_HOST=your_host
DB_PORT=your_port
DB_NAME=your_database
DB_USER=your_username
DB_PASSWORD=your_password
```

## Available Scripts

### Development
- `yarn build` - Compile TypeScript to JavaScript
- `yarn dev:game1:team1` - Run game 1 - team 1 game from ts code
- `yarn dev:game1:team2` - Run game 1 - team 2 game from ts code
- `yarn dev:game2:team2` - Run game 2 - team 2 game from ts code
- `yarn dev:game2:team2` - Run game 2 - team 2 game from ts code
- `yarn db:test` - Run database tests

### Production
- `yarn build` - Compile TypeScript to JavaScript
- `yarn start:game1:team1` - Run game 1 - team 1 game from compiled code
- `yarn start:game1:team2` - Run game 1 - team 2 game from compiled code
- `yarn start:game2:team2` - Run game 2 - team 2 game from compiled code
- `yarn start:game2:team2` - Run game 2 - team 2 game from compiled code

## Dependencies

### Main Dependencies
- dotenv - Environment variable management
- inquirer - Interactive command line user interface
- pg - PostgreSQL client
- sequelize - ORM for database operations
- uuid - Unique identifier generation
- chalk - Terminal string styling

### Development Dependencies
- TypeScript
- ts-node - TypeScript execution engine
- nodemon - Development server with auto-reload
- Various TypeScript type definitions