import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { logger } from './logger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: logger,
  });
  app.setGlobalPrefix('api');
  if (process.env.NODE_ENV === 'development') {
    const corsOptions = {
      origin: '*',
      credentials: true,
    };
    app.enableCors(corsOptions);
  }
  await app.listen(3001);
}
bootstrap();
