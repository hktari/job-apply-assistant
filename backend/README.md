## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
cp .env.example .env
# setup local database
$ docker-compose up db redis
$ npm run prisma:migrate
$ npm run prisma:generate

# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

### BACKEND

```bash
cp .env.example .env.production.local

# fill in the variables

$ npm run prod:setup-db
```
