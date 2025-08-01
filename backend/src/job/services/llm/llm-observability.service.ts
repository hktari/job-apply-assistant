import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Langfuse } from 'langfuse';
import OpenAI from 'openai';

export interface LLMMetrics {
  requestId: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cost?: number;
  latency: number;
  timestamp: Date;
}

export interface LLMCallOptions {
  name: string;
  userId?: string;
  sessionId?: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

@Injectable()
export class LLMObservabilityService {
  private readonly logger = new Logger(LLMObservabilityService.name);
  private langfuse: Langfuse | null = null;
  private metricsStore: LLMMetrics[] = [];

  constructor(private configService: ConfigService) {
    this.initializeLangfuse();
  }

  private initializeLangfuse() {
    const publicKey = this.configService.get<string>('LANGFUSE_PUBLIC_KEY');
    const secretKey = this.configService.get<string>('LANGFUSE_SECRET_KEY');
    const baseUrl = this.configService.get<string>('LANGFUSE_BASE_URL');

    if (publicKey && secretKey) {
      this.langfuse = new Langfuse({
        publicKey,
        secretKey,
        baseUrl,
      });
      this.logger.log('Langfuse observability initialized');
    } else {
      this.logger.warn('Langfuse not configured - using local metrics only');
    }
  }

  async trackOpenAICall<T>(
    openaiCall: () => Promise<OpenAI.Chat.Completions.ChatCompletion>,
    options: LLMCallOptions,
    input: {
      model: string;
      messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[];
      temperature?: number;
      maxTokens?: number;
    },
  ): Promise<{
    result: OpenAI.Chat.Completions.ChatCompletion;
    metrics: LLMMetrics;
  }> {
    const startTime = Date.now();
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create Langfuse trace if available
    const trace = this.langfuse?.trace({
      name: options.name,
      userId: options.userId,
      sessionId: options.sessionId,
      tags: options.tags,
      metadata: options.metadata,
    });

    // Create generation span
    const generation = trace?.generation({
      name: `${options.name}_generation`,
      model: input.model,
      modelParameters: {
        temperature: input.temperature || null,
        maxTokens: input.maxTokens || null,
      },
      input: input.messages,
    });

    try {
      this.logger.debug(
        `Starting LLM call: ${options.name} with model ${input.model}`,
      );

      const result = await openaiCall();
      const endTime = Date.now();
      const latency = endTime - startTime;

      // Extract token usage
      const usage = result.usage;
      const metrics: LLMMetrics = {
        requestId,
        model: input.model,
        promptTokens: usage?.prompt_tokens || 0,
        completionTokens: usage?.completion_tokens || 0,
        totalTokens: usage?.total_tokens || 0,
        cost: this.calculateCost(input.model, usage),
        latency,
        timestamp: new Date(startTime),
      };

      // Update Langfuse generation
      generation?.end({
        output: result.choices[0]?.message?.content,
        usage: {
          promptTokens: metrics.promptTokens,
          completionTokens: metrics.completionTokens,
          totalTokens: metrics.totalTokens,
        },
      });

      // Store metrics locally
      this.metricsStore.push(metrics);
      this.pruneMetrics();

      this.logger.log(`LLM call completed: ${options.name}`, {
        model: input.model,
        tokens: metrics.totalTokens,
        cost: metrics.cost,
        latency: `${latency}ms`,
      });

      return { result, metrics };
    } catch (error) {
      const endTime = Date.now();
      const latency = endTime - startTime;

      // Log error to Langfuse
      generation?.end({
        level: 'ERROR',
        statusMessage: error instanceof Error ? error.message : 'Unknown error',
      });

      this.logger.error(`LLM call failed: ${options.name}`, {
        error: error instanceof Error ? error.message : error,
        latency: `${latency}ms`,
      });

      throw error;
    }
  }

