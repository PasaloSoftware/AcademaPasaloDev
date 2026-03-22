import { Metadata } from 'next';
import RoleBasedContent from '@/components/RoleBasedContent';

export const metadata: Metadata = {
  title: 'Notificaciones | Pásalo a la Primera',
  description: 'Consulta tus notificaciones',
};

export default function NotificacionesPage() {
  return <RoleBasedContent />;
}
