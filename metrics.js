const { MeterProvider, PeriodicExportingMetricReader } = require('@opentelemetry/sdk-metrics');
const { Resource } = require('@opentelemetry/resources');
const { SemanticResourceAttributes, SEMATTRS_AWS_DYNAMODB_ATTRIBUTES_TO_GET, ATTR_SERVICE_NAME } = require('@opentelemetry/semantic-conventions');
const { OTLPMetricExporter } = require('@opentelemetry/exporter-metrics-otlp-http');

// Create a meter provider with a custom namespace
const resource = new Resource({
    [ATTR_SERVICE_NAME.SERVICE_NAME]: 'node-api',
    'custom.namespace': 'MyCustomNamespace' // This will be used in AWS X-Ray
});

// Configure the metric exporter
const metricExporter = new OTLPMetricExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/metrics',
});

// Create a metric reader that exports metrics every 1000ms
const metricReader = new PeriodicExportingMetricReader({
    exporter: metricExporter,
    exportIntervalMillis: 1000,
});

// Create the meter provider
const meterProvider = new MeterProvider({
    resource: resource,
    readers: [metricReader]
});

// Create a meter instance
const meter = meterProvider.getMeter('node-api-metrics');

// Example metrics
const requestCounter = meter.createCounter('http.server.requests', {
    description: 'Total number of HTTP requests',
    unit: '1'
});

const responseTimeHistogram = meter.createHistogram('http.server.duration', {
    description: 'HTTP response time in seconds',
    unit: 's'
});

const activeUsersGauge = meter.createUpDownCounter('users.active', {
    description: 'Number of active users',
    unit: '1'
});

// Export the meter and metrics for use in other files
module.exports = {
    meter,
    requestCounter,
    responseTimeHistogram,
    activeUsersGauge,
    meterProvider
}; 