  async trackLLMScraperCall<T>(
    scraperCall: () => Promise<T>,
    options: LLMCallOptions & { url: string; schema: string },
  ): Promise<{ result: T; metrics: Partial<LLMMetrics> }> {
    const startTime = Date.now();
    const requestId = `scraper_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const trace = this.langfuse?.trace({
      name: options.name,
      userId: options.userId,
      sessionId: options.sessionId,
      tags: [...(options.tags || []), 'scraper'],
      metadata: {
        ...options.metadata,
        url: options.url,
        schema: options.schema,
      },
    });

    const span = trace?.span({
      name: `${options.name}_scraping`,
      input: { url: options.url, schema: options.schema },
    });

    try {
      this.logger.debug(
        `Starting LLM scraper call: ${options.name} for URL ${options.url}`,
      );

      const result = await scraperCall();
      const endTime = Date.now();
      const latency = endTime - startTime;

      const metrics: Partial<LLMMetrics> = {
        requestId,
        model: 'llm-scraper', // We don't have direct access to the model from scraper
        latency,
        timestamp: new Date(startTime),
      };

      span?.end({
        output: result,
      });

      this.logger.log(`LLM scraper call completed: ${options.name}`, {
        url: options.url,
        latency: `${latency}ms`,
      });

      return { result, metrics };
    } catch (error) {
      const endTime = Date.now();
      const latency = endTime - startTime;

      span?.end({
        level: 'ERROR',
        statusMessage: error instanceof Error ? error.message : 'Unknown error',
      });

      this.logger.error(`LLM scraper call failed: ${options.name}`, {
        error: error instanceof Error ? error.message : error,
        url: options.url,
        latency: `${latency}ms`,
      });

      throw error;
    }
  }

  getMetrics(limit = 100): LLMMetrics[] {
    return this.metricsStore.slice(-limit);
  }

  getMetricsSummary(): {
    totalCalls: number;
    totalTokens: number;
    totalCost: number;
    averageLatency: number;
    modelBreakdown: Record<
      string,
      { calls: number; tokens: number; cost: number }
    >;
  } {
    const metrics = this.metricsStore;
    const modelBreakdown: Record<
      string,
      { calls: number; tokens: number; cost: number }
    > = {};

    let totalTokens = 0;
    let totalCost = 0;
    let totalLatency = 0;

    for (const metric of metrics) {
      totalTokens += metric.totalTokens;
      totalCost += metric.cost || 0;
      totalLatency += metric.latency;

      if (!modelBreakdown[metric.model]) {
        modelBreakdown[metric.model] = { calls: 0, tokens: 0, cost: 0 };
      }
      modelBreakdown[metric.model].calls++;
      modelBreakdown[metric.model].tokens += metric.totalTokens;
      modelBreakdown[metric.model].cost += metric.cost || 0;
    }

    return {
      totalCalls: metrics.length,
      totalTokens,
      totalCost,
      averageLatency: metrics.length > 0 ? totalLatency / metrics.length : 0,
      modelBreakdown,
    };
  }

  private calculateCost(
    model: string,
    usage?: OpenAI.Completions.CompletionUsage,
  ): number {
    if (!usage) return 0;

    // OpenAI pricing (as of 2024) - update as needed
    const pricing: Record<string, { prompt: number; completion: number }> = {
      'gpt-4': { prompt: 0.03, completion: 0.06 },
      'gpt-4-turbo': { prompt: 0.01, completion: 0.03 },
      'gpt-3.5-turbo': { prompt: 0.001, completion: 0.002 },
    };

    const modelPricing = pricing[model] || pricing['gpt-4']; // Default to GPT-4 pricing

    return (
      (usage.prompt_tokens / 1000) * modelPricing.prompt +
      (usage.completion_tokens / 1000) * modelPricing.completion
    );
  }

  private pruneMetrics() {
    // Keep only last 1000 metrics to prevent memory issues
    if (this.metricsStore.length > 1000) {
      this.metricsStore = this.metricsStore.slice(-1000);
    }
  }

  async flush() {
    if (this.langfuse) {
      await this.langfuse.flushAsync();
    }
  }

  onModuleDestroy() {
    this.flush();
  }
}
