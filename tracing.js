const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { OTLPMetricExporter } = require('@opentelemetry/exporter-metrics-otlp-http');
const { Resource } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');

// Configure the OTLP exporter to send telemetry to AWS Collector running on the same EC2 instance
// AWS Collector typically runs on port 4317 for gRPC or 4318 for HTTP
// We're using the HTTP protocol (port 4318) which is the default for the AWS OTel Collector
const traceExporter = new OTLPTraceExporter({
    url: 'http://localhost:4318/v1/traces', // AWS Collector default HTTP endpoint for traces
});

const metricExporter = new OTLPMetricExporter({
    url: 'http://localhost:4318/v1/metrics', // AWS Collector default HTTP endpoint for metrics
});

// Create a Resource that identifies your service
const resource = new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'node-api-service',
    [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
    [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: 'production',
});

// Create and register the SDK
const sdk = new NodeSDK({
    resource,
    traceExporter,
    metricExporter,
    instrumentations: [getNodeAutoInstrumentations()],
});

// Initialize the SDK and register with the OpenTelemetry API
sdk.start();

// Gracefully shut down the SDK on process exit
process.on('SIGTERM', () => {
    sdk.shutdown()
        .then(() => console.log('Tracing and metrics terminated'))
        .catch((error) => console.log('Error terminating tracing and metrics', error))
        .finally(() => process.exit(0));
});

module.exports = sdk; 