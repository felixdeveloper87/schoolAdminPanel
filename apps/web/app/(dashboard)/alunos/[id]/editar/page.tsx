import { CreateStudentInput, EnrollmentType, Relationship, StudentStatus } from '@escola/contracts';
import { apiGet } from '@/lib/server-api';
import { toDateInput } from '@/lib/format';
import { StudentForm } from '@/components/student-form';

interface StudentDetail {
  id: string;
  fullName: string;
  birthDate: string;
  status: StudentStatus;
  enrollmentType: EnrollmentType;
  mealsIncluded: boolean;
  photoUrl: string | null;
  allergies: string | null;
  dietaryRestrictions: string | null;
  medicalNotes: string | null;
  notes: string | null;
  guardians: {
    fullName: string;
    relationship: Relationship;
    cpf: string | null;
    phoneWhatsapp: string;
    email: string | null;
    isFinancialResponsible: boolean;
    authorizedPickup: boolean;
  }[];
}

export default async function EditarAlunoPage({ params }: { params: { id: string } }) {
  const student = await apiGet<StudentDetail>(`/students/${params.id}`);

  const defaultValues: CreateStudentInput = {
    fullName: student.fullName,
    birthDate: toDateInput(student.birthDate),
    enrollmentType: student.enrollmentType,
    mealsIncluded: student.mealsIncluded,
    allergies: student.allergies ?? undefined,
    dietaryRestrictions: student.dietaryRestrictions ?? undefined,
    medicalNotes: student.medicalNotes ?? undefined,
    notes: student.notes ?? undefined,
    guardians: student.guardians.map((g) => ({
      fullName: g.fullName,
      relationship: g.relationship,
      cpf: g.cpf ?? undefined,
      phoneWhatsapp: g.phoneWhatsapp,
      email: g.email ?? undefined,
      isFinancialResponsible: g.isFinancialResponsible,
      authorizedPickup: g.authorizedPickup,
    })),
  };

  return (
    <div className="mx-auto max-w-3xl space-y-7">
      <h1 className="page-title">Editar aluno</h1>
      <StudentForm studentId={student.id} defaultValues={defaultValues} currentPhotoUrl={student.photoUrl} />
    </div>
  );
}
