import { Metadata } from "next";
import RoleBasedContent from "@/components/RoleBasedContent";

export const metadata: Metadata = {
  title: "Detalle de Evento | Pásalo a la Primera",
  description: "Detalle de un evento de auditoría o seguridad",
};

export default function AuditoriaDetailPage() {
  return <RoleBasedContent />;
}
