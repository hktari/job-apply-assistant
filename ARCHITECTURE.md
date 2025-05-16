# Job Application Assistant System Architecture

## Overview

This document outlines the architecture for a Job Application Assistant System that automates the process of finding, filtering, and applying to job postings. The system is designed to be scalable, maintainable, and observable.

## System Components

### 1. Job Scraper Service
- Extends the existing job-scrape-agent
- Scrapes job postings from various sources
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
- Single entry point for all services
- Handles authentication/authorization
- Routes requests to appropriate services

### 5. Database
- Stores job postings, user profiles, application status
- Recommended: PostgreSQL or MongoDB

### 6. Message Queue
- Manages job processing pipeline
- Handles retries and backpressure
- Recommended: RabbitMQ or AWS SQS

## Data Flow

### 1. Scraping Phase
- Scraper runs on schedule
- Raw jobs → Database
- Filtered jobs → Verification Queue

### 2. Verification Phase
- Human reviews jobs in React UI
- Approved jobs → Application Queue
- Rejected jobs → Feedback for ML model

### 3. Application Phase
- Application Agent picks up verified jobs
- Submits applications
- Updates status in database

## Deployment Architecture

```yaml
version: '3.8'

services:
  # API Gateway
  api-gateway:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - job-scraper
      - verification-ui
      - application-agent

  # Job Scraper
  job-scraper:
    build: ./job-scraper
    environment:
      - NODE_ENV=production
      - DB_URL=postgres://user:pass@db:5432/jobs
      - RABBITMQ_URL=amqp://rabbitmq
    depends_on:
      - db
      - rabbitmq

  # Verification UI
  verification-ui:
    build: ./verification-ui
    environment:
      - REACT_APP_API_URL=/api
    ports:
      - "3000:3000"

  # Application Agent
  application-agent:
    build: ./application-agent
    environment:
      - NODE_ENV=production
      - DB_URL=postgres://user:pass@db:5432/jobs
      - RABBITMQ_URL=amqp://rabbitmq
    depends_on:
      - db
      - rabbitmq

  # Database
  db:
    image: postgres:13-alpine
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
      - POSTGRES_DB=jobs
    volumes:
      - postgres_data:/var/lib/postgresql/data

  # Message Queue
  rabbitmq:
    image: rabbitmq:3-management
    ports:
      - "5672:5672"
      - "15672:15672"
    volumes:
      - rabbitmq_data:/var/lib/rabbitmq

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
  rabbitmq_data:
  grafana_data:
```

## Monitoring and Observability

### 1. Logging
- Centralized logging with ELK Stack or Loki
- Structured JSON logs from all services

### 2. Metrics
- Prometheus for metrics collection
- Grafana for visualization
- Key metrics:
  - Jobs scraped/verified/applied
  - Success/failure rates
  - Processing times
  - Queue lengths

### 3. Alerting
- Set up alerts for:
  - Failed scrapes
  - Long queue times
  - Application submission failures
  - System resource usage

## Security Considerations

### 1. Authentication/Authorization
- JWT-based auth for API endpoints
- Role-based access control
- Secure credential storage

### 2. Data Protection
- Encrypt sensitive data at rest
- Use HTTPS for all communications
- Regular security audits

### 3. Rate Limiting
- Protect scraping endpoints
- Prevent abuse of application submission

## Development Workflow

### 1. Local Development
- Use docker-compose for local development
- Include development databases
- Hot-reload for UI development

### 2. CI/CD Pipeline
- Automated testing
- Container image building
- Deployment to staging/production

## Next Steps

1. Set up the database schema
2. Implement the API Gateway
3. Build the Verification UI
4. Extend the Job Scraper
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
