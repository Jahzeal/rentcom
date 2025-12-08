/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable prettier/prettier */
import "dotenv/config";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ValidationPipe } from "@nestjs/common";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ✅ DYNAMIC CORS CONFIG
  app.enableCors({
    origin: (origin, callback) => {
      const allowedPatterns = [
        /^https?:\/\/localhost:\d+$/, // any localhost port
        /\.onrender\.com$/,           // any Render frontend domain
        /\.vercel\.app$/,             // any Vercel frontend domain
        /\.netlify\.app$/,            // any Netlify frontend domain
      ];

      // Server-side requests or Postman
      if (!origin) return callback(null, true);

      const isAllowed = allowedPatterns.some((pattern) => pattern.test(origin));

      // Allow or block origin
      callback(null, isAllowed);
    },
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS", // allow preflight
    allowedHeaders: "Content-Type, Authorization",       // allow JWT
    credentials: true,
  });

  // ✅ GLOBAL VALIDATION
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      stopAtFirstError: true,
    }),
  );

  const port = process.env.PORT || 3333;

  await app.listen(port, () => {
    console.log(`🚀 Server running on port ${port}`);
  });
}

bootstrap();
