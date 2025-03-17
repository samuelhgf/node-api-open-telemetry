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

[Screenshot placeholder for distributed traces showing request flow across services]

### Logging

[Screenshot placeholder for structured logging with trace IDs]

### Metrics

[Screenshot placeholder for OpenTelemetry metrics dashboard]

