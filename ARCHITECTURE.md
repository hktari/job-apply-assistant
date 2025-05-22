# Job Application Assistant System Architecture

## Overview

This document outlines the architecture for a Job Application Assistant System that automates the process of finding, filtering, and applying to job postings. The system is designed to be scalable, maintainable, and observable. The system is built using NestJS, a progressive Node.js framework for building efficient and scalable server-side applications.

## System Components

### 1. Job Scraper NestJS Service
- Implemented as NestJS modules and services
- Core components:
  - `JobHuntingService`: Manages job scraping and processing pipeline
  - `JobRelevanceService`: Analyzes job relevance using OpenAI GPT-4
- Uses dependency injection for services (Prisma, JobRelevance, Config)
- Implements NestJS Logger for improved logging
- Scrapes job postings from various sources using Firecrawl
- Performs initial filtering based on relevance
- Stores raw and processed job postings in the database

### 2. Job Verification UI (React)
- Dashboard for human verification
- Shows job details, relevance score, and scraped content
- Allows users to approve/reject jobs
- Provides feedback mechanism to improve filtering

### 3. Application Agent Service
- Processes verified job postings
- Handles application submission
- Manages application status
- Tracks communication

### 4. API Gateway
- Implemented using NestJS controllers
- Single entry point for all services
- Handles authentication/authorization
- Routes requests to appropriate services

### 5. Database
- Prisma ORM for database interactions
- Stores job postings, user profiles, application status
- PostgreSQL database with typed schema

### 6. Message Queue & Scheduling
- NestJS Scheduler for periodic job scraping
- Bull queue for job processing pipeline
- Redis as the message broker
- Features:
  - Scheduled job execution
  - Automatic retries with exponential backoff
  - Dead letter queues for failed jobs
  - Monitoring and observability

## Data Flow

### 1. Scraping Phase
- NestJS Scheduler triggers `JobHuntingService.findJobs()` on a configurable interval
- Error handling:
  - Automatic retries for transient failures
  - Circuit breaker pattern to prevent cascading failures
  - Detailed logging for debugging
- Processing pipeline:
  1. Scrape job listings from configured sources using Firecrawl
  2. Deduplicate jobs against database
  3. Filter by posted date
  4. Analyze relevance using `JobRelevanceService`
  5. Scrape detailed information for relevant jobs
  6. Store in database via Prisma ORM
- Relevant jobs → Verification Queue (Bull queue)

### 2. Verification Phase
- Bull queue consumer processes verification tasks
- Human reviews jobs in React UI
- Queue features:
  - Priority-based processing
  - Concurrency control
  - Job timeout handling
- Approved jobs → Application Queue (Bull queue)
- Rejected jobs → Feedback for ML model (stored in database)

### 3. Application Phase
- Application Agent consumes from Application Queue
- Implements retry mechanism with exponential backoff
- Dead letter queue for failed applications
- Updates job status in database via Prisma ORM
- Metrics collection for monitoring application success rate

## Deployment Architecture

