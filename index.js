const express = require('express');
const AWSXRay = require('aws-xray-sdk');
const http = require('http');

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
});