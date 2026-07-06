'use client';

import * as React from 'react';
import { Camera } from 'lucide-react';
import { Label } from '@/components/ui/label';

export interface StudentPhotoInputHandle {
  getFile: () => File | null;
}

/** Seletor de foto com preview — o upload de verdade acontece depois que o aluno é salvo (precisa do id). */
export const StudentPhotoInput = React.forwardRef<StudentPhotoInputHandle, { currentPhotoUrl?: string | null }>(
  ({ currentPhotoUrl }, ref) => {
    const [preview, setPreview] = React.useState<string | null>(currentPhotoUrl ?? null);
    const [error, setError] = React.useState<string | null>(null);
    const fileRef = React.useRef<File | null>(null);
    const inputRef = React.useRef<HTMLInputElement>(null);

    React.useImperativeHandle(ref, () => ({
      getFile: () => fileRef.current,
    }));

    const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0] ?? null;
      setError(null);
      if (!file) return;

      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        setError('Formato inválido — use JPEG, PNG ou WebP');
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        setError('Arquivo maior que 2MB');
        return;
      }

      fileRef.current = file;
      setPreview(URL.createObjectURL(file));
    };

    return (
      <div className="space-y-1.5">
        <Label>Foto do aluno (opcional)</Label>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="group relative h-20 w-20 shrink-0 overflow-hidden rounded-full border-2 border-dashed border-input bg-muted"
          >
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="Prévia da foto" className="h-full w-full object-cover" />
            ) : (
              <span className="grid h-full w-full place-items-center text-muted-foreground">
                <Camera className="h-6 w-6" />
              </span>
            )}
            <span className="absolute inset-0 hidden items-center justify-center bg-foreground/40 text-xs font-semibold text-white group-hover:flex">
              Trocar
            </span>
          </button>
          <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onChange} />
          <p className="text-xs text-muted-foreground">JPEG, PNG ou WebP — até 2MB</p>
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    );
  },
);
StudentPhotoInput.displayName = 'StudentPhotoInput';

export async function uploadStudentPhoto(studentId: string, file: File) {
  const formData = new FormData();
  formData.append('photo', file);
  return fetch(`/api/students/${studentId}/photo`, { method: 'POST', body: formData });
}
