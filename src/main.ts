/* eslint-disable @typescript-eslint/no-unsafe-call */
// File: src/main.ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  try {
    const app = await NestFactory.create(AppModule);

    // 1. CORS FIRST (Handles preflights and sets headers before anything else)
    app.use((req: any, res: any, next: any) => {
      res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
      res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS,PATCH');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
      res.header('Access-Control-Allow-Credentials', 'true');
      if (req.method === 'OPTIONS') {
        res.sendStatus(200);
      } else {
        next();
      }
    });

    // 2. Global Pipes
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );

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
