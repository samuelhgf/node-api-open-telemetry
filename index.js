// Setup OpenTelemetry as early as possible
const { setupTracing } = require('./tracing');
setupTracing();

const express = require('express');
const AWSXRay = require('aws-xray-sdk');
const http = require('http');
const { listS3Objects } = require('./s3-client');
const { getUsers } = require('./db-client');
const { trace } = require('@opentelemetry/api');

// Initialize Express
const app = express();

// Configure X-Ray
AWSXRay.captureHTTPsGlobal(http);
app.use(AWSXRay.express.openSegment('hello-world-api'));

// Routes
app.get('/', (req, res) => {
    res.send('Hello World!');
});

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK' });
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
    console.error(err.stack);
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