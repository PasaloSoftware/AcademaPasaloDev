import { Metadata } from 'next';
import RoleBasedContent from '@/components/RoleBasedContent';

export const metadata: Metadata = {
  title: 'Gestión de Usuarios | Pásalo a la Primera',
  description: 'Administración de usuarios de la plataforma',
};

export default function UsuariosPage() {
  return <RoleBasedContent />;
}
