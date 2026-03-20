import { Metadata } from 'next';
import RoleBasedContent from '@/components/RoleBasedContent';

interface ClasePageProps {
  params: Promise<{
    id: string;
    evalId: string;
    eventId: string;
  }>;
}

export const metadata: Metadata = {
  title: 'Clase | Pásalo a la Primera',
  description: 'Video y materiales de la clase',
};

export default async function ClasePage({ params }: ClasePageProps) {
  const { id, evalId, eventId } = await params;

  return (
    <RoleBasedContent
      componentProps={{ cursoId: id, evalId, eventId }}
    />
  );
}
