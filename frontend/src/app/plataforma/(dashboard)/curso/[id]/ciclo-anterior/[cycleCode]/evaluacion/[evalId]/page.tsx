import { Metadata } from "next";
import RoleBasedContent from "@/components/RoleBasedContent";

interface PreviousCycleEvaluationPageProps {
  params: Promise<{
    id: string;
    cycleCode: string;
    evalId: string;
  }>;
  searchParams?: Promise<{
    view?: string;
  }>;
}

export const metadata: Metadata = {
  title: "Evaluación - Ciclo Anterior | Pásalo a la Primera",
  description:
    "Sesiones de clase y materiales de una evaluación de ciclo anterior",
};

export default async function PreviousCycleEvaluationPage({
  params,
  searchParams,
}: PreviousCycleEvaluationPageProps) {
  const { id, cycleCode, evalId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  return (
    <RoleBasedContent
      componentProps={{
        cursoId: id,
        cycleCode,
        evalId,
        previewView: resolvedSearchParams?.view,
      }}
    />
  );
}
