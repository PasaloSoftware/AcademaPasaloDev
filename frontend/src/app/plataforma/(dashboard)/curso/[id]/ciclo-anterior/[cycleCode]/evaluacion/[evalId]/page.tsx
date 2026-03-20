import { Metadata } from 'next';
import RoleBasedContent from '@/components/RoleBasedContent';

interface PreviousCycleEvaluationPageProps {
  params: Promise<{
    id: string;
    cycleCode: string;
    evalId: string;
  }>;
}

export const metadata: Metadata = {
  title: 'Evaluación - Ciclo Anterior | Pásalo a la Primera',
  description: 'Sesiones de clase y materiales de una evaluación de ciclo anterior',
};

export default async function PreviousCycleEvaluationPage({ params }: PreviousCycleEvaluationPageProps) {
  const { id, cycleCode, evalId } = await params;

  return (
    <RoleBasedContent
      componentProps={{ cursoId: id, cycleCode, evalId }}
    />
  );
}
