import { Controller, Get, NotFoundException, Param, Res } from '@nestjs/common';
import { Response } from 'express';
import { existsSync } from 'fs';
import { basename, extname, join } from 'path';
import { Public } from '../auth/public.decorator';
import { STUDENT_PHOTOS_DIR } from './uploads.constants';

const MIME_BY_EXT: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

@Controller('uploads')
export class UploadsController {
  // Fotos de alunos: público (mesma origem, atrás do nginx) — evita ter que
  // reenviar o cookie httpOnly em toda tag <img>.
  @Public()
  @Get('students/:filename')
  getStudentPhoto(@Param('filename') filename: string, @Res() res: Response) {
    const safeName = basename(filename); // impede path traversal (../)
    const filePath = join(STUDENT_PHOTOS_DIR, safeName);
    if (!existsSync(filePath)) throw new NotFoundException('Foto não encontrada');

    const mime = MIME_BY_EXT[extname(safeName).toLowerCase()] ?? 'application/octet-stream';
    res.setHeader('Content-Type', mime);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.sendFile(filePath);
  }
}
