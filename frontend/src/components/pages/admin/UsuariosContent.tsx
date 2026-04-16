'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Icon from '@/components/ui/Icon';
import FloatingSelect from '@/components/ui/FloatingSelect';
import { useBreadcrumb } from '@/contexts/BreadcrumbContext';
import { useToast } from '@/components/ui/ToastContainer';
import { usersService } from '@/services/users.service';
import type { AdminUserItem, AdminUserSortField, AdminUserSortOrder } from '@/services/users.service';

// ============================================
// Role tag styling
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

function RoleTags({ roles }: { roles: string[] }) {
  if (roles.length === 0) return <span className="text-text-tertiary text-sm">—</span>;
  const sorted = sortRoles(roles);

  // Show first role; if there are more, show "+N"
  if (sorted.length === 1) {
    return <RoleTag role={sorted[0]} />;
  }
  return (
    <div className="flex items-center gap-2">
      <RoleTag role={sorted[0]} />
      <span className="px-2.5 py-1.5 bg-bg-quartiary rounded-full text-text-secondary text-xs font-medium leading-3 whitespace-nowrap">
        +{sorted.length - 1}
      </span>
    </div>
  );
}

// ============================================
// Role filter pills
// ============================================

const ROLE_FILTERS: { label: string; value: string }[] = [
  { label: 'Todos', value: '' },
  { label: 'Alumnos', value: 'STUDENT' },
  { label: 'Asesores', value: 'PROFESSOR' },
  { label: 'Administradores', value: 'ADMIN' },
  { label: 'Superadministradores', value: 'SUPER_ADMIN' },
];

// ============================================
// Pagination
// ============================================

function getPageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | '...')[] = [1];
  if (current > 3) pages.push('...');
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
    pages.push(i);
  }
  if (current < total - 2) pages.push('...');
  pages.push(total);
  return pages;
}

// ============================================
// Main component
// ============================================

