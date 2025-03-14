# Node.js API with OpenTelemetry and AWS S3 Tracing

This is a simple Express API that demonstrates distributed tracing between an EC2-hosted API and an S3 bucket using OpenTelemetry.

## Features

- Express.js API running on port 3003
- AWS X-Ray integration for general request tracing
- OpenTelemetry integration for detailed distributed tracing
- S3 interactions traced with OpenTelemetry
- Connection to `poc-ai-files` S3 bucket

## Endpoints

- `GET /` - Simple hello world endpoint
- `GET /health` - Health check endpoint
- `GET /s3-files` - Lists files from the `poc-ai-files` S3 bucket and traces the operation

## OpenTelemetry Integration

The application uses OpenTelemetry to create distributed traces between the API and S3 operations. The tracing includes:

- Express.js instrumentation for HTTP requests
- AWS SDK instrumentation for S3 operations
- Custom spans with detailed attributes for S3 interactions

## Requirements

- Node.js v14+
- AWS credentials with S3 access permissions
- OpenTelemetry collector (for sending traces)

## Environment Variables

The following environment variables can be configured:

- `PORT` - Port to run the server on (default: 3003)
- `AWS_REGION` - AWS region for the S3 bucket (default: 'us-east-1')
- `OTEL_EXPORTER_OTLP_ENDPOINT` - Endpoint for the OpenTelemetry collector (default: 'http://localhost:4318/v1/traces')

## Running the Application

1. Install dependencies:
   ```
   npm install
   ```

2. Run the application:
   ```
   npm start
   ```

3. Access the S3 file listing endpoint:
   ```
   curl http://localhost:3003/s3-files
   ```

## Viewing Traces

Traces will be exported to the configured OpenTelemetry collector, which can forward them to various backends including:

- AWS X-Ray
- Jaeger
- Zipkin
- Cloud observability platforms

## AWS Credentials

The application uses the AWS SDK's default credential provider chain, which will look for credentials in the following order:

1. Environment variables
2. Shared credentials file
3. ECS container credentials
4. EC2 instance profile credentials

When deployed on EC2, make sure the instance has an IAM role with permission to access the S3 bucket. 