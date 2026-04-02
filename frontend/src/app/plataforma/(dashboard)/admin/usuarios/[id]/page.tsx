import { Metadata } from 'next';
import RoleBasedContent from '@/components/RoleBasedContent';

export const metadata: Metadata = {
  title: 'Detalle de Usuario | Pásalo a la Primera',
  description: 'Detalle y gestión de usuario',
};

export default function UsuarioDetailPage() {
  return <RoleBasedContent />;
}
