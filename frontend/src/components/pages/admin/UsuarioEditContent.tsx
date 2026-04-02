'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Icon from '@/components/ui/Icon';
import FloatingInput from '@/components/ui/FloatingInput';
import { useBreadcrumb } from '@/contexts/BreadcrumbContext';
import { useToast } from '@/components/ui/ToastContainer';
import { usersService } from '@/services/users.service';
import type { AdminUserDetail, AdminUserDetailCourse } from '@/services/users.service';
import { EnrollmentSection, TeachingSection } from './UserCourseSections';

// ============================================
// Role config
// ============================================

const ROLE_OPTIONS = [
  { code: 'STUDENT', label: 'Alumno', backendLabel: 'Alumno' },
  { code: 'PROFESSOR', label: 'Asesor', backendLabel: 'Asesor' },
  { code: 'ADMIN', label: 'Administrador', backendLabel: 'Administrador', adminOnly: true },
  { code: 'SUPER_ADMIN', label: 'Superadministrador', backendLabel: 'Superadministrador', adminOnly: true },
];

// ============================================
// Main component
// ============================================

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

  // Form state
  const [firstName, setFirstName] = useState('');
  const [lastName1, setLastName1] = useState('');
  const [lastName2, setLastName2] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [careerId, setCareerId] = useState<number | null>(null);
  const [careerName, setCareerName] = useState('');
  const [careers, setCareers] = useState<Array<{ id: number; name: string }>>([]);
  const [careerDropdownOpen, setCareerDropdownOpen] = useState(false);

  // Roles
  const [selectedRoles, setSelectedRoles] = useState<Set<string>>(new Set());

  // Enrollment & Teaching
  const [enrolledCourses, setEnrolledCourses] = useState<AdminUserDetailCourse[]>([]);
  const [teachingCourses, setTeachingCourses] = useState<AdminUserDetailCourse[]>([]);

  // Load user data
  useEffect(() => {
    if (!userId) return;
    setLoading(true);

    Promise.all([
      usersService.getAdminDetail(userId),
      usersService.getCareers(),
    ])
      .then(([detail, careerList]) => {
        const { personalInfo } = detail;
        const name = `${personalInfo.firstName} ${personalInfo.lastName1}`;
        setUserName(name);
        setFirstName(personalInfo.firstName);
        setLastName1(personalInfo.lastName1);
        setLastName2(personalInfo.lastName2 || '');
        setEmail(personalInfo.email);
        setPhone(personalInfo.phone || '');
        setCareerId(personalInfo.careerId);
        setCareerName(personalInfo.careerName || '');
        setCareers(careerList);
        setEnrolledCourses(detail.enrolledCourses);
        setTeachingCourses(detail.teachingCourses);

        // Map backend role labels to codes
        const roleCodes = new Set<string>();
        personalInfo.roles.forEach((r) => {
          const found = ROLE_OPTIONS.find((o) => o.backendLabel === r);
          if (found) roleCodes.add(found.code);
        });
        setSelectedRoles(roleCodes);

        setBreadcrumbItems([
          { icon: 'groups', label: 'Usuarios', href: '/plataforma/admin/usuarios' },
          { label: name, href: `/plataforma/admin/usuarios/${userId}` },
          { label: 'Editar Usuario' },
        ]);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Error al cargar usuario'))
      .finally(() => setLoading(false));
  }, [userId, setBreadcrumbItems]);

  const toggleRole = (code: string) => {
    setSelectedRoles((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const hasStudentRole = selectedRoles.has('STUDENT');
  const hasTeacherRole = selectedRoles.has('PROFESSOR');

  const handleSave = async () => {
    setSaving(true);
    try {
      const roleCodesFinal = Array.from(selectedRoles);
      await usersService.adminEdit(userId, {
        personalInfo: {
          firstName: firstName.trim(),
          lastName1: lastName1.trim(),
          lastName2: lastName2.trim() || undefined,
          email: email.trim(),
          phone: phone.trim() || undefined,
          careerId: careerId || undefined,
        },
        roleCodesFinal,
        studentStateFinal: {
          enrollments: hasStudentRole
            ? enrolledCourses.map((c) => ({
                courseCycleId: c.courseCycleId,
                enrollmentTypeCode: 'FULL' as const,
              }))
            : [],
        },
        professorStateFinal: {
          courseCycleIds: hasTeacherRole ? teachingCourses.map((c) => c.courseCycleId) : [],
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
      {/* Back link */}
      <button
        onClick={() => router.push(`/plataforma/admin/usuarios/${userId}`)}
        className="p-1 rounded-lg inline-flex items-center gap-2 self-start hover:bg-bg-secondary transition-colors"
      >
        <Icon name="arrow_back" size={20} className="text-icon-accent-primary" />
        <span className="text-text-accent-primary text-base font-medium leading-4">Volver a {userName}</span>
      </button>

      {/* Title */}
      <h1 className="text-text-primary text-3xl font-semibold leading-8">Editar Usuario</h1>

      {/* Personal Info */}
      <div className="p-6 bg-bg-primary rounded-xl outline outline-1 outline-offset-[-1px] outline-stroke-secondary flex flex-col gap-6">
        <div className="flex items-start gap-2">
          <Icon name="person" size={20} className="text-icon-info-secondary" variant="rounded" />
          <span className="flex-1 text-text-primary text-lg font-semibold leading-5">Información Personal</span>
        </div>
        <div className="flex flex-col gap-4">
          <FloatingInput id="edit-firstName" label="Nombres" value={firstName} onChange={setFirstName} />
          <FloatingInput id="edit-lastName1" label="Primer Apellido" value={lastName1} onChange={setLastName1} />
          <FloatingInput id="edit-lastName2" label="Segundo Apellido" value={lastName2} onChange={setLastName2} />
          <FloatingInput id="edit-email" label="Correo Electrónico" value={email} onChange={setEmail} />
          <FloatingInput id="edit-phone" label="Teléfono" value={phone} onChange={setPhone} />

          {/* Career dropdown */}
          <div className="self-stretch relative flex flex-col justify-start items-start gap-1">
            <div
              onClick={() => setCareerDropdownOpen(!careerDropdownOpen)}
              className={`self-stretch h-12 px-3 py-3.5 bg-bg-primary rounded outline outline-1 outline-offset-[-1px] ${careerDropdownOpen ? 'outline-stroke-accent-secondary' : 'outline-stroke-primary'} inline-flex justify-start items-center gap-2 cursor-pointer`}
            >
              <span className={`flex-1 text-base font-normal leading-4 line-clamp-1 ${careerName ? 'text-text-primary' : 'text-text-tertiary'}`}>
                {careerName || 'Carrera'}
              </span>
              <Icon name="expand_more" size={20} className="text-icon-tertiary" />
            </div>
            {(careerName || careerDropdownOpen) && (
              <div className="px-1 left-[8px] top-[-7px] absolute bg-bg-primary inline-flex justify-start items-start">
                <span className={`text-xs font-normal leading-4 ${careerDropdownOpen ? 'text-text-accent-primary' : 'text-text-tertiary'}`}>Carrera</span>
              </div>
            )}
            {careerDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 z-10 max-h-60 overflow-y-auto p-1 bg-bg-primary rounded-lg shadow-[2px_4px_4px_0px_rgba(0,0,0,0.05)] outline outline-1 outline-offset-[-1px] outline-stroke-secondary flex flex-col">
                {careers.map((career) => (
                  <button
                    key={career.id}
                    onClick={() => { setCareerId(career.id); setCareerName(career.name); setCareerDropdownOpen(false); }}
                    className="px-2 py-3 rounded text-left text-text-secondary text-sm font-normal leading-4 hover:bg-bg-secondary transition-colors"
                  >
                    {career.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Role Assignment + Connected sections */}
      <div className="flex flex-col">
        {/* Roles card */}
        <div className="p-6 bg-bg-primary rounded-xl outline outline-1 outline-offset-[-1px] outline-stroke-secondary flex flex-col gap-6">
          <div className="flex items-start gap-2">
            <Icon name="badge" size={20} className="text-icon-info-secondary" variant="rounded" />
            <span className="flex-1 text-text-primary text-lg font-semibold leading-5">Asignación de Roles</span>
          </div>
          <div className="flex flex-col gap-4">
            {ROLE_OPTIONS.map(({ code, label, adminOnly }) => {
              const checked = selectedRoles.has(code);
              const disabled = !!adminOnly;
              return (
                <button
                  key={code}
                  onClick={() => !disabled && toggleRole(code)}
                  disabled={disabled}
                  className={`self-stretch p-4 rounded-lg flex items-center gap-2 transition-colors ${
                    disabled
                      ? 'bg-gray-200 cursor-not-allowed'
                      : checked
                        ? 'bg-bg-primary outline outline-1 outline-stroke-accent-primary'
                        : 'bg-bg-primary outline outline-1 outline-stroke-primary hover:bg-bg-secondary'
                  }`}
                >
                  <div className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-colors ${
                    disabled
                      ? 'border-icon-disabled bg-transparent'
                      : checked
                        ? 'bg-bg-accent-primary-solid border-bg-accent-primary-solid'
                        : 'border-icon-tertiary bg-transparent'
                  }`}>
                    {checked && !disabled && <Icon name="check" size={14} className="text-icon-white" />}
                  </div>
                  <span className={`flex-1 text-base font-normal leading-4 text-left ${disabled ? 'text-text-disabled' : 'text-text-secondary'}`}>
                    {label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Connected enrollment/teaching sections */}
        {(hasStudentRole || hasTeacherRole) && (
          <div className="pt-4 border-stroke-secondary flex flex-col gap-4">
            {hasStudentRole && (
              <EnrollmentSection courses={enrolledCourses} onCoursesChange={setEnrolledCourses} />
            )}
            {hasTeacherRole && (
              <TeachingSection courses={teachingCourses} onCoursesChange={setTeachingCourses} />
            )}
          </div>
        )}
      </div>

      {/* Footer buttons */}
      <div className="flex justify-end items-center gap-4">
        <button
          onClick={() => router.push(`/plataforma/admin/usuarios/${userId}`)}
          className="px-6 py-3 bg-bg-primary rounded-lg outline outline-1 outline-offset-[-1px] outline-stroke-primary flex items-center gap-1.5 hover:bg-bg-secondary transition-colors"
        >
          <span className="text-text-tertiary text-sm font-medium leading-4">Cancelar</span>
        </button>
        <button
          onClick={handleSave}
          disabled={saving || !firstName.trim() || !lastName1.trim() || !email.trim()}
          className="px-6 py-3 bg-bg-accent-primary-solid rounded-lg flex items-center gap-1.5 hover:bg-bg-accent-solid-hover transition-colors disabled:opacity-50"
        >
          <span className="text-text-white text-sm font-medium leading-4">{saving ? 'Guardando...' : 'Guardar'}</span>
        </button>
      </div>
    </div>
  );
}
