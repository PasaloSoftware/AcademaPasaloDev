import { Metadata } from "next";
import RoleBasedContent from "@/components/RoleBasedContent";

interface PreviousCycleClasePageProps {
  params: Promise<{
    id: string;
    cycleCode: string;
    evalId: string;
    eventId: string;
  }>;
  searchParams?: Promise<{
    view?: string;
  }>;
}

export const metadata: Metadata = {
  title: "Clase - Ciclo Anterior | Pasalo a la Primera",
  description: "Video y materiales de una clase de ciclo anterior",
};

export default async function PreviousCycleClasePage({
  params,
  searchParams,
}: PreviousCycleClasePageProps) {
  const { id, cycleCode, evalId, eventId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  return (
    <RoleBasedContent
      componentProps={{
        cursoId: id,
        cycleCode,
        evalId,
        eventId,
        previewView: resolvedSearchParams?.view,
      }}
    />
  );
}
