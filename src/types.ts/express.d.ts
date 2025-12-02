import { UserRole } from 'generated/prisma/client';

declare global {
  namespace Express {
    interface User {
      id: string;
      email: string;
      role: UserRole;
      Firstname?: string;
      Lastname?: string;
    }

    interface Request {
      user?: User;
    }
  }
}
