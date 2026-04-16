"use client";

import {
  coursesService,
  type AdminCourseCycleItem,
} from "@/services/courses.service";
import type {
  BankStructureResponse,
  CurrentCycleResponse,
  PreviousCyclesResponse,
} from "@/types/curso";
import type { Enrollment } from "@/types/enrollment";

export type AdminPreviewView = "advisor" | "student";

export interface AdminPreviewBaseData {
  enrollment: Enrollment;
  currentCycle: CurrentCycleResponse | null;
  previousCycles: PreviousCyclesResponse | null;
  bankStructure: BankStructureResponse | null;
  introVideoUrl: string | null;
  teacherName: string;
  teacherInitials: string;
}

function getProfessorInitials(firstName?: string, lastName1?: string): string {
  return `${firstName?.[0] || "X"}${lastName1?.[0] || "X"}`.toUpperCase();
}

async function loadAllAdminCourseCycles(): Promise<AdminCourseCycleItem[]> {
  const firstPage = await coursesService.getAdminCourseCycles({
    page: 1,
    pageSize: 100,
  });

  const items = [...firstPage.items];
  for (let page = 2; page <= firstPage.totalPages; page += 1) {
    const response = await coursesService.getAdminCourseCycles({
      page,
      pageSize: 100,
    });
    items.push(...response.items);
  }

  return items;
}

export function getPreviewView(input?: string | null): AdminPreviewView {
  return input === "student" ? "student" : "advisor";
}

export function withPreviewView(path: string, view: AdminPreviewView): string {
  return `${path}${path.includes("?") ? "&" : "?"}view=${view}`;
}

export async function loadAdminPreviewBaseData(
  courseCycleId: string,
): Promise<AdminPreviewBaseData> {
  const [catalog, cycleItems, content, previous, bank, introVideo] =
    await Promise.all([
      coursesService.findAll(),
      loadAllAdminCourseCycles(),
      coursesService.getCourseContent(courseCycleId),
      coursesService.getPreviousCycles(courseCycleId).catch(() => null),
      coursesService.getBankStructure(courseCycleId).catch(() => null),
      coursesService.getIntroVideoLink(courseCycleId).catch(() => null),
    ]);

  const selectedCycle =
    cycleItems.find((item) => item.courseCycleId === courseCycleId) || null;

  if (!selectedCycle) {
    throw new Error("No se encontró el curso-ciclo solicitado.");
  }

  const course =
    catalog.find((item) => item.id === selectedCycle.course.id) || null;

  if (!course) {
    throw new Error("No se encontró la materia asociada al curso-ciclo.");
  }

  const leadProfessor = selectedCycle.professors[0];

  return {
    enrollment: {
      id: `admin-preview-${selectedCycle.courseCycleId}`,
      enrolledAt: "",
      courseCycle: {
        id: selectedCycle.courseCycleId,
        courseId: course.id,
        academicCycleId: selectedCycle.academicCycle.id,
        course: {
          id: course.id,
          code: course.code,
          name: course.name,
          courseType: {
            code:
              course.courseType?.code ||
              String(course.courseType?.name || "").toUpperCase(),
            name: course.courseType?.name || "Sin unidad",
          },
          cycleLevel: {
            name: course.cycleLevel?.name || "",
          },
        },
        academicCycle: {
          id: selectedCycle.academicCycle.id,
          code: selectedCycle.academicCycle.code,
          isCurrent: selectedCycle.academicCycle.isCurrent,
        },
        professors: selectedCycle.professors.map((professor) => ({
          id: professor.id,
          firstName: professor.firstName,
          lastName1: professor.lastName1,
          profilePhotoUrl: professor.profilePhotoUrl,
        })),
      },
    },
    currentCycle: content,
    previousCycles: previous,
    bankStructure: bank,
    introVideoUrl: introVideo?.url || null,
    teacherName: leadProfessor
      ? `${leadProfessor.firstName} ${leadProfessor.lastName1}`.trim()
      : "Sin asignar",
    teacherInitials: leadProfessor
      ? getProfessorInitials(leadProfessor.firstName, leadProfessor.lastName1)
      : "XX",
  };
}
