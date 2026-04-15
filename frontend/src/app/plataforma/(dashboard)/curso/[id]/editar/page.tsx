import { Metadata } from 'next';
import RoleBasedContent from '@/components/RoleBasedContent';

interface CursoEditPageProps {
  params: Promise<{
    id: string;
  }>;
}

export const metadata: Metadata = {
  title: 'Editar Curso | Pasalo a la Primera',
  description: 'Edicion administrativa de cursos',
};

export default async function CursoEditPage({ params }: CursoEditPageProps) {
  const { id } = await params;

  return (
    <RoleBasedContent
      componentProps={{ cursoId: id }}
    />
  );
}
