#!/bin/bash

# E2E Test Environment Setup Script

echo "🚀 Setting up E2E test environment..."

# Check if PostgreSQL is running
if ! pg_isready -h localhost -p 5432 >/dev/null 2>&1; then
    echo "❌ PostgreSQL is not running on localhost:5432"
    echo "Please start PostgreSQL first"
    exit 1
fi

# Check if Redis is running
if ! redis-cli ping >/dev/null 2>&1; then
    echo "❌ Redis is not running on localhost:6379"
    echo "Please start Redis first"
    exit 1
fi

echo "✅ PostgreSQL and Redis are running"

# Create test database if it doesn't exist
echo "📦 Setting up test database..."
createdb job_apply_assistant_test 2>/dev/null || echo "Test database already exists"

# Copy environment file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from .env.example..."
    cp .env.example .env
    echo "⚠️  Please update .env with your actual API keys"
fi

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npm run prisma:generate

# Run database migrations on test database
echo "🗄️  Running database migrations on test database..."
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/job_apply_assistant_test" npx prisma db push

echo "✅ E2E test environment setup complete!"
echo ""
echo "To run E2E tests:"
echo "  npm run test:e2e"
echo ""
echo "To run a specific E2E test:"
echo "  npm run test:e2e -- --testNamePattern=\"your test name\""
