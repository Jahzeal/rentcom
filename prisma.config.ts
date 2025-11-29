/* eslint-disable prettier/prettier */
import "dotenv/config"; // ensures .env is loaded
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  engine: "classic",
  datasource: {
    url: env("DATABASE_URL"), // reads from .env
  },
});
