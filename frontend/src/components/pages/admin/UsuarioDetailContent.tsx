'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Icon from '@/components/ui/Icon';
import Modal from '@/components/ui/Modal';
import { useBreadcrumb } from '@/contexts/BreadcrumbContext';
import { usersService } from '@/services/users.service';
import type { AdminUserDetail } from '@/services/users.service';
import { useToast } from '@/components/ui/ToastContainer';
import { EnrollmentSection, TeachingSection } from './UserCourseSections';

// ============================================
// Role tag (reused from UsuariosContent)
// ============================================

const ROLE_ORDER = ['Alumno', 'Asesor', 'Administrador', 'Superadministrador'];

const ROLE_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  Alumno:              { bg: 'bg-bg-accent-light',          text: 'text-text-accent-primary',    label: 'ALUMNO' },
  Asesor:              { bg: 'bg-bg-info-primary-light',    text: 'text-text-info-primary',      label: 'ASESOR' },
  Administrador:       { bg: 'bg-bg-info-secondary-light',  text: 'text-text-info-secondary',    label: 'ADMINISTRADOR' },
  Superadministrador:  { bg: 'bg-warning-light',         text: 'text-text-warning-primary',   label: 'SUPERADMINISTRADOR' },
};

function sortRoles(roles: string[]): string[] {
  return [...roles].sort((a, b) => {
    const ia = ROLE_ORDER.indexOf(a);
    const ib = ROLE_ORDER.indexOf(b);
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
  });
}

function RoleTag({ role }: { role: string }) {
  const style = ROLE_STYLES[role] || { bg: 'bg-bg-quartiary', text: 'text-text-secondary', label: role.toUpperCase() };
  return (
    <span className={`px-2.5 py-1.5 ${style.bg} rounded-full inline-flex justify-center items-center whitespace-nowrap`}>
      <span className={`${style.text} text-xs font-medium leading-3`}>{style.label}</span>
    </span>
  );
}

// ============================================
// Info field
// ============================================

function InfoField({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex-1 flex flex-col gap-1">
      <span className="text-gray-600 text-sm font-semibold leading-4">{label}</span>
      <span className="text-text-primary text-base font-medium leading-4">{value || '—'}</span>
    </div>
  );
}

// ============================================
// Main component
// ============================================

