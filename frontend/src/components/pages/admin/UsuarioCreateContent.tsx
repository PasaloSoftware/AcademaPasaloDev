'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Icon from '@/components/ui/Icon';
import { useBreadcrumb } from '@/contexts/BreadcrumbContext';
import { useToast } from '@/components/ui/ToastContainer';
import { usersService } from '@/services/users.service';
import type { AdminUserDetailCourse } from '@/services/users.service';
import {
  PersonalInfoSection,
  RoleAssignmentSection,
} from './UserCourseSections';
import type { PersonalInfoData } from './UserCourseSections';

export default function UsuarioCreateContent() {
  const router = useRouter();
  const { setBreadcrumbItems } = useBreadcrumb();
  const { showToast } = useToast();

  const [saving, setSaving] = useState(false);

  const [personalInfo, setPersonalInfo] = useState<PersonalInfoData>({
    firstName: '', lastName1: '', lastName2: '', email: '', phone: '', career: null,
  });
  const [selectedRoles, setSelectedRoles] = useState<Set<string>>(new Set(['STUDENT']));
  const [enrolledCourses, setEnrolledCourses] = useState<AdminUserDetailCourse[]>([]);
  const [teachingCourses, setTeachingCourses] = useState<AdminUserDetailCourse[]>([]);

  useEffect(() => {
    setBreadcrumbItems([
      { icon: 'groups', label: 'Usuarios', href: '/plataforma/admin/usuarios' },
      { label: 'Registrar Usuario' },
    ]);
  }, [setBreadcrumbItems]);

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

  const canSave = personalInfo.firstName.trim() && personalInfo.lastName1.trim() && personalInfo.email.trim() && selectedRoles.size > 0;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const roleCodes = Array.from(selectedRoles);

      let studentEnrollment;
      if (selectedRoles.has('STUDENT') && enrolledCourses.length > 0) {
        studentEnrollment = {
          courseCycleId: enrolledCourses[0].courseCycleId,
          enrollmentTypeCode: 'FULL' as const,
        };
      }

      let professorAssignments;
      if (selectedRoles.has('PROFESSOR') && teachingCourses.length > 0) {
        professorAssignments = {
          courseCycleIds: teachingCourses.map((c) => c.courseCycleId),
        };
      }

      await usersService.adminOnboarding({
        email: personalInfo.email.trim(),
        firstName: personalInfo.firstName.trim(),
        lastName1: personalInfo.lastName1.trim(),
        lastName2: personalInfo.lastName2.trim() || undefined,
        phone: personalInfo.phone.trim() || undefined,
        careerId: personalInfo.career?.id || undefined,
        roleCodes,
        studentEnrollment,
        professorAssignments,
      });

      showToast({ type: 'success', title: 'Usuario registrado', description: 'El usuario ha sido creado correctamente.' });
      router.push('/plataforma/admin/usuarios');
    } catch (err) {
      showToast({ type: 'error', title: 'Error', description: err instanceof Error ? err.message : 'No se pudo registrar el usuario.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <button
        onClick={() => router.push('/plataforma/admin/usuarios')}
        className="p-1 rounded-lg inline-flex items-center gap-2 self-start hover:bg-bg-secondary transition-colors"
      >
        <Icon name="arrow_back" size={20} className="text-icon-accent-primary" />
        <span className="text-text-accent-primary text-base font-medium leading-4">Volver a Gestión de Usuarios</span>
      </button>

      <h1 className="text-text-primary text-3xl font-semibold leading-8">Registrar Usuario</h1>

      <PersonalInfoSection data={personalInfo} onChange={updateField} idPrefix="create" />

      <RoleAssignmentSection
        selectedRoles={selectedRoles}
        onToggleRole={toggleRole}
        enrolledCourses={enrolledCourses}
        onEnrolledCoursesChange={setEnrolledCourses}
        teachingCourses={teachingCourses}
        onTeachingCoursesChange={setTeachingCourses}
      />

      <div className="flex justify-end items-center gap-4">
        <button
          onClick={() => router.push('/plataforma/admin/usuarios')}
          className="px-6 py-3 bg-bg-primary rounded-lg outline outline-1 outline-offset-[-1px] outline-stroke-primary flex items-center gap-1.5 hover:bg-bg-secondary transition-colors"
        >
          <span className="text-text-tertiary text-sm font-medium leading-4">Cancelar</span>
        </button>
        <button
          onClick={handleSave}
          disabled={saving || !canSave}
          className={`px-6 py-3 rounded-lg flex items-center gap-1.5 transition-colors ${
            canSave && !saving
              ? 'bg-bg-accent-primary-solid hover:bg-bg-accent-solid-hover'
              : 'bg-bg-disabled cursor-not-allowed'
          }`}
        >
          <span className={`text-sm font-medium leading-4 ${canSave && !saving ? 'text-text-white' : 'text-text-disabled'}`}>
            {saving ? 'Guardando...' : 'Guardar'}
          </span>
        </button>
      </div>
    </div>
  );
}
