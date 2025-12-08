/* eslint-disable @typescript-eslint/no-unsafe-call */
// File: src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const ALLOWED_ORIGINS = [
    'https://renant.netlify.app',
    'https://www.renant.netlify.app',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ];

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || ALLOWED_ORIGINS.includes(origin)) {
        callback(null, true); // allow
      } else {
        console.warn(`Blocked CORS request from: ${origin}`);
        callback(new Error(`Origin ${origin} not allowed by CORS`), false);
      }
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Authorization, Accept, X-Requested-With',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      stopAtFirstError: true,
    }),
  );

  const port = process.env.PORT || 3333;
  await app.listen(port, () =>
    console.log(`🚀 Server running on port ${port}`),
  );
}

bootstrap();
