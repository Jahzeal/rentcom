/* eslint-disable @typescript-eslint/no-unsafe-call */
// File: src/main.ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  try {
    const app = await NestFactory.create(AppModule);

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );

    const ALLOWED_ORIGINS = [
      'https://renant.netlify.app',
      'https://www.renant.netlify.app',
      'http://localhost:3001',
      'http://127.0.0.1:3000',
      'http://localhost:3000',
    ];

    app.enableCors({
      origin: (origin, callback) => {
        if (!origin || ALLOWED_ORIGINS.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error(`Origin ${origin} not allowed by CORS`), false);
        }
      },
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
      allowedHeaders: 'Content-Type, Authorization',
      credentials: true,
    });

    //  SWAGGER SETUP
    const config = new DocumentBuilder()
      .setTitle('RentCom API')
      .setDescription('The RentCom API documentation for property and bedspace management')
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document);

    const port = process.env.PORT || 3333;
    console.log(`Application starting on port ${port}...`);
    await app.listen(port, '0.0.0.0');
    console.log(`Application successfully started and listening on port ${port}`);
  } catch (error) {
    console.error('ERROR during application bootstrap:', error);
    process.exit(1);
  }
}
bootstrap();