export default function UsuariosContent() {
  const router = useRouter();
  const { setBreadcrumbItems } = useBreadcrumb();
  const { showToast } = useToast();

  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [careerFilter, setCareerFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ACTIVE' | 'INACTIVE' | ''>('');
  const [sortBy, setSortBy] = useState<AdminUserSortField | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<AdminUserSortOrder>('DESC');

  // Sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarRole, setSidebarRole] = useState('');
  const [sidebarCareer, setSidebarCareer] = useState('');
  const [sidebarStatus, setSidebarStatus] = useState<'ACTIVE' | 'INACTIVE' | ''>('');
  const [careers, setCareers] = useState<Array<{ id: number; name: string }>>([]);

  // Context menu state
  const [menuUserId, setMenuUserId] = useState<string | null>(null);
  const [statusUpdatingUserId, setStatusUpdatingUserId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setBreadcrumbItems([
      { icon: 'groups', label: 'Usuarios' },
    ]);
  }, [setBreadcrumbItems]);

  // Load careers for filter sidebar
  useEffect(() => {
    usersService.getCareers().then(setCareers).catch(() => setCareers([]));
  }, []);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [roleFilter, careerFilter, statusFilter]);

  // Fetch users
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await usersService.getAdminUsers({
        page: currentPage,
        search: debouncedSearch || undefined,
        roles: roleFilter || undefined,
        careerIds: careerFilter || undefined,
        status: statusFilter || undefined,
        sortBy: sortBy || undefined,
        sortOrder: sortBy ? sortOrder : undefined,
      });
      setUsers(response.items);
      setTotalItems(response.totalItems);
      setTotalPages(response.totalPages);
      setPageSize(response.pageSize);
    } catch (err) {
      console.error('Error al cargar usuarios:', err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, debouncedSearch, roleFilter, careerFilter, statusFilter, sortBy, sortOrder]);

  // Open sidebar: sync local sidebar state from active filters
  const openSidebar = () => {
    setSidebarRole(roleFilter);
    setSidebarCareer(careerFilter);
    setSidebarStatus(statusFilter);
    setSidebarOpen(true);
  };

  const applySidebarFilters = () => {
    setRoleFilter(sidebarRole);
    setCareerFilter(sidebarCareer);
    setStatusFilter(sidebarStatus);
    setSidebarOpen(false);
  };

  const clearSidebarFilters = () => {
    setSidebarRole('');
    setSidebarCareer('');
    setSidebarStatus('');
  };

  const activeFilterCount = [roleFilter, careerFilter, statusFilter].filter(Boolean).length;

  // Close context menu on outside click
  useEffect(() => {
    if (!menuUserId) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuUserId(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuUserId]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSort = (field: AdminUserSortField) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === 'ASC' ? 'DESC' : 'ASC'));
    } else {
      setSortBy(field);
      setSortOrder('ASC');
    }
    setCurrentPage(1);
  };

  const rangeStart = (currentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(currentPage * pageSize, totalItems);
  const pageNumbers = getPageNumbers(currentPage, totalPages);

  const goToUserDetail = (userId: string) => {
    router.push(`/plataforma/admin/usuarios/${encodeURIComponent(userId)}`);
  };

  const goToUserEdit = (userId: string) => {
    router.push(`/plataforma/admin/usuarios/${encodeURIComponent(userId)}/editar`);
  };

  const handleToggleUserStatus = async (user: AdminUserItem) => {
    setStatusUpdatingUserId(user.id);
    try {
      const nextIsActive = !user.isActive;
      await usersService.updateStatus(user.id, nextIsActive);
      setUsers((currentUsers) =>
        currentUsers.map((currentUser) =>
          currentUser.id === user.id
            ? { ...currentUser, isActive: nextIsActive }
            : currentUser,
        ),
      );
      setMenuUserId(null);
      showToast({
        type: 'success',
        title: nextIsActive ? 'Usuario activado' : 'Usuario inactivado',
        description: nextIsActive
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
      setStatusUpdatingUserId(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-text-primary text-3xl font-semibold leading-10">Gestión de Usuarios</h1>
        <button onClick={() => router.push('/plataforma/admin/usuarios/registrar')} className="px-6 py-3 bg-bg-accent-primary-solid rounded-lg flex justify-center items-center gap-1.5 hover:bg-bg-accent-solid-hover transition-colors">
          <Icon name="person_add_alt" size={16} className="text-icon-white" />
          <span className="text-text-white text-sm font-medium leading-4">Registrar Usuario</span>
        </button>
      </div>

      {/* Filters bar */}
      <div className="p-3 bg-bg-primary rounded-xl outline outline-1 outline-offset-[-1px] outline-stroke-secondary flex flex-col gap-4">
        <div className="flex items-start gap-4">
          {/* Search */}
          <div className="flex-1 h-10 px-2.5 py-3 bg-bg-primary rounded outline outline-1 outline-offset-[-1px] outline-stroke-primary inline-flex items-center gap-2 focus-within:outline-stroke-accent-secondary transition-colors">
            <Icon name="search" size={16} className="text-icon-tertiary" />
            <input
              type="text"
              placeholder="Buscar por nombre o correo"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 text-text-primary text-sm font-normal leading-4 bg-transparent outline-none placeholder:text-text-tertiary"
            />
          </div>

          {/* Filtros button */}
          <button onClick={openSidebar} className="h-10 px-6 bg-bg-primary rounded-lg outline outline-1 outline-offset-[-1px] outline-stroke-accent-primary flex items-center gap-1.5 hover:bg-bg-accent-light transition-colors">
            <Icon name="filter_list" size={16} className="text-icon-accent-primary" />
            <span className="text-text-accent-primary text-sm font-medium leading-4">Filtros</span>
            {activeFilterCount > 0 && (
              <span className="w-5 h-5 bg-bg-accent-primary-solid rounded-full flex items-center justify-center text-text-white text-[10px] font-medium">{activeFilterCount}</span>
            )}
          </button>
        </div>

        {/* Role pills */}
        <div className="flex items-center gap-2">
          {ROLE_FILTERS.map(({ label, value }) => {
            const isActive = roleFilter === value;
            return (
              <button
                key={value}
                onClick={() => setRoleFilter(value)}
                className={`px-4 py-2 rounded-full text-sm font-medium leading-4 transition-colors ${
                  isActive
                    ? 'bg-bg-accent-primary-solid text-text-white'
                    : 'bg-bg-primary outline outline-1 outline-offset-[-1px] outline-stroke-accent-primary text-text-accent-primary hover:bg-bg-accent-light'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Table */}
      <div className="bg-bg-primary rounded-xl outline outline-1 outline-stroke-primary flex flex-col">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="h-12 px-4 bg-bg-tertiary border-b border-stroke-primary text-left first:rounded-tl-xl cursor-pointer select-none" onClick={() => handleSort('fullName')}>
                <div className="flex items-center gap-2">
                  <span className="text-text-secondary text-sm font-medium leading-4">Nombre Completo</span>
                  <Icon name={sortBy === 'fullName' ? (sortOrder === 'ASC' ? 'arrow_upward' : 'arrow_downward') : 'swap_vert'} size={16} className={sortBy === 'fullName' ? 'text-icon-accent-primary' : 'text-icon-secondary'} />
                </div>
              </th>
              <th className="h-12 px-4 bg-bg-tertiary border-b border-stroke-primary text-left cursor-pointer select-none" onClick={() => handleSort('email')}>
                <div className="flex items-center gap-2">
                  <span className="text-text-secondary text-sm font-medium leading-4">Correo Electrónico</span>
                  <Icon name={sortBy === 'email' ? (sortOrder === 'ASC' ? 'arrow_upward' : 'arrow_downward') : 'swap_vert'} size={16} className={sortBy === 'email' ? 'text-icon-accent-primary' : 'text-icon-secondary'} />
                </div>
              </th>
              <th className="h-12 px-4 bg-bg-tertiary border-b border-stroke-primary text-left w-48">
                <span className="text-text-secondary text-sm font-medium leading-4">Rol</span>
              </th>
              <th className="h-12 px-4 bg-bg-tertiary border-b border-stroke-primary text-left cursor-pointer select-none" onClick={() => handleSort('careerName')}>
                <div className="flex items-center gap-2">
                  <span className="text-text-secondary text-sm font-medium leading-4">Carrera</span>
                  <Icon name={sortBy === 'careerName' ? (sortOrder === 'ASC' ? 'arrow_upward' : 'arrow_downward') : 'swap_vert'} size={16} className={sortBy === 'careerName' ? 'text-icon-accent-primary' : 'text-icon-secondary'} />
                </div>
              </th>
              <th className="h-12 px-4 bg-bg-tertiary border-b border-stroke-primary text-left w-24">
                <span className="text-text-secondary text-sm font-medium leading-4">Estado</span>
              </th>
              <th className="h-12 px-4 bg-bg-tertiary border-b border-stroke-primary text-center w-20 last:rounded-tr-xl">
                <span className="text-text-secondary text-sm font-medium leading-4">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="py-16 text-center">
                  <div className="w-8 h-8 border-3 border-accent-solid border-t-transparent rounded-full animate-spin mx-auto"></div>
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <Icon name="person_off" size={48} className="text-icon-tertiary" variant="rounded" />
                    <span className="text-text-tertiary text-sm">No se encontraron usuarios</span>
                  </div>
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} onClick={() => goToUserDetail(user.id)} className="border-b border-stroke-primary last:border-b-0 cursor-pointer hover:bg-bg-secondary transition-colors">
                  <td className="h-14 px-4 py-2">
                    <span className="text-text-tertiary text-sm font-normal leading-4 line-clamp-2">{user.fullName}</span>
                  </td>
                  <td className="h-14 px-4 py-2">
                    <span className="text-text-tertiary text-sm font-normal leading-4 line-clamp-2">{user.email}</span>
                  </td>
                  <td className="h-14 px-4 py-2 w-48">
                    <RoleTags roles={user.roles} />
                  </td>
                  <td className="h-14 px-4 py-2">
                    <span className="text-text-tertiary text-sm font-normal leading-4 line-clamp-2">{user.careerName || '—'}</span>
                  </td>
                  <td className="h-14 px-4 py-2 w-24">
                    {user.isActive ? (
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-icon-success-primary rounded-full" />
                        <span className="text-text-success-primary text-xs font-medium leading-3">Activo</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-icon-placeholder rounded-full" />
                        <span className="text-text-disabled text-xs font-medium leading-3">Inactivo</span>
                      </div>
                    )}
                  </td>
                  <td className="h-14 px-4 py-2 w-20 text-center relative">
                    <button
                      onClick={(e) => { e.stopPropagation(); setMenuUserId(menuUserId === user.id ? null : user.id); }}
                      className="p-1 rounded-full hover:bg-bg-secondary transition-colors"
                    >
                      <Icon name="more_vert" size={20} className="text-icon-tertiary" />
                    </button>
                    {menuUserId === user.id && (
                      <div ref={menuRef} className="absolute right-8 top-10 z-30 w-48 p-1 bg-bg-primary rounded-lg shadow-[2px_4px_4px_0px_rgba(0,0,0,0.05)] outline outline-1 outline-offset-[-1px] outline-stroke-secondary inline-flex flex-col justify-start items-start">
                        <button onClick={(e) => { e.stopPropagation(); setMenuUserId(null); goToUserDetail(user.id); }} className="self-stretch px-2 py-3 bg-bg-primary rounded inline-flex justify-start items-center gap-2 hover:bg-bg-secondary transition-colors">
                          <Icon name="visibility" size={20} className="text-icon-secondary" variant="rounded" />
                          <span className="flex-1 text-text-secondary text-sm font-normal leading-4 text-left">Ver</span>
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); setMenuUserId(null); goToUserEdit(user.id); }} className="self-stretch px-2 py-3 bg-bg-primary rounded inline-flex justify-start items-center gap-2 hover:bg-bg-secondary transition-colors">
                          <Icon name="edit" size={20} className="text-icon-secondary" variant="rounded" />
                          <span className="flex-1 text-text-secondary text-sm font-normal leading-4 text-left">Editar</span>
                        </button>
                        <div className="self-stretch h-0 outline outline-1 outline-offset-[-0.50px] outline-stroke-secondary" />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (statusUpdatingUserId === user.id) return;
                            handleToggleUserStatus(user);
                          }}
                          disabled={statusUpdatingUserId === user.id}
                          className="self-stretch px-2 py-3 bg-bg-primary rounded inline-flex justify-start items-center gap-2 hover:bg-bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Icon name={user.isActive ? 'person_off' : 'check_circle'} size={20} className="text-icon-secondary" variant="rounded" />
                          <span className="flex-1 text-text-secondary text-sm font-normal leading-4 text-left">
                            {statusUpdatingUserId === user.id
                              ? 'Actualizando...'
                              : user.isActive
                                ? 'Inactivar'
                                : 'Activar'}
                          </span>
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {totalItems > 0 && (
          <div className="px-4 py-3 flex justify-between items-center border-t">
            <div className="flex items-center gap-1">
              <span className="text-text-tertiary text-sm font-normal leading-4">Mostrando</span>
              <span className="text-text-tertiary text-sm font-medium leading-4">{rangeStart}-{rangeEnd}</span>
              <span className="text-text-tertiary text-sm font-normal leading-4">de</span>
              <span className="text-text-tertiary text-sm font-medium leading-4">{totalItems}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg outline outline-1 outline-offset-[-1px] outline-stroke-primary flex items-center disabled:opacity-40"
              >
                <Icon name="chevron_left" size={16} className="text-icon-tertiary" />
              </button>
              <div className="flex items-center gap-2">
                {pageNumbers.map((page, idx) =>
                  page === '...' ? (
                    <span key={`dots-${idx}`} className="min-w-8 px-1 py-2 text-center text-text-tertiary text-sm font-normal leading-4">...</span>
                  ) : (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`min-w-8 px-1 py-2 rounded-lg text-sm font-medium leading-4 ${
                        page === currentPage
                          ? 'bg-bg-accent-primary-solid text-text-white'
                          : 'text-text-tertiary font-normal hover:bg-bg-secondary'
                      }`}
                    >
                      {page}
                    </button>
                  ),
                )}
              </div>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg outline outline-1 outline-offset-[-1px] outline-stroke-primary flex items-center disabled:opacity-40"
              >
                <Icon name="chevron_right" size={16} className="text-icon-tertiary" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Filters Sidebar Overlay */}
      <div className={`fixed inset-0 z-50 flex justify-end transition-opacity duration-300 ${sidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/20" onClick={() => setSidebarOpen(false)} />

        {/* Panel */}
        <div className={`relative w-[400px] h-full bg-bg-primary shadow-[0px_24px_48px_-12px_rgba(0,0,0,0.15)] border-l border-stroke-secondary flex flex-col transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}>
            {/* Header */}
            <div className="pl-6 pr-3.5 py-6 border-b border-stroke-secondary flex items-center gap-4">
              <div className="flex-1 flex items-center gap-2">
                <div className="p-2 bg-bg-accent-light rounded-full flex items-center">
                  <Icon name="filter_list" size={20} className="text-icon-accent-primary" />
                </div>
                <span className="flex-1 text-text-primary text-xl font-semibold leading-6">Filtros Avanzados</span>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="p-1.5 rounded-full hover:bg-bg-secondary transition-colors">
                <Icon name="close" size={24} className="text-icon-tertiary" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 p-6 flex flex-col gap-8 overflow-y-auto">
              {/* Rol */}
              <div className="flex flex-col gap-4">
                <span className="text-gray-600 text-base font-semibold leading-5">Rol</span>
                <div className="flex flex-wrap items-center gap-2">
                  {ROLE_FILTERS.map(({ label, value }) => {
                    const isActive = sidebarRole === value;
                    return (
                      <button
                        key={value}
                        onClick={() => setSidebarRole(value)}
                        className={`px-4 py-2 rounded-full text-sm font-medium leading-4 transition-colors ${
                          isActive
                            ? 'bg-bg-accent-primary-solid text-text-white'
                            : 'bg-bg-primary outline outline-1 outline-offset-[-1px] outline-stroke-accent-primary text-text-accent-primary hover:bg-bg-accent-light'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Carrera */}
              <div className="flex flex-col gap-4">
                <span className="text-gray-600 text-base font-semibold leading-5">Carrera</span>
                <FloatingSelect
                  label="Carrera"
                  value={sidebarCareer || null}
                  options={careers.map((career) => ({
                    value: String(career.id),
                    label: career.name,
                  }))}
                  onChange={(value) => setSidebarCareer(value || '')}
                  allLabel="Todas"
                  className="w-full"
                  variant="filled"
                  size="large"
                />
              </div>

              {/* Estado */}
              <div className="flex flex-col gap-4">
                <span className="text-gray-600 text-base font-semibold leading-5">Estado</span>
                <div className="flex flex-col gap-2">
                  {([['ACTIVE', 'Activo'], ['INACTIVE', 'Inactivo']] as const).map(([val, label]) => {
                    const checked = sidebarStatus === val;
                    return (
                      <button
                        key={val}
                        onClick={() => setSidebarStatus(checked ? '' : val)}
                        className="flex items-center gap-1"
                      >
                        <div className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-colors ${checked ? 'bg-bg-accent-primary-solid border-bg-accent-primary-solid' : 'border-icon-tertiary bg-transparent'}`}>
                          {checked && <Icon name="check" size={14} className="text-icon-white" />}
                        </div>
                        <span className="flex-1 text-text-secondary text-base font-normal leading-4 text-left">{label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-stroke-secondary flex justify-end items-center gap-4">
              <button
                onClick={clearSidebarFilters}
                className="px-6 py-3 bg-bg-primary rounded-lg outline outline-1 outline-offset-[-1px] outline-stroke-primary flex items-center gap-1.5 hover:bg-bg-secondary transition-colors"
              >
                <span className="text-text-tertiary text-sm font-medium leading-4">Limpiar Todo</span>
              </button>
              <button
                onClick={applySidebarFilters}
                className="px-6 py-3 bg-bg-accent-primary-solid rounded-lg flex items-center gap-1.5 hover:bg-bg-accent-solid-hover transition-colors"
              >
                <span className="text-text-white text-sm font-medium leading-4">Aplicar Filtros</span>
              </button>
            </div>
        </div>
      </div>
    </div>
  );
}
