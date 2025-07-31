import { PrismaClient } from '@prisma/client';

export class TestDbHelper {
  private static prisma: PrismaClient;

  static async setupTestDb(): Promise<PrismaClient> {
    if (!this.prisma) {
      this.prisma = new PrismaClient({
        datasources: {
          db: {
            url: process.env.DATABASE_URL,
          },
        },
      });
    }

    // Connect to database
    await this.prisma.$connect();

    // Clean up existing data
    await this.cleanDatabase();

    return this.prisma;
  }

  static async cleanDatabase(): Promise<void> {
    if (!this.prisma) return;

    // Delete in correct order due to foreign key constraints
    await this.prisma.application.deleteMany();
    await this.prisma.event.deleteMany();
    await this.prisma.job.deleteMany();
  }

  static async teardownTestDb(): Promise<void> {
    if (this.prisma) {
      await this.cleanDatabase();
      await this.prisma.$disconnect();
    }
  }

  static getPrisma(): PrismaClient {
    return this.prisma;
  }
}