export default function UsuarioDetailContent() {
  const params = useParams();
  const router = useRouter();
  const { setBreadcrumbItems } = useBreadcrumb();
  const { showToast } = useToast();
  const userId = params.id as string;

  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    usersService.getAdminDetail(userId)
      .then((data) => {
        setDetail(data);
        setBreadcrumbItems([
          { icon: 'groups', label: 'Usuarios', href: '/plataforma/admin/usuarios' },
          { label: `${data.personalInfo.firstName} ${data.personalInfo.lastName1}` },
        ]);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Error al cargar usuario'))
      .finally(() => setLoading(false));
  }, [userId, setBreadcrumbItems]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 border-4 border-accent-solid border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Icon name="error" size={64} className="text-error-solid mb-4 mx-auto" />
          <p className="text-lg font-semibold text-primary mb-2">{error || 'Usuario no encontrado'}</p>
          <button onClick={() => router.push('/plataforma/admin/usuarios')} className="mt-4 px-4 py-2 bg-accent-solid text-white rounded-lg">
            Volver
          </button>
        </div>
      </div>
    );
  }

  const { personalInfo, enrolledCourses, teachingCourses } = detail;
  const initials = `${personalInfo.firstName[0]}${personalInfo.lastName1[0]}`.toUpperCase();
  const fullName = `${personalInfo.firstName} ${personalInfo.lastName1}`;
  const roles = sortRoles(personalInfo.roles);
  const hasStudentRole = personalInfo.roles.some((r) => r === 'Alumno');
  const hasTeacherRole = personalInfo.roles.some((r) => r === 'Asesor');
  const nextStatusIsActive = !personalInfo.isActive;

  const handleToggleStatus = async () => {
    setStatusSaving(true);
    try {
      await usersService.updateStatus(userId, nextStatusIsActive);
      setDetail((current) =>
        current
          ? {
              ...current,
              personalInfo: {
                ...current.personalInfo,
                isActive: nextStatusIsActive,
              },
            }
          : current,
      );
      setStatusModalOpen(false);
      showToast({
        type: 'success',
        title: nextStatusIsActive ? 'Usuario activado' : 'Usuario inactivado',
        description: nextStatusIsActive
          ? 'El usuario ya puede volver a acceder a la plataforma.'
          : 'El acceso del usuario fue deshabilitado correctamente.',
      });
    } catch (err) {
      showToast({
        type: 'error',
        title: 'No se pudo actualizar el estado',
        description:
          err instanceof Error ? err.message : 'Ocurrió un error inesperado.',
      });
    } finally {
      setStatusSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Back link */}
      <button
        onClick={() => router.push('/plataforma/admin/usuarios')}
        className="p-1 rounded-lg inline-flex items-center gap-2 self-start hover:bg-bg-secondary transition-colors"
      >
        <Icon name="arrow_back" size={20} className="text-icon-accent-primary" />
        <span className="text-text-accent-primary text-base font-medium leading-4">Volver a Gestión de Usuarios</span>
      </button>

      {/* Profile header + Actions */}
      <div className="flex gap-4">
        {/* Profile card */}
        <div className="flex-1 p-6 relative bg-bg-primary rounded-xl outline outline-1 outline-offset-[-1px] outline-stroke-secondary flex items-center gap-8 overflow-hidden">
          {/* Decorative circles */}
          <div className="w-24 h-24 absolute -left-[50px] bottom-[-20px] bg-fuchsia-800/20 rounded-full" />
          <div className="w-32 h-32 absolute right-[-30px] top-[-66px] bg-purple-900/20 rounded-full" />

          {/* Avatar */}
          {personalInfo.profilePhotoUrl ? (
            <img
              src={personalInfo.profilePhotoUrl}
              alt={fullName}
              className="w-32 h-32 rounded-full outline outline-4 outline-gray-100 object-cover"
            />
          ) : (
            <div className="w-32 h-32 rounded-full outline outline-4 outline-gray-100 bg-bg-info-primary-solid flex items-center justify-center">
              <span className="text-text-white text-4xl font-medium leading-[48px]">{initials}</span>
            </div>
          )}

          {/* Info */}
          <div className="flex-1 flex flex-col gap-4 relative z-10">
            <div className="flex flex-col">
              <span className="text-text-primary text-2xl font-bold leading-7">{fullName}</span>
              <span className="text-text-info-primary text-base font-medium leading-5">{personalInfo.email}</span>
            </div>
            <div className="flex items-start gap-2">
              {roles.map((r) => <RoleTag key={r} role={r} />)}
              <span className="px-2.5 py-1.5 bg-bg-success-light rounded-full inline-flex items-center">
                <span className="text-text-success-primary text-xs font-medium leading-3">{personalInfo.isActive ? 'ACTIVO' : 'INACTIVO'}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Actions card */}
        <div className="w-48 p-5 bg-bg-primary rounded-xl outline outline-1 outline-offset-[-1px] outline-stroke-secondary flex flex-col gap-2">
          <span className="text-text-tertiary text-base font-semibold leading-5">Acciones</span>
          <div className="flex flex-col">
            <button onClick={() => router.push(`/plataforma/admin/usuarios/${userId}/editar`)} className="p-2 rounded inline-flex items-center gap-2 hover:bg-bg-secondary transition-colors">
              <Icon name="edit" size={20} className="text-icon-secondary" variant="rounded" />
              <span className="flex-1 text-text-secondary text-sm font-normal leading-4 text-left">Editar</span>
            </button>
            <button
              onClick={() => setStatusModalOpen(true)}
              className="p-2 rounded inline-flex items-center gap-2 hover:bg-bg-secondary transition-colors"
            >
              <Icon name={personalInfo.isActive ? 'person_off' : 'check_circle'} size={20} className="text-icon-secondary" variant="rounded" />
              <span className="flex-1 text-text-secondary text-sm font-normal leading-4 text-left">{personalInfo.isActive ? 'Inactivar' : 'Activar'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Personal info section */}
      <div className="p-6 bg-bg-primary rounded-xl outline outline-1 outline-offset-[-1px] outline-stroke-secondary flex flex-col gap-6">
        <div className="flex items-start gap-2">
          <Icon name="person" size={20} className="text-icon-info-secondary" variant="rounded" />
          <span className="flex-1 text-text-primary text-lg font-semibold leading-5">Información Personal</span>
        </div>
        <div className="flex flex-col gap-6">
          <div className="flex gap-6">
            <InfoField label="Nombres" value={personalInfo.firstName} />
            <InfoField label="Primer Apellido" value={personalInfo.lastName1} />
          </div>
          <div className="flex gap-6">
            <InfoField label="Segundo Apellido" value={personalInfo.lastName2} />
            <InfoField label="Correo Electrónico" value={personalInfo.email} />
          </div>
          <div className="flex gap-6">
            <InfoField label="Teléfono" value={personalInfo.phone} />
            <InfoField label="Carrera" value={personalInfo.careerName} />
          </div>
        </div>
      </div>

      {/* Enrollment management (if student) */}
      {hasStudentRole && <EnrollmentSection courses={enrolledCourses} readOnly />}

      {/* Teaching courses (if professor) */}
      {hasTeacherRole && <TeachingSection courses={teachingCourses} readOnly />}

      <Modal
        isOpen={statusModalOpen}
        onClose={() => !statusSaving && setStatusModalOpen(false)}
        title={personalInfo.isActive ? 'Inactivar usuario' : 'Activar usuario'}
        size="sm"
        footer={
          <>
            <Modal.Button
              variant="secondary"
              onClick={() => setStatusModalOpen(false)}
              disabled={statusSaving}
            >
              Cancelar
            </Modal.Button>
            <Modal.Button
              variant={personalInfo.isActive ? 'danger' : 'primary'}
              onClick={handleToggleStatus}
              loading={statusSaving}
              loadingText={
                personalInfo.isActive ? 'Inactivando...' : 'Activando...'
              }
            >
              {personalInfo.isActive ? 'Inactivar' : 'Activar'}
            </Modal.Button>
          </>
        }
      >
        <p className="text-text-secondary text-sm leading-5">
          {personalInfo.isActive
            ? 'El usuario perdera acceso a la plataforma hasta que vuelva a ser activado.'
            : 'El usuario recuperara el acceso a la plataforma con sus permisos actuales.'}
        </p>
      </Modal>
    </div>
  );
}
