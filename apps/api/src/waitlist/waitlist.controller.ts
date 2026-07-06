import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { WaitlistStatus } from '@prisma/client';
import {
  createWaitlistEntrySchema,
  CreateWaitlistEntryInput,
  updateWaitlistStatusSchema,
  UpdateWaitlistStatusInput,
  WAITLIST_STATUSES,
} from '@escola/contracts';
import { WaitlistService } from './waitlist.service';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtPayload } from '../auth/jwt-payload';

@Controller('waitlist')
export class WaitlistController {
  constructor(private readonly waitlistService: WaitlistService) {}

  @Get()
  list(@CurrentUser() user: JwtPayload, @Query('status') status?: string) {
    const validStatus = WAITLIST_STATUSES.includes(status as WaitlistStatus)
      ? (status as WaitlistStatus)
      : undefined;
    return this.waitlistService.list(user.schoolId, validStatus);
  }

  @Post()
  create(
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(createWaitlistEntrySchema)) body: CreateWaitlistEntryInput,
  ) {
    return this.waitlistService.create(user.schoolId, body);
  }

  @Patch(':id/status')
  updateStatus(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateWaitlistStatusSchema)) body: UpdateWaitlistStatusInput,
  ) {
    return this.waitlistService.updateStatus(user.schoolId, id, body.status);
  }
}
