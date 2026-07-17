import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import {
  createClassroomSchema,
  CreateClassroomInput,
  updateClassroomSchema,
  UpdateClassroomInput,
} from '@escola/contracts';
import { ClassroomsService } from './classrooms.service';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { CurrentUser } from '../auth/current-user.decorator';
import { Roles } from '../auth/roles.decorator';
import { JwtPayload } from '../auth/jwt-payload';

@Controller('classrooms')
export class ClassroomsController {
  constructor(private readonly classroomsService: ClassroomsService) {}

  @Get()
  list(@CurrentUser() user: JwtPayload) {
    return this.classroomsService.list(user.schoolId);
  }

  @Post()
  create(
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(createClassroomSchema)) body: CreateClassroomInput,
  ) {
    return this.classroomsService.create(user.schoolId, body);
  }

  @Put(':id')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateClassroomSchema)) body: UpdateClassroomInput,
  ) {
    return this.classroomsService.update(user.schoolId, id, body);
  }

  @Delete(':id')
  @Roles('ADMIN')
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.classroomsService.remove(user.schoolId, id);
  }
}
