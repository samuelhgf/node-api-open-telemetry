const AWSXRay = require('aws-xray-sdk');
// Set to completely ignore missing context errors
AWSXRay.setContextMissingStrategy("IGNORE_ERROR");
AWSXRay.setDaemonAddress('dummy:2000');

// Setup OpenTelemetry as early as possible
const { setupTracing } = require('./tracing');
setupTracing();

// Initialize the logging early
const { correlatedLog, setupLogging } = require('./logging');
setupLogging();

const express = require('express');
const http = require('http');
const { listS3Objects } = require('./s3-client');
const { getUsers } = require('./db-client');
const { trace, context, SpanStatusCode } = require('@opentelemetry/api');
const path = require('path');



// Initialize Express
const app = express();

// Configure X-Ray with exclusions for OTLP endpoints to prevent recursive tracing
// This prevents X-Ray from trying to trace OpenTelemetry's own HTTP calls
const xrayConfig = {
    captureHTTPsGlobal: {
        ignorePatterns: [
            // Exclude OpenTelemetry collector endpoints to prevent context missing errors
            '*/v1/traces*',
            '*/v1/logs*',
            '*/v1/metrics*',
            '*:4317*',  // gRPC port for OTLP
            '*:4318*'   // HTTP port for OTLP
        ],
        captureResponse: true
    }
};

// Apply the config to X-Ray
// AWSXRay.setContextMissingStrategy('LOG_ERROR');
// AWSXRay.setContextMissingStrategy('IGNORE_ERROR');

// OPTION 1: Use inline sampling rules (default)
const samplingRules = {
    version: 2,
    rules: [
        {
            description: "Default",
            host: "*",
            http_method: "*",
            url_path: "*",
            fixed_target: 1,
            rate: 0.1
        }
    ],
    default: {
        fixed_target: 1,
        rate: 0.1
    }
};

// Apply the inline sampling rules
AWSXRay.middleware.setSamplingRules(samplingRules);

// OPTION 2: Load sampling rules from a file (alternative approach)
// Uncomment the following line and comment out the inline rules above if you prefer using a file
// AWSXRay.middleware.setSamplingRules(path.join(__dirname, 'sampling-rules.json'));

// Configure HTTP/HTTPS capture with our exclusions
AWSXRay.captureHTTPsGlobal(http, xrayConfig);
app.use(AWSXRay.express.openSegment('hello-world-api'));

// Routes
app.get('/', (req, res) => {
    res.send('Hello World!');
});

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK' });
});

// New endpoint that intentionally throws an exception for monitoring
app.get('/error', async (req, res, next) => {
    // Get tracer from OpenTelemetry API
    const tracer = trace.getTracer('error-demonstration');

    // Create a span for the error demonstration
    tracer.startActiveSpan('intentional-error', async (span) => {
        try {
            // Add attributes to the span
            span.setAttribute('error.type', 'DemoException');
            span.setAttribute('error.demonstration', true);
            span.setAttribute('request.id', req.headers['x-request-id'] || 'unknown');

            // Log with correlation IDs using OTLP
            correlatedLog(span, 'INFO', 'Starting error demonstration endpoint', {
                path: '/error',
                method: req.method,
                requestId: req.headers['x-request-id'] || 'unknown',
                userAgent: req.headers['user-agent'],
                // Add AWS CloudWatch-specific attributes for correlation
                'aws.log_group': '/aws/otel/hello-world-api',
                'aws.log_stream': 'otlp-stream'
            });

            // Log something before the error with correlation
            correlatedLog(span, 'WARN', 'About to throw a demonstration exception', {
                errorType: 'DemoException',
                operation: 'intentional-error',
                // Add AWS CloudWatch-specific attributes
                'aws.log_group': '/aws/otel/hello-world-api',
                'aws.log_stream': 'otlp-stream'
            });

            // Throw a custom error
            const error = new Error('This is an intentional error for monitoring demonstration');
            error.name = 'DemoException';
            error.code = 'DEMO_ERROR_CODE';

            // Log the error with correlation
            correlatedLog(span, 'ERROR', 'Demonstration exception thrown', {
                errorName: error.name,
                errorCode: error.code,
                errorMessage: error.message,
                stackTrace: error.stack,
                // Add AWS CloudWatch-specific attributes
                'aws.log_group': '/aws/otel/hello-world-api',
                'aws.log_stream': 'otlp-stream'
            });

            // Record exception in the span and set error status
            span.setStatus({ code: SpanStatusCode.ERROR });
            span.recordException(error);

            // End the span before throwing
            span.end();

            // Throw the error to be caught by Express error handler
            throw error;
        } catch (error) {
            // End the span if not ended in the try block
            if (span.isRecording()) {
                // Log the caught error with correlation
                correlatedLog(span, 'ERROR', 'Caught exception in error endpoint', {
                    errorName: error.name,
                    errorMessage: error.message,
                    stackTrace: error.stack,
                    // Add AWS CloudWatch-specific attributes
                    'aws.log_group': '/aws/otel/hello-world-api',
                    'aws.log_stream': 'otlp-stream'
                });

                span.end();
            }

            // Pass the error to the Express error handler
            next(error);
        }
    });
});

