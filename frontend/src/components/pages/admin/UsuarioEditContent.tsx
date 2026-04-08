'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Icon from '@/components/ui/Icon';
import { useBreadcrumb } from '@/contexts/BreadcrumbContext';
import { useToast } from '@/components/ui/ToastContainer';
import { usersService } from '@/services/users.service';
import type { AdminUserDetailCourse } from '@/services/users.service';
import {
  PersonalInfoSection,
  RoleAssignmentSection,
  mapBackendRolesToCodes,
} from './UserCourseSections';
import type { PersonalInfoData } from './UserCourseSections';

export default function UsuarioEditContent() {
  const params = useParams();
  const router = useRouter();
  const { setBreadcrumbItems } = useBreadcrumb();
  const { showToast } = useToast();
  const userId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userName, setUserName] = useState('');

  const [personalInfo, setPersonalInfo] = useState<PersonalInfoData>({
    firstName: '', lastName1: '', lastName2: '', email: '', phone: '', career: null,
  });
  const [selectedRoles, setSelectedRoles] = useState<Set<string>>(new Set());
  const [enrolledCourses, setEnrolledCourses] = useState<AdminUserDetailCourse[]>([]);
  const [teachingCourses, setTeachingCourses] = useState<AdminUserDetailCourse[]>([]);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    usersService.getAdminDetail(userId)
      .then((detail) => {
        const p = detail.personalInfo;
        const name = `${p.firstName} ${p.lastName1}`;
        setUserName(name);
        setPersonalInfo({
          firstName: p.firstName,
          lastName1: p.lastName1,
          lastName2: p.lastName2 || '',
          email: p.email,
          phone: p.phone || '',
          career: p.careerId ? { id: p.careerId, name: p.careerName || '' } : null,
        });
        setSelectedRoles(mapBackendRolesToCodes(p.roles));
        setEnrolledCourses(detail.enrolledCourses);
        setTeachingCourses(detail.teachingCourses);
        setBreadcrumbItems([
          { icon: 'groups', label: 'Usuarios', href: '/plataforma/admin/usuarios' },
          { label: name, href: `/plataforma/admin/usuarios/${userId}` },
          { label: 'Editar Usuario' },
        ]);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Error al cargar usuario'))
      .finally(() => setLoading(false));
  }, [userId, setBreadcrumbItems]);

  const updateField = (field: keyof PersonalInfoData, value: string | { id: number; name: string } | null) => {
    setPersonalInfo((prev) => ({ ...prev, [field]: value }));
  };

  const toggleRole = (code: string) => {
    setSelectedRoles((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const canSave = personalInfo.firstName.trim() && personalInfo.lastName1.trim() && personalInfo.email.trim();

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      await usersService.adminEdit(userId, {
        personalInfo: {
          firstName: personalInfo.firstName.trim(),
          lastName1: personalInfo.lastName1.trim(),
          lastName2: personalInfo.lastName2.trim() || undefined,
          email: personalInfo.email.trim(),
          phone: personalInfo.phone.trim() || undefined,
          careerId: personalInfo.career?.id || undefined,
        },
        roleCodesFinal: Array.from(selectedRoles),
        studentStateFinal: {
          enrollments: selectedRoles.has('STUDENT')
            ? enrolledCourses.map((c) => ({
                courseCycleId: c.courseCycleId,
                enrollmentTypeCode:
                  c.enrollmentTypeCode ||
                  ((c.evaluationIds && c.evaluationIds.length > 0
                    ? 'PARTIAL'
                    : 'FULL') as const),
                evaluationIds: c.evaluationIds || [],
                historicalCourseCycleIds: c.historicalCourseCycleIds || [],
              }))
            : [],
        },
        professorStateFinal: {
          courseCycleIds: selectedRoles.has('PROFESSOR') ? teachingCourses.map((c) => c.courseCycleId) : [],
        },
      });
      showToast({ type: 'success', title: 'Usuario actualizado', description: 'Los cambios se han guardado correctamente.' });
      router.push(`/plataforma/admin/usuarios/${userId}`);
    } catch (err) {
      showToast({ type: 'error', title: 'Error', description: err instanceof Error ? err.message : 'No se pudo guardar.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 border-4 border-accent-solid border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Icon name="error" size={64} className="text-error-solid mb-4 mx-auto" />
          <p className="text-lg font-semibold text-primary mb-2">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <button
        onClick={() => router.push(`/plataforma/admin/usuarios/${userId}`)}
        className="p-1 rounded-lg inline-flex items-center gap-2 self-start hover:bg-bg-secondary transition-colors"
      >
        <Icon name="arrow_back" size={20} className="text-icon-accent-primary" />
        <span className="text-text-accent-primary text-base font-medium leading-4">Volver a {userName}</span>
      </button>

      <h1 className="text-text-primary text-3xl font-semibold leading-8">Editar Usuario</h1>

      <PersonalInfoSection data={personalInfo} onChange={updateField} idPrefix="edit" />

      <RoleAssignmentSection
        selectedRoles={selectedRoles}
        onToggleRole={toggleRole}
        enrolledCourses={enrolledCourses}
        onEnrolledCoursesChange={setEnrolledCourses}
        teachingCourses={teachingCourses}
        onTeachingCoursesChange={setTeachingCourses}
        studentName={userName}
      />

      <div className="flex justify-end items-center gap-4">
        <button
          onClick={() => router.push(`/plataforma/admin/usuarios/${userId}`)}
          className="px-6 py-3 bg-bg-primary rounded-lg outline outline-1 outline-offset-[-1px] outline-stroke-primary flex items-center gap-1.5 hover:bg-bg-secondary transition-colors"
        >
          <span className="text-text-tertiary text-sm font-medium leading-4">Cancelar</span>
        </button>
        <button
          onClick={handleSave}
          disabled={saving || !canSave}
          className="px-6 py-3 bg-bg-accent-primary-solid rounded-lg flex items-center gap-1.5 hover:bg-bg-accent-solid-hover transition-colors disabled:opacity-50"
        >
          <span className="text-text-white text-sm font-medium leading-4">{saving ? 'Guardando...' : 'Guardar'}</span>
        </button>
      </div>
    </div>
  );
}
