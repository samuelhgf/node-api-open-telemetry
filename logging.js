// OpenTelemetry logging implementation
const { logs } = require('@opentelemetry/api-logs');
const { LoggerProvider, BatchLogRecordProcessor } = require('@opentelemetry/sdk-logs');
const { OTLPLogExporter } = require('@opentelemetry/exporter-logs-otlp-http');
const { Resource } = require('@opentelemetry/resources');
const { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION, ATTR_DEPLOYMENT_ENVIRONMENT } = require('@opentelemetry/semantic-conventions');
const http = require('http');
const https = require('https');
const AWSXRay = require('aws-xray-sdk-core');

// Global provider reference
let loggerProvider = null;

// Initialize logging with OTLP exporter
function setupLogging() {
    if (loggerProvider) {
        return loggerProvider;
    }

    try {
        // Create a resource that identifies your service
        const resource = new Resource({
            [ATTR_SERVICE_NAME]: 'hello-world-api',
            [ATTR_SERVICE_VERSION]: '1.0.0',
            [ATTR_DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
        });

        // Store original request methods
        const originalHttpRequest = http.request;
        const originalHttpsRequest = https.request;

        // Create an OTLP exporter for logs
        const logExporter = new OTLPLogExporter({
            url: process.env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT || 'http://localhost:4318/v1/logs',
            headers: {}, // Add any headers if needed (e.g., authentication)
            // Use custom HTTP handler to bypass X-Ray
            httpCustomHandler: (url, options, callback) => {
                // Temporarily restore original HTTP methods for the exporter
                http.request = originalHttpRequest;
                https.request = originalHttpsRequest;

                // Make the request
                const req = http.request(url, options, callback);

                // Restore X-Ray patched methods
                http.request = AWSXRay.captureHTTPs(http).request;
                https.request = AWSXRay.captureHTTPs(https).request;

                return req;
            }
        });

        // Create a logger provider
        loggerProvider = new LoggerProvider({
            resource: resource,
        });

        // Add the exporter to the provider with batching
        loggerProvider.addLogRecordProcessor(new BatchLogRecordProcessor(logExporter));

        // Register as the global logger provider
        logs.setGlobalLoggerProvider(loggerProvider);

        console.log('OpenTelemetry logging initialized with OTLP exporter');

        // Set up graceful shutdown
        process.on('SIGTERM', () => {
            loggerProvider.shutdown()
                .then(() => console.log('Logger provider shut down'))
                .catch(error => console.log('Error shutting down logger provider', error))
                .finally(() => process.exit(0));
        });

        return loggerProvider;
    } catch (error) {
        console.error('Failed to initialize OpenTelemetry logging:', error);
        // Return a fallback provider if initialization fails
        loggerProvider = new LoggerProvider();
        return loggerProvider;
    }
}

// Get a logger instance
function getLogger(name = 'default') {
    // Ensure provider is initialized
    if (!loggerProvider) {
        setupLogging();
    }
    return logs.getLogger(name);
}

// Mapping of log levels to severity numbers
const LOG_SEVERITY = {
    TRACE: 1,
    DEBUG: 5,
    INFO: 9,
    WARN: 13,
    ERROR: 17,
    FATAL: 21
};

// Helper function to create correlated logs with trace context
function correlatedLog(span, level, message, additionalAttributes = {}) {
    try {
        // Ensure provider is initialized
        if (!loggerProvider) {
            setupLogging();
        }

        const spanContext = span.spanContext();
        const traceId = spanContext.traceId;
        const spanId = spanContext.spanId;

        // Get logger for the current module/component
        const logger = getLogger('app');

        // Normalized level
        const normalizedLevel = level.toUpperCase();
        const severity = LOG_SEVERITY[normalizedLevel] || LOG_SEVERITY.INFO;

        // Create log record with trace context
        const attributes = {
            ...additionalAttributes,
            'trace_id': traceId,
            'span_id': spanId,
        };

        // Log through OTLP
        logger.emit({
            severityNumber: severity,
            severityText: normalizedLevel,
            body: message,
            attributes: attributes
        });

        // Also log to console for local debugging
        // This doesn't affect OTLP logs but provides visibility during development
        const consoleLog = {
            level: normalizedLevel,
            message,
            timestamp: new Date().toISOString(),
            'trace.id': traceId,
            'span.id': spanId,
            ...additionalAttributes
        };

        // Use appropriate console method based on level
        switch (normalizedLevel) {
            case 'ERROR':
            case 'FATAL':
                console.error(JSON.stringify(consoleLog));
                break;
            case 'WARN':
                console.warn(JSON.stringify(consoleLog));
                break;
            case 'DEBUG':
                console.debug(JSON.stringify(consoleLog));
                break;
            default:
                console.log(JSON.stringify(consoleLog));
        }
    } catch (error) {
        // Fallback to standard console if there's an issue with OTLP logging
        console.error('Error in correlatedLog:', error);
        console.log(`${level} - ${message}`, additionalAttributes);
    }
}

module.exports = {
    correlatedLog,
    getLogger,
    setupLogging,
    // Export the provider getter for use in other modules
    get loggerProvider() {
        return loggerProvider;
    }
}; 