import { Metadata } from "next";
import RoleBasedContent from "@/components/RoleBasedContent";

export const metadata: Metadata = {
  title: "Crear Curso | Pasalo a la Primera",
  description: "Alta administrativa de cursos",
};

export default function CursoCreatePage() {
  return <RoleBasedContent customRoute="/plataforma/admin/cursos/crear" />;
}
