import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { StudentStatus } from '@prisma/client';
import {
  createStudentSchema,
  CreateStudentInput,
  updateStudentSchema,
  UpdateStudentInput,
  updateStudentStatusSchema,
  UpdateStudentStatusInput,
  STUDENT_STATUSES,
} from '@escola/contracts';
import { StudentsService } from './students.service';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtPayload } from '../auth/jwt-payload';
import { parsePageParams } from '../common/pagination';
import { StudentPhotoInterceptor } from '../uploads/student-photo.interceptor';

@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Get()
  list(
    @CurrentUser() user: JwtPayload,
    @Query('status') status?: string,
    @Query('classroomId') classroomId?: string,
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const validStatus = STUDENT_STATUSES.includes(status as StudentStatus)
      ? (status as StudentStatus)
      : undefined;
    return this.studentsService.list(
      user.schoolId,
      { status: validStatus, classroomId: classroomId || undefined, q: q || undefined },
      parsePageParams(page, pageSize),
    );
  }

  @Get(':id')
  detail(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.studentsService.detail(user.schoolId, id);
  }

  @Post()
  create(
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(createStudentSchema)) body: CreateStudentInput,
  ) {
    return this.studentsService.create(user.schoolId, body);
  }

  @Put(':id')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateStudentSchema)) body: UpdateStudentInput,
  ) {
    return this.studentsService.update(user.schoolId, id, body);
  }

  @Patch(':id/status')
  updateStatus(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateStudentStatusSchema)) body: UpdateStudentStatusInput,
  ) {
    return this.studentsService.updateStatus(user.schoolId, id, body.status, body.reason);
  }

  @Post(':id/photo')
  @UseInterceptors(StudentPhotoInterceptor)
  uploadPhoto(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Envie um arquivo de imagem no campo "photo"');
    return this.studentsService.updatePhoto(user.schoolId, id, file.filename);
  }
}
