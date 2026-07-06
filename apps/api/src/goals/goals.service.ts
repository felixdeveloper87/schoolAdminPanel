import { Injectable } from '@nestjs/common';
import { UpsertGoalInput } from '@escola/contracts';
import { PrismaService } from '../prisma/prisma.service';
import { parseCompetence } from '../common/dates';

@Injectable()
export class GoalsService {
  constructor(private readonly prisma: PrismaService) {}

  list(schoolId: string) {
    return this.prisma.goal.findMany({ where: { schoolId }, orderBy: { month: 'desc' }, take: 24 });
  }

  upsert(schoolId: string, input: UpsertGoalInput) {
    const month = parseCompetence(input.month);
    return this.prisma.goal.upsert({
      where: { schoolId_month: { schoolId, month } },
      update: {
        newStudentsTarget: input.newStudentsTarget,
        revenueTargetCents: input.revenueTargetCents ?? null,
      },
      create: {
        schoolId,
        month,
        newStudentsTarget: input.newStudentsTarget,
        revenueTargetCents: input.revenueTargetCents ?? null,
      },
    });
  }
}