```yaml
version: '3.8'

services:
  # NestJS API Gateway
  api-gateway:
    build: ./job-scrape-agent-nest
    ports:
      - "80:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://user:pass@db:5432/jobs
      - REDIS_URL=redis://redis:6379
      - FIRECRAWL_API_KEY=${FIRECRAWL_API_KEY}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    depends_on:
      - db
      - redis

  # Job Scraper Worker (NestJS)
  job-scraper-worker:
    build: ./job-scrape-agent-nest
    command: npm run start:worker
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://user:pass@db:5432/jobs
      - REDIS_URL=redis://redis:6379
      - FIRECRAWL_API_KEY=${FIRECRAWL_API_KEY}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    depends_on:
      - db
      - redis
    deploy:
      replicas: 2
      restart_policy:
        condition: on-failure
        max_attempts: 3

  # Verification UI (React)
  verification-ui:
    build: ./verification-ui
    environment:
      - REACT_APP_API_URL=/api
    ports:
      - "3000:3000"

  # Application Agent Worker (NestJS)
  application-agent-worker:
    build: ./application-agent-nest
    command: npm run start:worker
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://user:pass@db:5432/jobs
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - redis
    deploy:
      restart_policy:
        condition: on-failure

  # Database
  db:
    image: postgres:14-alpine
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
      - POSTGRES_DB=jobs
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U user -d jobs"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Redis (for Bull queue)
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Bull Dashboard
  bull-dashboard:
    image: deadly0/bull-board
    environment:
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - BULL_PREFIX=bull
    ports:
      - "3002:3000"
    depends_on:
      - redis

  # Monitoring
  prometheus:
    image: prom/prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml

  grafana:
    image: grafana/grafana
    ports:
      - "3001:3000"
    volumes:
      - grafana_data:/var/lib/grafana

volumes:
  postgres_data:
  redis_data:
  grafana_data:
```

## Monitoring and Observability

### 1. Logging
- NestJS Logger with structured JSON format
- Winston transport for log aggregation
- Centralized logging with ELK Stack or Loki
- Log levels (debug, info, warn, error) for different environments

### 2. Metrics
- NestJS Prometheus module for metrics collection
- Bull queue metrics integration
- Grafana for visualization
- Key metrics:
  - Jobs scraped/verified/applied
  - Queue processing metrics (jobs/sec, latency)
  - Success/failure rates with error categorization
  - Processing times for each pipeline stage
  - Queue lengths and backlog monitoring
  - Worker utilization and health

### 3. Bull Dashboard
- Real-time monitoring of job queues
- Job inspection and manual intervention
- Retry management for failed jobs
- Performance analytics

### 4. Alerting
- Prometheus AlertManager integration
- Set up alerts for:
  - Failed scrapes with error pattern detection
  - Queue stalling or excessive backlog
  - Worker failures or crashes
  - Application submission failures
  - System resource usage (CPU, memory, Redis capacity)
  - Error rate thresholds

## Security Considerations

### 1. Authentication/Authorization
- NestJS Guards for route protection
- JWT-based auth for API endpoints using @nestjs/jwt
- Role-based access control with custom decorators
- Secure credential storage using environment variables and Vault integration

### 2. Data Protection
- Encrypt sensitive data at rest using Prisma field encryption
- Use HTTPS for all communications
- Input validation with class-validator and Zod schemas
- Regular security audits

### 3. Rate Limiting
- NestJS ThrottlerModule for rate limiting
- Protect scraping endpoints to avoid IP bans
- Prevent abuse of application submission
- Redis-based distributed rate limiting for multi-instance deployments

## Development Workflow

### 1. Local Development
- NestJS CLI for service development
- Use docker-compose for local development environment
- Prisma migrations for database schema management
- Hot-reload for both API and UI development
- Bull Dashboard for local queue monitoring

### 2. CI/CD Pipeline
- Automated testing with Jest
- E2E testing with Supertest
- Container image building with multi-stage builds
- Deployment to staging/production
- Automated database migrations

## Job Scheduling and Message Queue Implementation

### 1. Scheduled Job Execution
- NestJS Schedule module (@nestjs/schedule)
- Cron expressions for configurable intervals
- Example implementation:
  ```typescript
  @Injectable()
  export class JobSchedulerService {
    constructor(private jobHuntingService: JobHuntingService) {}

    @Cron('0 */4 * * *') // Run every 4 hours
    async runJobScraper() {
      try {
        await this.jobHuntingService.findJobs(['https://example.com/jobs']);
      } catch (error) {
        // Error handling
      }
    }
  }
  ```

