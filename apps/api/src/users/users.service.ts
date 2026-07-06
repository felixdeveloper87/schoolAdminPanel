import { BadRequestException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { CreateUserInput } from '@escola/contracts';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  list(schoolId: string) {
    return this.prisma.appUser.findMany({
      where: { schoolId },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, email: true, role: true, active: true },
    });
  }

  async create(schoolId: string, input: CreateUserInput) {
    const existing = await this.prisma.appUser.findFirst({
      where: { schoolId, email: input.email },
      select: { id: true },
    });
    if (existing) throw new BadRequestException('Já existe um usuário com este e-mail nesta escola');

    const passwordHash = await bcrypt.hash(input.password, 10);
    const user = await this.prisma.appUser.create({
      data: { schoolId, name: input.name, email: input.email, passwordHash, role: input.role },
      select: { id: true, name: true, email: true, role: true, active: true },
    });
    return user;
  }

  async setActive(schoolId: string, id: string, active: boolean) {
    await this.prisma.appUser.updateMany({ where: { id, schoolId }, data: { active } });
    return { ok: true };
  }
}
