import { Metadata } from 'next';
import RoleBasedContent from '@/components/RoleBasedContent';

export const metadata: Metadata = {
  title: 'Gestión de Cursos | Pásalo a la Primera',
  description: 'Administración de cursos de la plataforma',
};

export default function CursosPage() {
  return <RoleBasedContent />;
}
