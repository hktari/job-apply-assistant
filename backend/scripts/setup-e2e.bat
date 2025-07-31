@echo off
echo 🚀 Setting up E2E test environment...

REM Check if PostgreSQL is running
pg_isready -h localhost -p 5432 >nul 2>&1
if errorlevel 1 (
    echo ❌ PostgreSQL is not running on localhost:5432
    echo Please start PostgreSQL first
    exit /b 1
)

REM Check if Redis is running
redis-cli ping >nul 2>&1
if errorlevel 1 (
    echo ❌ Redis is not running on localhost:6379
    echo Please start Redis first
    exit /b 1
)

echo ✅ PostgreSQL and Redis are running

REM Create test database if it doesn't exist
echo 📦 Setting up test database...
createdb job_apply_assistant_test 2>nul || echo Test database already exists

REM Copy environment file if it doesn't exist
if not exist .env (
    echo 📝 Creating .env file from .env.example...
    copy .env.example .env
    echo ⚠️  Please update .env with your actual API keys
)

REM Generate Prisma client
echo 🔧 Generating Prisma client...
call npm run prisma:generate

REM Run database migrations on test database
echo 🗄️  Running database migrations on test database...
set DATABASE_URL=postgresql://postgres:postgres@localhost:5432/job_apply_assistant_test
call npx prisma db push

echo ✅ E2E test environment setup complete!
echo.
echo To run E2E tests:
echo   npm run test:e2e
echo.
echo To run a specific E2E test:
echo   npm run test:e2e -- --testNamePattern="your test name"
