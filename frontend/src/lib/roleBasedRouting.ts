/**
 * Sistema de enrutamiento basado en roles
 * Define qué componentes debe ver cada rol en cada ruta
 */

import { UserRole } from "@/config/navigation";

export type RouteAccess = {
  allowedRoles: UserRole[];
  component: string; // Nombre del componente a renderizar
  redirectOnDenied?: string; // Ruta de redirección si no tiene acceso
};

/**
 * Configuración de acceso por ruta
 * Define qué roles pueden acceder a cada ruta y qué componente deben ver
 */
export const routeAccessConfig: Record<string, RouteAccess> = {
  "/plataforma/inicio": {
    allowedRoles: ["STUDENT", "TEACHER", "ADMIN", "SUPER_ADMIN"],
    component: "InicioContent",
    redirectOnDenied: "/plataforma/inicio",
  },
  "/plataforma/curso/[id]": {
    allowedRoles: ["STUDENT", "TEACHER", "ADMIN", "SUPER_ADMIN"],
    component: "CursoContent",
    redirectOnDenied: "/plataforma/inicio",
  },
  "/plataforma/curso/[id]/editar": {
    allowedRoles: ["ADMIN", "SUPER_ADMIN"],
    component: "CursoEditContent",
    redirectOnDenied: "/plataforma/inicio",
  },
  "/plataforma/curso/[id]/evaluacion/[id]": {
    allowedRoles: ["STUDENT", "TEACHER", "ADMIN", "SUPER_ADMIN"],
    component: "EvaluationContent",
    redirectOnDenied: "/plataforma/inicio",
  },
  "/plataforma/curso/[id]/evaluacion/[id]/clase/[id]": {
    allowedRoles: ["STUDENT", "TEACHER", "ADMIN", "SUPER_ADMIN"],
    component: "VideoPageContent",
    redirectOnDenied: "/plataforma/inicio",
  },
  "/plataforma/curso/[id]/ciclo-anterior/[id]": {
    allowedRoles: ["STUDENT", "TEACHER", "ADMIN", "SUPER_ADMIN"],
    component: "PreviousCycleContent",
    redirectOnDenied: "/plataforma/inicio",
  },
  "/plataforma/curso/[id]/ciclo-anterior/[id]/evaluacion/[id]": {
    allowedRoles: ["STUDENT", "TEACHER", "ADMIN", "SUPER_ADMIN"],
    component: "PreviousCycleEvaluationContent",
    redirectOnDenied: "/plataforma/inicio",
  },
  "/plataforma/curso/[id]/ciclo-anterior/[id]/evaluacion/[id]/clase/[id]": {
    allowedRoles: ["STUDENT", "TEACHER", "ADMIN", "SUPER_ADMIN"],
    component: "VideoPageContent",
    redirectOnDenied: "/plataforma/inicio",
  },
  "/plataforma/curso/[id]/banco/[id]": {
    allowedRoles: ["STUDENT", "TEACHER", "ADMIN", "SUPER_ADMIN"],
    component: "BancoEnunciadosContent",
    redirectOnDenied: "/plataforma/inicio",
  },
  "/plataforma/calendario": {
    allowedRoles: ["STUDENT", "TEACHER", "ADMIN"],
    component: "CalendarioContent",
    redirectOnDenied: "/plataforma/inicio",
  },
  "/plataforma/notificaciones": {
    allowedRoles: ["STUDENT", "TEACHER", "ADMIN", "SUPER_ADMIN"],
    component: "NotificacionesContent",
    redirectOnDenied: "/plataforma/inicio",
  },
  // Rutas de administración
  "/plataforma/admin/usuarios": {
    allowedRoles: ["ADMIN", "SUPER_ADMIN"],
    component: "UsuariosContent",
    redirectOnDenied: "/plataforma/inicio",
  },
  "/plataforma/admin/cursos": {
    allowedRoles: ["ADMIN", "SUPER_ADMIN"],
    component: "CursosContent",
    redirectOnDenied: "/plataforma/inicio",
  },
  "/plataforma/admin/cursos/crear": {
    allowedRoles: ["ADMIN", "SUPER_ADMIN"],
    component: "CursoCreateContent",
    redirectOnDenied: "/plataforma/inicio",
  },
  "/plataforma/admin/usuarios/registrar": {
    allowedRoles: ["ADMIN", "SUPER_ADMIN"],
    component: "UsuarioCreateContent",
    redirectOnDenied: "/plataforma/inicio",
  },
  "/plataforma/admin/usuarios/[id]": {
    allowedRoles: ["ADMIN", "SUPER_ADMIN"],
    component: "UsuarioDetailContent",
    redirectOnDenied: "/plataforma/inicio",
  },
  "/plataforma/admin/usuarios/[id]/editar": {
    allowedRoles: ["ADMIN", "SUPER_ADMIN"],
    component: "UsuarioEditContent",
    redirectOnDenied: "/plataforma/inicio",
  },
  "/plataforma/admin/auditoria": {
    allowedRoles: ["ADMIN", "SUPER_ADMIN"],
    component: "AuditoriaContent",
    redirectOnDenied: "/plataforma/inicio",
  },
  "/plataforma/admin/auditoria/[id]": {
    allowedRoles: ["ADMIN", "SUPER_ADMIN"],
    component: "AuditoriaDetalleContent",
    redirectOnDenied: "/plataforma/inicio",
  },
  "/plataforma/admin/valoraciones": {
    allowedRoles: ["ADMIN", "SUPER_ADMIN"],
    component: "ValoracionesContent",
    redirectOnDenied: "/plataforma/inicio",
  },
  "/plataforma/admin/configuracion": {
    allowedRoles: ["ADMIN", "SUPER_ADMIN"],
    component: "ConfiguracionContent",
    redirectOnDenied: "/plataforma/inicio",
  },
  // Ruta compartida para todos los roles
  "/plataforma/perfil": {
    allowedRoles: ["STUDENT", "TEACHER", "ADMIN", "SUPER_ADMIN"],
    component: "PerfilContent",
    redirectOnDenied: "/plataforma/inicio",
  },
};

