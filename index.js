// Initialize OpenTelemetry - this should come before any other imports
require('./tracing');

const express = require('express');
const { metrics } = require('@opentelemetry/api');
const app = express();
const PORT = 3003;

// Create some custom metrics
const requestCounter = metrics.getMeter('example-meter').createCounter('requests', {
    description: 'Count of HTTP requests',
});

// Middleware to parse JSON body
app.use(express.json());

// Middleware to count all requests
app.use((req, res, next) => {
    requestCounter.add(1, {
        path: req.path,
        method: req.method,
    });
    next();
});

// Root route
app.get('/', (req, res) => {
    res.json({
        message: 'Hello, World!',
        status: 'success'
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'UP',
        timestamp: new Date().toISOString()
    });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log('OpenTelemetry metrics and traces enabled and sending to AWS Collector');
}); 