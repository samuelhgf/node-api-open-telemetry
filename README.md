# Node.js API with OpenTelemetry Integration

This project demonstrates a Node.js API with comprehensive observability using OpenTelemetry. The application provides various endpoints to demonstrate different aspects of distributed tracing, logging, and metrics collection.

## Features

- RESTful API endpoints demonstrating different observability scenarios
- External API integration with JSONPlaceholder
- OpenTelemetry instrumentation for:
  - Distributed tracing
  - Metrics collection
  - Logging
- Automatic instrumentation for:
  - Express.js
  - HTTP requests
  - External API calls

## API Endpoints

### Hello World Endpoint
- `GET /`: Returns "Hello World!" with traced metrics and attributes
  - Records metrics for request count
  - Adds HTTP method and route attributes to span
  - Demonstrates basic tracing setup

### Health Check
- `GET /health`: Simple health check endpoint
  - Returns `{ status: 'OK' }`
  - Used for monitoring application health

### Error Demonstration
- `GET /error`: Demonstrates error handling and logging
  - Intentionally throws an exception
  - Logs error details with correlation IDs
  - Records error in span attributes
  - Demonstrates error tracing and logging

### External API Integration
- `GET /todos`: Fetches todos from JSONPlaceholder API
  - Demonstrates external API tracing
  - Records HTTP request/response details
  - Adds external service attributes
  - Returns todos data or error details

## Observability

### Distributed Tracing
<img width="1677" alt="Screenshot 2025-03-17 at 20 57 30" src="https://github.com/user-attachments/assets/e9e43b63-eb29-437f-b1bd-80fba6e08ab4" />
<img width="1680" alt="Screenshot 2025-03-17 at 20 57 47" src="https://github.com/user-attachments/assets/ee5765f3-b036-4aa4-89b7-b8239b039cc4" />


### Logging
<img width="1674" alt="Screenshot 2025-03-17 at 20 58 05" src="https://github.com/user-attachments/assets/58892e47-77d2-4cb2-8a87-e5c4c50ee395" />


### Metrics
<img width="1673" alt="Screenshot 2025-03-17 at 21 22 20" src="https://github.com/user-attachments/assets/ceebd492-8c80-44d6-9d61-0a36c4d05f89" />


