const { MeterProvider } = require('@opentelemetry/sdk-metrics');
const { Resource } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');
const { OTLPMetricExporter } = require('@opentelemetry/exporter-metrics-otlp-http');

// Create a meter provider with a custom namespace
const resource = new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'node-api',
    'custom.namespace': 'MyCustomNamespace' // This will be used in AWS X-Ray
});

// Create the meter provider
const meterProvider = new MeterProvider({
    resource: resource,
});

// Configure the metric exporter
const metricExporter = new OTLPMetricExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/metrics',
});

// Add the metric exporter to the meter provider
meterProvider.addMetricReader(metricExporter);

// Create a meter instance
const meter = meterProvider.getMeter('node-api-metrics');

// Example metrics
const requestCounter = meter.createCounter({
    name: 'http_requests_total',
    description: 'Total number of HTTP requests',
    unit: '1'
});

const responseTimeHistogram = meter.createHistogram({
    name: 'http_response_time_seconds',
    description: 'HTTP response time in seconds',
    unit: 's'
});

const activeUsersGauge = meter.createUpDownCounter({
    name: 'active_users',
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