### 2. Bull Queue Implementation
- Bull queue for job processing (@nestjs/bull)
- Redis as the message broker
- Queue processors with concurrency control
- Example implementation:
  ```typescript
  // Queue registration
  @Module({
    imports: [
      BullModule.forRoot({
        redis: {
          host: 'localhost',
          port: 6379,
        },
      }),
      BullModule.registerQueue({
        name: 'job-verification',
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
          removeOnComplete: true,
        },
      }),
    ],
    providers: [JobVerificationProcessor],
  })
  export class JobQueueModule {}

  // Queue processor
  @Processor('job-verification')
  export class JobVerificationProcessor {
    @Process()
    async processJob(job: Job<JobData>) {
      // Process the job
      return result;
    }

    @OnQueueFailed()
    onError(job: Job, error: Error) {
      // Handle failed jobs
    }
  }
  ```

### 3. Error Handling and Retries
- Automatic retries with exponential backoff
- Circuit breaker pattern for external service calls
- Dead letter queue for failed jobs after max attempts
- Detailed error logging and monitoring

### 4. Monitoring and Management
- Bull Dashboard for queue visualization
- Prometheus metrics for queue performance
- Alerts for stalled or failed jobs
- Manual intervention capabilities

## Next Steps

1. Implement Bull queues for job processing
2. Set up scheduled job execution with NestJS Schedule
3. Implement error handling and retry mechanisms
4. Build the Verification UI
5. Develop the Application Agent service
5. Develop the Application Agent
6. Configure monitoring and alerting

## Appendix

### Database Schema
```sql
CREATE TABLE jobs (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    company TEXT NOT NULL,
    description TEXT NOT NULL,
    url TEXT UNIQUE NOT NULL,
    source TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'APPLIED', 'INTERVIEW', 'REJECTED_BY_COMPANY')),
    relevance_reasoning TEXT,
    region TEXT,
    job_type TEXT,
    experience TEXT,
    salary TEXT,
    posted_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    notes TEXT
);

CREATE TABLE applications (
    id SERIAL PRIMARY KEY,
    job_id INTEGER REFERENCES jobs(id) ON DELETE CASCADE,
    status TEXT NOT NULL,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    cover_letter TEXT,
    resume_version TEXT NOT NULL
);

CREATE TABLE events (
    id SERIAL PRIMARY KEY,
    job_id INTEGER REFERENCES jobs(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### API Endpoints

#### Jobs
- `GET /api/jobs` - List all jobs with filtering
- `GET /api/jobs/:id` - Get job details
- `PATCH /api/jobs/:id/status` - Update job status
- `POST /api/jobs` - Create new job (for testing)

#### Applications
- `POST /api/applications` - Submit new application
- `GET /api/applications` - List all applications
- `GET /api/applications/:id` - Get application details

#### Metrics
- `GET /metrics` - Prometheus metrics endpoint
- `GET /api/dashboard` - Dashboard metrics

### Environment Variables

```env
# Database
DB_HOST=db
DB_PORT=5432
DB_NAME=jobs
DB_USER=user
DB_PASS=pass

# Message Queue
RABBITMQ_URL=amqp://rabbitmq

# API
NODE_ENV=development
PORT=3000
JWT_SECRET=your_jwt_secret

# External Services
LINKEDIN_API_KEY=your_linkedin_key
INDEED_PUBLISHER_ID=your_indeed_id
```

### Deployment Notes

1. Set up Docker and Docker Compose on the deployment server
2. Clone the repository
3. Copy `.env.example` to `.env` and configure the environment variables
4. Run `docker-compose up -d`
5. Access the application at `http://localhost:80`
6. Access Grafana at `http://localhost:3001` (default credentials: admin/admin)

### Scaling Considerations

1. **Vertical Scaling**: Increase resources for database and message queue
2. **Horizontal Scaling**: Add more instances of job scrapers and application agents
3. **Database**: Consider read replicas for reporting
4. **Caching**: Implement Redis for frequently accessed data
5. **Load Balancing**: Use a load balancer in front of the API gateway for production
