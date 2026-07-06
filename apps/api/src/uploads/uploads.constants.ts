import { join } from 'path';

export const UPLOADS_ROOT = join(process.cwd(), 'uploads');
export const STUDENT_PHOTOS_DIR = join(UPLOADS_ROOT, 'students');

export const MAX_PHOTO_SIZE_BYTES = 2 * 1024 * 1024; // 2MB — VPS fraca, fotos pequenas
export const ALLOWED_PHOTO_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
