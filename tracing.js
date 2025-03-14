const { NodeSDK } = require('@opentelemetry/sdk-node');
const { Resource } = require('@opentelemetry/resources');
const { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION, ATTR_DEPLOYMENT_ENVIRONMENT } = require('@opentelemetry/semantic-conventions');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { ExpressInstrumentation } = require('@opentelemetry/instrumentation-express');
const { HttpInstrumentation } = require('@opentelemetry/instrumentation-http');
const { AwsInstrumentation } = require('@opentelemetry/instrumentation-aws-sdk');
const { loggerProvider } = require('./logging');
// const { http, https } = require('./otel-http');


// This function sets up OpenTelemetry with AWS and Express instrumentations
function setupTracing() {
    try {

        // Store original request methods before X-Ray patching affects them
        // const originalHttpRequest = http.request;
        // const originalHttpsRequest = https.request;

        const traceExporter = new OTLPTraceExporter({
            // This assumes you have an OTLP collector running either locally or in AWS
            // If you're using AWS X-Ray directly, you might need different configuration
            url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',

            // httpCustomHandler: (url, options, callback) => {
            //     return originalHttpRequest(url, options, callback);
            // }

            // httpCustomHandler: (url, options, callback) => {
            //     // Temporarily restore original HTTP methods for the exporter
            //     http.request = originalHttpRequest;
            //     https.request = originalHttpsRequest;

            //     // Make the request
            //     const req = http.request(url, options, callback);

            //     // Restore X-Ray patched methods
            //     http.request = AWSXRay.captureHTTPs(http).request;
            //     https.request = AWSXRay.captureHTTPs(https).request;

            //     return req;
            // }
        });

        const sdk = new NodeSDK({
            resource: new Resource({
                [ATTR_SERVICE_NAME]: 'node-api-s3-interaction',
                [ATTR_SERVICE_VERSION]: '1.0.0',
                [ATTR_DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
            }),
            traceExporter,
            instrumentations: [
                // Express instrumentation
                new ExpressInstrumentation(),
                // HTTP calls instrumentation
                new HttpInstrumentation({
                    ignoreOutgoingUrls: [
                        /\/v1\/traces/,
                        /\/v1\/logs/,
                        /\/v1\/metrics/,
                        /:4317/,
                        /:4318/
                    ]
                }),
                // AWS SDK instrumentation for S3 operations
                new AwsInstrumentation({
                    // Configure AWS SDK instrumentation as needed
                    suppressInternalInstrumentation: false,
                }),
                // Note: SQLite operations will be manually instrumented
            ],
        });

        // Initialize the SDK
        sdk.start();
        console.log('OpenTelemetry tracing initialized');

        // Ensure the logger provider is also initialized
        if (loggerProvider) {
            console.log('OpenTelemetry logging provider is active');
        }

        // Gracefully shut down the SDK on process exit
        process.on('SIGTERM', () => {
            sdk.shutdown()
                .then(() => console.log('OpenTelemetry SDK terminated'))
                .catch((error) => console.log('Error terminating OpenTelemetry SDK', error))
                .finally(() => process.exit(0));
        });
    } catch (error) {
        console.error('Failed to initialize OpenTelemetry:', error);
    }
}

module.exports = { setupTracing }; 