#!/bin/bash

# Run once to setup production database

if [ -z "$DATABASE_URL" ]; then
  echo "DATABASE_URL is not set, exiting"
  exit 1
fi

echo "Applying schema and migrations"
npx prisma migrate deploy

echo "Seeding database"
npm run seed
