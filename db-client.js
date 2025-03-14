const sqlite3 = require('sqlite3').verbose();
const { trace } = require('@opentelemetry/api');
const path = require('path');

// Path to SQLite database file
const dbPath = path.join(__dirname, 'users.db');

// Create a database connection
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error connecting to SQLite database:', err.message);
    } else {
        console.log('Connected to SQLite database');
        // Create users table if it doesn't exist
        db.run(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL UNIQUE,
                email TEXT UNIQUE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `, (err) => {
            if (err) {
                console.error('Error creating users table:', err.message);
            } else {
                console.log('Users table ready');
                // Insert some sample data
                insertSampleUsers();
            }
        });
    }
});

// Function to insert sample users
function insertSampleUsers() {
    const users = [
        { username: 'john_doe', email: 'john@example.com' },
        { username: 'jane_smith', email: 'jane@example.com' },
        { username: 'bob_johnson', email: 'bob@example.com' }
    ];

    const stmt = db.prepare('INSERT OR IGNORE INTO users (username, email) VALUES (?, ?)');

    users.forEach(user => {
        stmt.run(user.username, user.email);
    });

    stmt.finalize();
    console.log('Sample users inserted');
}

// Function to get all users with OpenTelemetry tracing
async function getUsers() {
    // Get tracer from OpenTelemetry API
    const tracer = trace.getTracer('sqlite-operations');

    // Create a span for the database operation
    return tracer.startActiveSpan('sqlite.query.users', async (span) => {
        try {
            // Add attributes to the span
            span.setAttribute('db.system', 'sqlite');
            span.setAttribute('db.name', 'users.db');
            span.setAttribute('db.operation', 'SELECT');
            span.setAttribute('db.statement', 'SELECT * FROM users');
            span.setAttribute('db.table', 'users');

            // Execute query with promise wrapper
            const result = await new Promise((resolve, reject) => {
                db.all('SELECT * FROM users', [], (err, rows) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve({
                            success: true,
                            users: rows,
                            count: rows.length
                        });
                    }
                });
            });

            // Add result information to the span
            span.setAttribute('db.result.count', result.count || 0);
            span.setAttribute('db.success', result.success);

            return result;
        } catch (error) {
            // Record any exceptions
            span.setStatus({ code: trace.SpanStatusCode.ERROR });
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
}

// Close the database connection on process exit
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            console.error('Error closing SQLite database:', err.message);
        } else {
            console.log('SQLite database connection closed');
        }
        process.exit(0);
    });
});

module.exports = {
    getUsers
}; 