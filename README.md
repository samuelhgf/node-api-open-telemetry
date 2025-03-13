# Node.js Hello World API

A simple Node.js API built with Express that responds with a "Hello World" message.

## Features

- Express.js web server
- API endpoint that returns a Hello World message
- Health check endpoint
- Configured to run on port 3003

## Prerequisites

- Node.js (v14 or higher recommended)
- npm (v6 or higher)

## Installation

1. Clone this repository:
   ```
   git clone https://github.com/yourusername/node-api-open-telemetry.git
   cd node-api-open-telemetry
   ```

2. Install the dependencies:
   ```
   npm install
   ```

## Running the Application

### Development Mode

To run the application in development mode with automatic restarts on file changes:

```
npm run dev
```

### Production Mode

To run the application in production mode:

```
npm start
```

## API Endpoints

### Hello World Endpoint

```
GET /
```

Response:
```json
{
  "message": "Hello, World!",
  "status": "success"
}
```

### Health Check Endpoint

```
GET /health
```

Response:
```json
{
  "status": "UP",
  "timestamp": "2023-08-01T12:00:00.000Z"
}
```

## License

MIT 