import { Metadata } from "next";
import RoleBasedContent from "@/components/RoleBasedContent";

interface BancoPageProps {
  params: Promise<{
    id: string;
    typeCode: string;
  }>;
  searchParams?: Promise<{
    view?: string;
  }>;
}

export const metadata: Metadata = {
  title: "Banco de Enunciados | Pásalo a la Primera",
  description: "Banco de enunciados del curso",
};

export default async function BancoPage({
  params,
  searchParams,
}: BancoPageProps) {
  const { id, typeCode } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  return (
    <RoleBasedContent
      componentProps={{
        cursoId: id,
        typeCode,
        previewView: resolvedSearchParams?.view,
      }}
    />
  );
}
