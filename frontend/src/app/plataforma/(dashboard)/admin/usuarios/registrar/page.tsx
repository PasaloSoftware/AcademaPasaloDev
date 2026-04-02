import { Metadata } from 'next';
import RoleBasedContent from '@/components/RoleBasedContent';

export const metadata: Metadata = {
  title: 'Registrar Usuario | Pásalo a la Primera',
  description: 'Registro de nuevo usuario en la plataforma',
};

export default function UsuarioCreatePage() {
  return <RoleBasedContent />;
}
