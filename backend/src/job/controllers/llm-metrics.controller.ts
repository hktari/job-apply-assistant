import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import {
  LLMObservabilityService,
  LLMMetrics,
} from '../services/llm/llm-observability.service';

@ApiTags('LLM Metrics')
@Controller('api/llm-metrics')
export class LLMMetricsController {
  constructor(
    private readonly llmObservabilityService: LLMObservabilityService,
  ) {}

  @Get('/')
  @ApiOperation({ summary: 'Get recent LLM call metrics' })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of recent metrics to return (default: 100)',
  })
  @ApiResponse({ status: 200, description: 'Returns recent LLM call metrics' })
  getMetrics(@Query('limit') limit?: string): LLMMetrics[] {
    const limitNum = limit ? parseInt(limit, 10) : 100;
    return this.llmObservabilityService.getMetrics(limitNum);
  }

  @Get('/summary')
  @ApiOperation({ summary: 'Get LLM metrics summary' })
  @ApiResponse({
    status: 200,
    description: 'Returns aggregated LLM metrics summary',
  })
  getMetricsSummary() {
    return this.llmObservabilityService.getMetricsSummary();
  }
}
