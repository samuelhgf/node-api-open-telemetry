const express = require('express');
const app = express();
const PORT = 3003;

// Middleware to parse JSON body
app.use(express.json());

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
}); 