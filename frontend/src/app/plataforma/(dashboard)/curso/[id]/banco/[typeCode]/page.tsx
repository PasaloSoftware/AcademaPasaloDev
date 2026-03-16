import { Metadata } from 'next';
import RoleBasedContent from '@/components/RoleBasedContent';

interface BancoPageProps {
  params: Promise<{
    id: string;
    typeCode: string;
  }>;
}

export const metadata: Metadata = {
  title: 'Banco de Enunciados | Pásalo a la Primera',
  description: 'Banco de enunciados del curso',
};

export default async function BancoPage({ params }: BancoPageProps) {
  const { id, typeCode } = await params;

  return (
    <RoleBasedContent
      componentProps={{ cursoId: id, typeCode }}
    />
  );
}
