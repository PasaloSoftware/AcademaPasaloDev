import { Metadata } from 'next';
import RoleBasedContent from '@/components/RoleBasedContent';

export const metadata: Metadata = {
  title: 'Editar Usuario | Pásalo a la Primera',
  description: 'Edición de datos de usuario',
};

export default function UsuarioEditPage() {
  return <RoleBasedContent />;
}
