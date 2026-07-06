import { Injectable, NotFoundException } from '@nestjs/common';
import { WaitlistStatus } from '@prisma/client';
import { CreateWaitlistEntryInput } from '@escola/contracts';
import { PrismaService } from '../prisma/prisma.service';
import { parseDateString } from '../common/dates';

@Injectable()
export class WaitlistService {
  constructor(private readonly prisma: PrismaService) {}

  list(schoolId: string, status?: WaitlistStatus) {
    return this.prisma.waitlistEntry.findMany({
      where: { schoolId, ...(status ? { status } : {}) },
      orderBy: { requestedAt: 'asc' },
    });
  }

  create(schoolId: string, input: CreateWaitlistEntryInput) {
    return this.prisma.waitlistEntry.create({
      data: { schoolId, ...input, birthDate: parseDateString(input.birthDate) },
    });
  }

  async updateStatus(schoolId: string, id: string, status: WaitlistStatus) {
    const found = await this.prisma.waitlistEntry.findFirst({ where: { id, schoolId }, select: { id: true } });
    if (!found) throw new NotFoundException('Registro não encontrado');
    return this.prisma.waitlistEntry.update({ where: { id }, data: { status } });
  }
}
