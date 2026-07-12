import { BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { existsSync, mkdirSync } from 'fs';
import { extname } from 'path';
import {
  ALLOWED_PHOTO_MIME_TYPES,
  MAX_PHOTO_SIZE_BYTES,
  STUDENT_PHOTOS_DIR,
} from './uploads.constants';

if (!existsSync(STUDENT_PHOTOS_DIR)) {
  mkdirSync(STUDENT_PHOTOS_DIR, { recursive: true });
}

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

export const StudentPhotoInterceptor = FileInterceptor('photo', {
  storage: diskStorage({
    destination: STUDENT_PHOTOS_DIR,
    filename: (req, file, callback) => {
      const studentId = req.params.id;
      const ext = EXT_BY_MIME[file.mimetype] ?? extname(file.originalname) ?? '.jpg';
      callback(null, `${studentId}-${Date.now()}${ext}`);
    },
  }),
  limits: { fileSize: MAX_PHOTO_SIZE_BYTES },
  fileFilter: (_req, file, callback) => {
    if (!ALLOWED_PHOTO_MIME_TYPES.includes(file.mimetype)) {
      callback(new BadRequestException('Formato inválido — use JPEG, PNG ou WebP'), false);
      return;
    }
    callback(null, true);
  },
});
