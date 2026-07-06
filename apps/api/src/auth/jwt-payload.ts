import { Role } from '@prisma/client';

export interface JwtPayload {
  sub: string;
  schoolId: string;
  role: Role;
  name: string;
  email: string;
}
