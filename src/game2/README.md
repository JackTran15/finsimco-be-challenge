# Bidding System

A real-time bidding system with two teams:
- Team 1: Sets company pricing
- Team 2: Places share bids

## Prerequisites

- Node.js (v14 or higher)
- PostgreSQL database
- npm or yarn package manager

## Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory with the following variables:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=your_database_name
DB_USER=your_database_user
DB_PASSWORD=your_database_password
DEFAULT_SESSION_ID=default_session
```

## Running the Application

### Game 1

#### Development Mode (Team 1)
```bash
# Run with ts-node (development)
npm run dev:game1:team1

# Run with compiled JavaScript (production)
npm run build
npm run start:game1:team1
```

#### Development Mode (Team 2)
```bash
# Run with ts-node (development)
npm run dev:game1:team2

# Run with compiled JavaScript (production)
npm run build
npm run start:game1:team2
```

### Game 2

#### Development Mode (Team 1)
```bash
# Run with ts-node (development)
npm run dev:game2:team1

# Run with compiled JavaScript (production)
npm run build
npm run start:game2:team1
```

#### Development Mode (Team 2)
```bash
# Run with ts-node (development)
npm run dev:game2:team2

# Run with compiled JavaScript (production)
npm run build
npm run start:game2:team2
```

## Controls

- Press 'e' to edit data
- Press 'ESC' to quit

## Features

- Real-time data updates
- Automatic bidding calculations
- Transaction support
- Error handling
- Clean console interface 