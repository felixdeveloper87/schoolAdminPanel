import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import {
  createEnrollmentSchema,
  CreateEnrollmentInput,
  endEnrollmentSchema,
  EndEnrollmentInput,
} from '@escola/contracts';
import { EnrollmentsService } from './enrollments.service';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtPayload } from '../auth/jwt-payload';

@Controller('enrollments')
export class EnrollmentsController {
  constructor(private readonly enrollmentsService: EnrollmentsService) {}

  @Get()
  list(@CurrentUser() user: JwtPayload) {
    return this.enrollmentsService.list(user.schoolId);
  }

  @Get('sibling-check')
  siblingCheck(@CurrentUser() user: JwtPayload, @Query('studentId') studentId: string) {
    return this.enrollmentsService.siblingCheck(user.schoolId, studentId);
  }

  @Post()
  create(
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(createEnrollmentSchema)) body: CreateEnrollmentInput,
  ) {
    return this.enrollmentsService.create(user.schoolId, body);
  }

  @Patch(':id/end')
  end(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(endEnrollmentSchema)) body: EndEnrollmentInput,
  ) {
    return this.enrollmentsService.end(user.schoolId, id, body);
  }
}
