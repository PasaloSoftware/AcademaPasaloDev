import { Metadata } from 'next';
import RoleBasedContent from '@/components/RoleBasedContent';

export const metadata: Metadata = {
  title: 'Mi Perfil | Pásalo a la Primera',
  description: 'Consulta tus datos básicos de cuenta',
};

export default function PerfilPage() {
  return <RoleBasedContent />;
}