/**
 * Componentes específicos por rol para cada ruta
 * Permite que la misma ruta renderice diferentes componentes según el rol
 */
export const roleBasedComponents: Record<
  string,
  Partial<Record<UserRole, string>>
> = {
  "/plataforma/inicio": {
    STUDENT: "student/InicioContent",
    TEACHER: "teacher/InicioContent",
    ADMIN: "admin/InicioContent",
    SUPER_ADMIN: "admin/InicioContent",
  },
  "/plataforma/curso/[id]": {
    STUDENT: "student/CursoContent",
    TEACHER: "teacher/CursoContent",
    ADMIN: "admin/CursoContent",
    SUPER_ADMIN: "admin/CursoContent",
  },
  "/plataforma/curso/[id]/editar": {
    ADMIN: "admin/CursoEditContent",
    SUPER_ADMIN: "admin/CursoEditContent",
  },
  "/plataforma/curso/[id]/evaluacion/[id]": {
    STUDENT: "student/EvaluationContent",
    TEACHER: "teacher/EvaluationContent",
    ADMIN: "admin/AdminPreviewEvaluationContent",
    SUPER_ADMIN: "admin/AdminPreviewEvaluationContent",
  },
  "/plataforma/curso/[id]/evaluacion/[id]/clase/[id]": {
    STUDENT: "student/VideoPageContent",
    TEACHER: "teacher/VideoPageContent",
    ADMIN: "admin/AdminPreviewVideoPageContent",
    SUPER_ADMIN: "admin/AdminPreviewVideoPageContent",
  },
  "/plataforma/curso/[id]/ciclo-anterior/[id]": {
    STUDENT: "student/PreviousCycleContent",
    TEACHER: "teacher/PreviousCycleContent",
    ADMIN: "admin/AdminPreviewPreviousCycleContent",
    SUPER_ADMIN: "admin/AdminPreviewPreviousCycleContent",
  },
  "/plataforma/curso/[id]/ciclo-anterior/[id]/evaluacion/[id]": {
    STUDENT: "student/PreviousCycleEvaluationContent",
    TEACHER: "teacher/PreviousCycleEvaluationContent",
    ADMIN: "admin/AdminPreviewPreviousCycleEvaluationContent",
    SUPER_ADMIN: "admin/AdminPreviewPreviousCycleEvaluationContent",
  },
  "/plataforma/curso/[id]/ciclo-anterior/[id]/evaluacion/[id]/clase/[id]": {
    STUDENT: "student/VideoPageContent",
    TEACHER: "teacher/VideoPageContent",
    ADMIN: "admin/AdminPreviewVideoPageContent",
    SUPER_ADMIN: "admin/AdminPreviewVideoPageContent",
  },
  "/plataforma/curso/[id]/banco/[id]": {
    STUDENT: "student/BancoEnunciadosContent",
    TEACHER: "teacher/BancoEnunciadosContent",
    ADMIN: "admin/AdminPreviewBancoEnunciadosContent",
    SUPER_ADMIN: "admin/AdminPreviewBancoEnunciadosContent",
  },
  "/plataforma/calendario": {
    STUDENT: "student/CalendarioContent",
    TEACHER: "teacher/CalendarioContent",
    ADMIN: "admin/CalendarioContent",
  },
  "/plataforma/notificaciones": {
    STUDENT: "student/NotificacionesContent",
    TEACHER: "teacher/NotificacionesContent",
    ADMIN: "admin/NotificacionesContent",
    SUPER_ADMIN: "admin/NotificacionesContent",
  },
  "/plataforma/admin/auditoria": {
    ADMIN: "admin/AuditoriaContent",
    SUPER_ADMIN: "admin/AuditoriaContent",
  },
  "/plataforma/admin/auditoria/[id]": {
    ADMIN: "admin/AuditoriaDetalleContent",
    SUPER_ADMIN: "admin/AuditoriaDetalleContent",
  },
  "/plataforma/admin/valoraciones": {
    ADMIN: "admin/ValoracionesContent",
    SUPER_ADMIN: "admin/ValoracionesContent",
  },
  "/plataforma/admin/configuracion": {
    ADMIN: "admin/ConfiguracionContent",
    SUPER_ADMIN: "admin/ConfiguracionContent",
  },
  "/plataforma/admin/usuarios": {
    ADMIN: "admin/UsuariosContent",
    SUPER_ADMIN: "admin/UsuariosContent",
  },
  "/plataforma/admin/cursos": {
    ADMIN: "admin/CursosContent",
    SUPER_ADMIN: "admin/CursosContent",
  },
  "/plataforma/admin/cursos/crear": {
    ADMIN: "admin/CursoCreateContent",
    SUPER_ADMIN: "admin/CursoCreateContent",
  },
  "/plataforma/admin/usuarios/registrar": {
    ADMIN: "admin/UsuarioCreateContent",
    SUPER_ADMIN: "admin/UsuarioCreateContent",
  },
  "/plataforma/admin/usuarios/[id]": {
    ADMIN: "admin/UsuarioDetailContent",
    SUPER_ADMIN: "admin/UsuarioDetailContent",
  },
  "/plataforma/admin/usuarios/[id]/editar": {
    ADMIN: "admin/UsuarioEditContent",
    SUPER_ADMIN: "admin/UsuarioEditContent",
  },
  "/plataforma/perfil": {
    STUDENT: "shared/PerfilContent",
    TEACHER: "teacher/PerfilContent",
    ADMIN: "shared/PerfilContent",
    SUPER_ADMIN: "shared/PerfilContent",
  },
};

