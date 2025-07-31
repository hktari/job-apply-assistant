import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { TestDbHelper } from './test-db.helper';
import { PrismaClient } from '@prisma/client';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaClient;

  beforeAll(async () => {
    // Setup test database
    prisma = await TestDbHelper.setupTestDb();
  });

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Clean database before each test
    await TestDbHelper.cleanDatabase();
  });

  afterEach(async () => {
    await app.close();
  });

  afterAll(async () => {
    await TestDbHelper.teardownTestDb();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  describe('/jobs', () => {
    it('should return empty jobs list initially', async () => {
      const response = await request(app.getHttpServer())
        .get('/jobs')
        .expect(200);

      expect(response.body).toEqual([]);
    });
  });
});
