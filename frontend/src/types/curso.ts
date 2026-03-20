/**
 * Tipos para el sistema de cursos - Mapeados a la API del backend
 */

// ============================================
// LEGACY TYPES (usados por data/cursos.ts y cursoService.ts)
// TODO: Remover cuando se elimine el mock data
// ============================================

export interface Curso {
  id: string;
  nombre: string;
  nombreCorto: string;
  descripcion: string;
  color: string;
  icono?: string;
  profesor?: string;
  creditos?: number;
  horario?: string;
  aula?: string;
  periodo?: string;
}

export interface CursoDetalle extends Curso {
  contenido: {
    unidades: Array<{
      id: string;
      titulo: string;
      descripcion: string;
      orden: number;
      temas: Array<{
        id: string;
        titulo: string;
        descripcion: string;
        orden: number;
        tipo: 'video' | 'lectura' | 'ejercicio' | 'examen';
        completado?: boolean;
      }>;
    }>;
    evaluaciones: Array<{
      id: string;
      titulo: string;
      tipo: 'tarea' | 'examen' | 'proyecto' | 'quiz';
      fecha: string;
      calificacion?: number;
      estado: 'pendiente' | 'entregado' | 'calificado' | 'vencido';
    }>;
    materiales: Array<{
      id: string;
      titulo: string;
      tipo: 'pdf' | 'video' | 'presentacion' | 'documento';
      url: string;
      fechaSubida: string;
    }>;
  };
  progreso?: number;
  calificacion?: number;
}

// ============================================
// CICLO VIGENTE - GET /courses/cycle/:id/current
// ============================================

export type EvaluationLabel = 'Completado' | 'En curso' | 'Próximamente' | 'Bloqueado';

export interface CycleEvaluation {
  id: string;
  evaluationTypeCode: string; // PC, EX, etc.
  shortName: string;          // PC1, EX1, etc.
  fullName: string;           // "Práctica Calificada 1", "Examen Parcial"
  label: EvaluationLabel;
}

export interface CurrentCycleResponse {
  courseCycleId: string;
  cycleCode: string;         // "2026-1"
  canViewPreviousCycles: boolean;
  evaluations: CycleEvaluation[];
}

// ============================================
// CONTENIDO CURSO (PROFESSOR) - GET /courses/cycle/:id/content
// ============================================

export interface StaffEvaluationStatus {
  status: 'LOCKED' | 'UPCOMING' | 'IN_PROGRESS' | 'COMPLETED';
  hasAccess: boolean;
  accessStart: string | null;
  accessEnd: string | null;
}

export interface StaffCourseEvaluation {
  id: string;
  name: string;
  description: string | null;
  evaluationType: string;
  startDate: string;
  endDate: string;
  userStatus: StaffEvaluationStatus;
}

export interface StaffCourseContentResponse {
  courseCycleId: string;
  courseName: string;
  courseCode: string;
  cycleCode: string;
  isCurrentCycle: boolean;
  evaluations: StaffCourseEvaluation[];
}

// ============================================
// CICLOS ANTERIORES - GET /courses/cycle/:id/previous-cycles
// ============================================

export interface PreviousCycle {
  cycleCode: string; // "2025-2", "2025-1"
}

export interface PreviousCyclesResponse {
  cycles: PreviousCycle[];
}

// ============================================
// CONTENIDO CICLO ANTERIOR - GET /courses/cycle/:id/previous-cycles/:cycleCode/content
// ============================================

export type PreviousCycleLabel = 'Archivado' | 'Bloqueado';

export interface PreviousCycleEvaluation {
  id: string;
  evaluationTypeCode: string;
  shortName: string;
  fullName: string;
  label: PreviousCycleLabel;
}

export interface PreviousCycleContentResponse {
  cycleCode: string;
  evaluations: PreviousCycleEvaluation[];
}

// ============================================
// BANCO DE ENUNCIADOS - GET /courses/cycle/:id/bank-structure
// ============================================

export interface BankStructureItem {
  evaluationTypeId: string;
  evaluationTypeCode: string;
  evaluationTypeName: string;
}

export interface BankStructureResponse {
  courseCycleId: string;
  cycleCode: string;
  items: BankStructureItem[];
}