// New endpoint to interact with S3 and create an OTEL trace
app.get('/s3-files', async (req, res) => {
    // Get tracer from OpenTelemetry API
    const tracer = trace.getTracer('s3-interaction');

    // Create a span for the S3 operation
    const result = await tracer.startActiveSpan('list-s3-objects', async (span) => {
        try {
            // Add attributes to the span
            span.setAttribute('s3.bucket', 'poc-ai-files');
            span.setAttribute('s3.operation', 'listObjects');

            // Call the S3 service
            const s3Response = await listS3Objects('poc-ai-files', '');

            // Add result information to the span
            span.setAttribute('s3.success', s3Response.success);
            span.setAttribute('s3.object_count', s3Response.count || 0);

            if (!s3Response.success) {
                span.setStatus({ code: trace.SpanStatusCode.ERROR });
                span.recordException(s3Response.error);
            }

            return s3Response;
        } catch (error) {
            // Record any exceptions
            span.setStatus({ code: trace.SpanStatusCode.ERROR });
            span.recordException(error);
            throw error;
        } finally {
            // End the span
            span.end();
        }
    });

    // Send the response
    if (result.success) {
        res.status(200).json(result);
    } else {
        res.status(500).json(result);
    }
});

// New endpoint to fetch todos from JSONPlaceholder API with tracing
app.get('/todos', async (req, res) => {
    // Get tracer from OpenTelemetry API
    const tracer = trace.getTracer('external-api-interaction');

    // Create a span for the external API call
    const result = await tracer.startActiveSpan('fetch-todos', async (span) => {
        try {
            // Add attributes to the span
            span.setAttribute('http.method', 'GET');
            span.setAttribute('http.url', 'https://jsonplaceholder.typicode.com/todos');
            span.setAttribute('external.service', 'JSONPlaceholder');
            span.setAttribute('external.operation', 'getTodos');

            // Make the HTTP request to the external API
            const response = await new Promise((resolve, reject) => {
                const req = http.get('http://jsonplaceholder.typicode.com/todos', (res) => {
                    let data = '';

                    // Add response attributes to span
                    span.setAttribute('http.status_code', res.statusCode);

                    res.on('data', (chunk) => {
                        data += chunk;
                    });

                    res.on('end', () => {
                        try {
                            const parsedData = JSON.parse(data);
                            resolve({
                                success: true,
                                data: parsedData,
                                count: parsedData.length
                            });
                        } catch (e) {
                            reject(e);
                        }
                    });
                });

                req.on('error', (error) => {
                    reject(error);
                });
            });

            // Add result information to the span
            span.setAttribute('todos.count', response.count || 0);
            span.setAttribute('request.success', true);

            return response;
        } catch (error) {
            // Record any exceptions
            span.setStatus({ code: trace.SpanStatusCode.ERROR });
            span.setAttribute('request.success', false);
            span.recordException(error);

            return {
                success: false,
                error: error.message
            };
        } finally {
            // End the span
            span.end();
        }
    });

    // Send the response
    if (result.success) {
        res.status(200).json(result);
    } else {
        res.status(500).json(result);
    }
});

// New endpoint to fetch users from SQLite with tracing
app.get('/users', async (req, res) => {
    try {
        // The getUsers function already has built-in tracing
        const result = await getUsers();

        const tracer = trace.getTracer('users-api');
        const span = tracer.startSpan('get-users');
        correlatedLog(span, 'INFO', 'Successfully fetched users from database', {
            operation: 'get-users',
            // Add AWS CloudWatch-specific attributes
            'aws.log_group': '/aws/otel/hello-world-api',
            'aws.log_stream': 'otlp-stream'
        });
        span.end();

        if (result.success) {
            res.status(200).json(result);
        } else {
            res.status(500).json({ error: result.error });
        }
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: error.message });
    }
});

// Error handler
app.use((err, req, res, next) => {
    // Get current active span if available
    const activeSpan = trace.getActiveSpan();

    if (activeSpan) {
        // Log the error with trace correlation
        correlatedLog(activeSpan, 'ERROR', 'Express error handler caught an error', {
            errorName: err.name,
            errorMessage: err.message,
            stackTrace: err.stack,
            path: req.path,
            method: req.method,
            // Add AWS CloudWatch-specific attributes
            'aws.log_group': '/aws/otel/hello-world-api',
            'aws.log_stream': 'otlp-stream'
        });
    } else {
        // Fallback when no active span is available
        console.error('Error in request:', {
            error: err.message,
            stack: err.stack,
            path: req.path,
            method: req.method
        });
    }

    res.status(500).send('Something broke!');
});

// Close X-Ray segment
app.use(AWSXRay.express.closeSegment());

const PORT = process.env.PORT || 3003;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`S3 files endpoint available at: http://localhost:${PORT}/s3-files`);
    console.log(`Users endpoint available at: http://localhost:${PORT}/users`);
    console.log(`Todos endpoint available at: http://localhost:${PORT}/todos`);
});