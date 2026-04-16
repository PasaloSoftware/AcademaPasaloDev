import { Metadata } from "next";
import RoleBasedContent from "@/components/RoleBasedContent";

interface CicloAnteriorPageProps {
  params: Promise<{
    id: string;
    cycleCode: string;
  }>;
  searchParams?: Promise<{
    view?: string;
  }>;
}

export const metadata: Metadata = {
  title: "Ciclo Anterior | Pásalo a la Primera",
  description: "Contenido de un ciclo anterior",
};

export default async function CicloAnteriorPage({
  params,
  searchParams,
}: CicloAnteriorPageProps) {
  const { id, cycleCode } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  return (
    <RoleBasedContent
      componentProps={{
        cursoId: id,
        cycleCode,
        previewView: resolvedSearchParams?.view,
      }}
    />
  );
}
