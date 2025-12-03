// Load environment variables from .env file when the CLI runs this file
import * as dotenv from 'dotenv';
// Load environment variables immediately
dotenv.config();

// 🛑 IMPORTANT: We define the type structure inline to avoid the '@prisma/cli' import error.
type PrismaConfig = {
  schema: string;
  migrations?: {
    path: string;
  };
  datasources: {
    db: {
      provider: 'postgresql';
      url: string;
    };
  };
  // Note: Other properties like 'engine' are omitted as they are obsolete
};

const config: PrismaConfig = {
  // 1. Standard schema path
  schema: './prisma/schema.prisma',

  // 2. Datasource Configuration (The critical part for the URL)
  datasources: {
    db: {
      provider: 'postgresql',
      // We rely on process.env which was loaded by dotenv above
      url: process.env.DATABASE_URL as string,
    },
  },

  // 3. Migrations Path
  migrations: {
    path: './prisma/migrations',
  },
};

// Export the configuration object
export default config;
