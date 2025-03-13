const express = require('express');
const AWSXRay = require('aws-xray-sdk');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { OTLPMetricExporter } = require('@opentelemetry/exporter-metrics-otlp-http');
const { Resource } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');
const { NodeTracerProvider } = require('@opentelemetry/sdk-trace-node');
const { BasicTracerProvider, SimpleSpanProcessor } = require('@opentelemetry/sdk-trace-base');
const { MeterProvider } = require('@opentelemetry/sdk-metrics');
const { ExpressInstrumentation } = require('@opentelemetry/instrumentation-express');
const { HttpInstrumentation } = require('@opentelemetry/instrumentation-http');
const { registerInstrumentations } = require('@opentelemetry/instrumentation');

// Initialize X-Ray
AWSXRay.captureHTTPsGlobal(require('http'));
const app = express();
AWSXRay.express.openSegment('hello-world-api');

// Configure OpenTelemetry
const resource = new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'hello-world-api',
    [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
});

// Setup tracing
const traceExporter = new OTLPTraceExporter({
    url: 'http://localhost:4318/v1/traces',
});

const tracerProvider = new NodeTracerProvider({ resource });
tracerProvider.addSpanProcessor(new SimpleSpanProcessor(traceExporter));
tracerProvider.register();

// Setup metrics
const metricExporter = new OTLPMetricExporter({
    url: 'http://localhost:4318/v1/metrics',
});

const meterProvider = new MeterProvider({ resource });
meterProvider.addMetricReader(metricExporter);

// Register instrumentations
registerInstrumentations({
    tracerProvider,
    instrumentations: [
        new HttpInstrumentation(),
        new ExpressInstrumentation(),
    ],
});

// Create a counter metric
const meter = meterProvider.getMeter('hello-world-metrics');
const requestCounter = meter.createCounter('http.requests', {
    description: 'Count of HTTP requests',
});

// Middleware to count requests
app.use((req, res, next) => {
    requestCounter.add(1, {
        route: req.path,
        method: req.method,
    });
    next();
});

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

AWSXRay.express.closeSegment();

const PORT = process.env.PORT || 3003;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});