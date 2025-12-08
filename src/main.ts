/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable prettier/prettier */
import "dotenv/config";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ValidationPipe } from "@nestjs/common";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // --- DYNAMIC CORS ---
  app.enableCors({
    origin: (origin, callback) => {
      const allowedPatterns = [
        /^https?:\/\/localhost:\d+$/, // any localhost port
        /\.onrender\.com$/,           // any Render frontend
        /\.vercel\.app$/,             // any Vercel frontend
        /\.netlify\.app$/,            // any Netlify frontend
      ];

      if (!origin) {
        // allow Postman, server-side, or same-origin calls
        return callback(null, true);
      }

      const isAllowed = allowedPatterns.some((pattern) => pattern.test(origin));

      if (isAllowed) {
        return callback(null, true);
      } else {
        console.error("❌ CORS blocked:", origin);
        return callback(new Error(`CORS blocked for origin: ${origin}`));
      }
    },
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
    allowedHeaders: "Content-Type, Authorization",
    credentials: true,
  });

  // --- GLOBAL VALIDATION ---
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
