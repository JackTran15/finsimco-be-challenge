# Backend CLI

Backend CLI application for simulation systems.

## Setup

### Environment Variables

This project uses environment variables for configuration. Create a `.env` file in the root directory with the following content:

```bash
# Database Configuration
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=simulation_db
DB_PORT=5432

# Adminer Configuration
ADMINER_PORT=8082
```

You can create this file manually or use the following command:

```bash
# Create .env file with default values
cat > .env << EOF
# Database Configuration
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=simulation_db
DB_PORT=5432

# Adminer Configuration
ADMINER_PORT=8082
EOF
```

You can modify these values according to your needs. If you don't create a `.env` file, the application will use the default values specified in the `docker-compose.yml` file.

### Database Setup with Docker

This project uses PostgreSQL for data storage. You can easily start a PostgreSQL database using Docker.

1. Make sure you have Docker and Docker Compose installed:
   - [Docker Installation Guide](https://docs.docker.com/get-docker/)
   - [Docker Compose Installation Guide](https://docs.docker.com/compose/install/)

2. Start the database container:
   ```bash
   docker compose up -d
   ```

3. To stop the database:
   ```bash
   docker compose down
   ```

4. To delete all data and restart clean:
   ```bash
   docker compose down -v
   docker compose up -d
   ```

### Environment Configuration

The default database configuration in the application uses:
- Host: localhost
- Port: 5432
- Username: postgres
- Password: postgres
- Database: simulation_db

You can modify these in `src/db/sequelize.ts` if needed.

### Running the Application

```bash
# Install dependencies
yarn

# Build the TypeScript code
yarn build

# Run the compiled application
yarn start

# For development with automatic reloading
yarn dev

# For TypeScript compilation in watch mode
yarn watch
```

The `yarn dev` command uses ts-node which runs the TypeScript code directly.

If you want to run the TypeScript compiler in watch mode separately, use `yarn watch` which uses nodemon to automatically restart the application when files change.

### Running the Game

The application includes a simulation game with two teams. You can run either team's interface using the following commands:

```bash
# Run Team 1's interface
yarn game1:team1

# Run Team 2's interface
yarn game1:team2
```

Each team has its own interface and functionality. Make sure to follow the prompts in each interface to participate in the simulation.

### Running Team 1 CLI

To run the Team 1 CLI, which allows you to enter financial terms and calculate valuations:

```bash
yarn team1
```

This will:
1. Prompt you to enter values for EBITDA, Interest Rate, Multiple, and Factor Score
2. Store these values in the database
3. Calculate the valuation using the formula: `Valuation = EBITDA × Multiple × Factor Score`
4. Allow you to edit the inputs if needed
5. Reset Team 2's approval status for each field when changes are made 