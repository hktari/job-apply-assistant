import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { logger } from './logger';

async function bootstrap() {  
  const app = await NestFactory.create(AppModule, {
    logger: logger,
  });
  await app.listen(process.env.PORT ?? 3100);
}
bootstrap();
