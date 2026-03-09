import { Metadata } from 'next';
import RoleBasedContent from '@/components/RoleBasedContent';

interface CicloAnteriorPageProps {
  params: Promise<{
    id: string;
    cycleCode: string;
  }>;
}

export const metadata: Metadata = {
  title: 'Ciclo Anterior | Pásalo a la Primera',
  description: 'Contenido de un ciclo anterior',
};

export default async function CicloAnteriorPage({ params }: CicloAnteriorPageProps) {
  const { id, cycleCode } = await params;

  return (
    <RoleBasedContent
      componentProps={{ cursoId: id, cycleCode }}
    />
  );
}