/**
 * Verifica si un rol tiene acceso a una ruta específica
 */
export function hasRouteAccess(route: string, userRole: UserRole): boolean {
  const access = routeAccessConfig[route];
  if (!access) {
    // Si no está definida, denegar acceso por defecto (seguridad)
    console.warn(`⚠️ Ruta no configurada en routeAccessConfig: ${route}`);
    return false;
  }
  return access.allowedRoles.includes(userRole);
}

/**
 * Obtiene el componente que debe renderizar un rol en una ruta específica
 */
export function getComponentForRoute(
  route: string,
  userRole: UserRole,
): string | null {
  const components = roleBasedComponents[route];
  if (!components) {
    console.warn(`⚠️ Componentes no configurados para la ruta: ${route}`);
    return null;
  }

  const component = components[userRole];
  if (!component) {
    console.warn(`⚠️ Componente no configurado para ${userRole} en ${route}`);
    return null;
  }

  return component;
}

/**
 * Obtiene la ruta de redirección si el usuario no tiene acceso
 */
export function getRedirectOnDenied(route: string): string {
  const access = routeAccessConfig[route];
  return access?.redirectOnDenied || "/plataforma/inicio";
}

/**
 * Valida y sanitiza parámetros dinámicos de rutas
 * Previene ataques de inyección y path traversal
 */
export function sanitizeRouteParam(param: string): string {
  // Remover caracteres peligrosos
  return param.replace(/[^a-zA-Z0-9-_]/g, "");
}

/**
 * Normaliza una ruta dinámica para buscarla en la configuración
 * Ejemplo: /plataforma/curso/123 -> /plataforma/curso/[id]
 */
export function normalizeRoute(route: string): string {
  return route
    .replace(
      /\/plataforma\/admin\/auditoria\/[^/]+(?=\/|$)/i,
      "/plataforma/admin/auditoria/[id]",
    )
    .replace(
      /\/plataforma\/admin\/usuarios\/[^/]+\/editar(?=\/|$)/i,
      "/plataforma/admin/usuarios/[id]/editar",
    )
    .replace(
      /\/plataforma\/admin\/usuarios\/[^/]+(?=\/|$)/i,
      "/plataforma/admin/usuarios/[id]",
    )
    .replace(/\/[0-9a-f-]+(?=\/|$)/gi, "/[id]")
    .replace(/\/banco\/[^/]+(?=\/|$)/i, "/banco/[id]");
}
