# LLM Observability with Langfuse

This document describes the LLM observability setup for tracking token usage, costs, and request/response data in the Job Apply Assistant.

## Overview

We use **Langfuse** for comprehensive LLM observability, providing:

- Token counting and cost tracking
- Request/response logging
- Performance metrics (latency)
- Model usage analytics
- Error tracking

## Setup

### 1. Install Dependencies

```bash
npm install langfuse
```

### 2. Environment Configuration

Add the following environment variables to your `.env` file:

```bash
# Langfuse Configuration
LANGFUSE_PUBLIC_KEY=pk_lf_your_public_key_here
LANGFUSE_SECRET_KEY=sk_lf_your_secret_key_here
LANGFUSE_BASE_URL=https://cloud.langfuse.com  # or your self-hosted instance
```

### 3. Get Langfuse API Keys

#### Option A: Langfuse Cloud (Recommended)

1. Sign up at [https://cloud.langfuse.com](https://cloud.langfuse.com)
2. Create a new project
3. Go to Settings → API Keys
4. Copy your Public Key and Secret Key

#### Option B: Self-Hosted

1. Deploy Langfuse using Docker: [Self-hosting Guide](https://langfuse.com/docs/deployment/self-host)
2. Set `LANGFUSE_BASE_URL` to your instance URL
3. Create API keys in your instance

## Architecture

### Core Components

1. **LLMObservabilityService** (`src/job/services/llm/llm-observability.service.ts`)

   - Wraps LLM calls with tracking
   - Calculates costs and token usage
   - Stores metrics locally and in Langfuse

2. **LLMMetricsController** (`src/job/controllers/llm-metrics.controller.ts`)

   - REST API for accessing metrics
   - Provides summary statistics

3. **Instrumented Services**
   - `JobRelevanceService` - Tracks OpenAI job analysis calls
   - `LLMScraperImpl` - Tracks web scraping LLM operations

## Usage

### Tracking OpenAI Calls

```typescript
const { result, metrics } = await this.llmObservabilityService.trackOpenAICall(
  () => this.openai.chat.completions.create({
    model: 'gpt-4',
    messages: [...],
  }),
  {
    name: 'job_relevance_analysis',
    tags: ['job-analysis', 'relevance'],
    metadata: { jobTitle: 'Software Engineer' },
  },
  {
    model: 'gpt-4',
    messages: [...],
  }
);
```

### Tracking LLM Scraper Calls

```typescript
const { result, metrics } =
  await this.llmObservabilityService.trackLLMScraperCall(
    () => this.scraper.run(page, schema, options),
    {
      name: 'job_listing_extraction',
      tags: ['scraping', 'data-extraction'],
      url: 'https://example.com/jobs',
      schema: 'JobListingSchema',
    },
  );
```

## API Endpoints

### Get Recent Metrics

```
GET /api/llm-metrics?limit=50
```

Returns recent LLM call metrics including:

- Request ID and timestamp
- Model used
- Token counts (prompt, completion, total)
- Cost calculation
- Latency

### Get Metrics Summary

```
GET /api/llm-metrics/summary
```

Returns aggregated statistics:

- Total calls and tokens
- Total estimated cost
- Average latency
- Per-model breakdown

## Metrics Collected

### Per-Call Metrics

- **Request ID**: Unique identifier for each call
- **Model**: LLM model used (e.g., gpt-4, gpt-3.5-turbo)
- **Token Usage**: Prompt tokens, completion tokens, total tokens
- **Cost**: Estimated cost based on current OpenAI pricing
- **Latency**: Request duration in milliseconds
- **Timestamp**: When the request was made

### Langfuse Traces

- **Traces**: High-level operations (e.g., job relevance analysis)
- **Generations**: Individual LLM calls with full context
- **Spans**: Sub-operations (e.g., web scraping)
- **Tags**: Categorization for filtering
- **Metadata**: Additional context (job titles, URLs, etc.)

## Cost Calculation

Costs are calculated based on OpenAI's current pricing:

| Model         | Input (per 1K tokens) | Output (per 1K tokens) |
| ------------- | --------------------- | ---------------------- |
| GPT-4         | $0.03                 | $0.06                  |
| GPT-4 Turbo   | $0.01                 | $0.03                  |
| GPT-3.5 Turbo | $0.001                | $0.002                 |

_Note: Pricing is hardcoded and should be updated when OpenAI changes their rates._

## Monitoring and Alerts

### Langfuse Dashboard

- View traces and generations in real-time
- Analyze token usage patterns
- Monitor costs and performance
- Set up alerts for high usage

### Local Metrics

- In-memory storage of recent metrics (last 1000 calls)
- REST API for custom monitoring integrations
- Structured logging with metrics context

## Best Practices

1. **Tagging**: Use consistent tags for filtering and analysis
2. **Metadata**: Include relevant context (job titles, URLs, user IDs)
3. **Error Handling**: All LLM calls are wrapped with proper error tracking
4. **Performance**: Metrics collection adds minimal overhead (~1-2ms)
5. **Privacy**: Avoid logging sensitive data in metadata

## Troubleshooting

### Common Issues

1. **Missing API Keys**: Service falls back to local-only metrics
2. **Network Issues**: Langfuse calls are non-blocking
3. **High Memory Usage**: Metrics are pruned automatically (1000 limit)

### Debugging

Enable debug logging to see detailed metrics:

```bash
LOG_LEVEL=debug npm run start:dev
```

### Validation

Test the setup:

```bash
# Check if metrics are being collected
curl http://localhost:3000/api/llm-metrics/summary

# Trigger a job analysis to generate metrics
curl -X POST http://localhost:3000/api/jobs/discover
```

## Future Enhancements

- [ ] Real-time metrics streaming
- [ ] Custom cost models for different providers
- [ ] Performance regression detection
- [ ] Automated cost optimization suggestions
- [ ] Integration with monitoring tools (Grafana, DataDog)
