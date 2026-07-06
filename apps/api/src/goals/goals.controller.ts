import { Body, Controller, Get, Post, Put } from '@nestjs/common';
import { upsertGoalSchema, UpsertGoalInput } from '@escola/contracts';
import { GoalsService } from './goals.service';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { CurrentUser } from '../auth/current-user.decorator';
import { Roles } from '../auth/roles.decorator';
import { JwtPayload } from '../auth/jwt-payload';

@Controller('goals')
@Roles('ADMIN')
export class GoalsController {
  constructor(private readonly goalsService: GoalsService) {}

  @Get()
  list(@CurrentUser() user: JwtPayload) {
    return this.goalsService.list(user.schoolId);
  }

  @Post()
  create(
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(upsertGoalSchema)) body: UpsertGoalInput,
  ) {
    return this.goalsService.upsert(user.schoolId, body);
  }

  @Put()
  update(
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(upsertGoalSchema)) body: UpsertGoalInput,
  ) {
    return this.goalsService.upsert(user.schoolId, body);
  }
}
