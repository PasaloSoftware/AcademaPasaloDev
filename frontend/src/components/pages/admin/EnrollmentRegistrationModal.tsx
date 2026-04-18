"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Modal from "@/components/ui/Modal";
import FloatingInput from "@/components/ui/FloatingInput";
import SearchableSelectField from "@/components/ui/SearchableSelectField";
import { useToast } from "@/components/ui/ToastContainer";
import { usersService } from "@/services/users.service";
import { enrollmentService } from "@/services/enrollment.service";
import {
  CheckboxChip,
  EnrollmentModeCard,
  EnrollmentSelectionList,
  ToggleSwitch,
} from "@/components/pages/admin/EnrollmentUi";
import Icon from "@/components/ui/Icon";

interface CourseCatalogItem {
  courseId: string;
  courseCode: string;
  courseName: string;
}

interface EvaluationOption {
  id: string;
  shortName: string;
  fullName: string;
  sourceCourseCycleId: string;
  sourceAcademicCycleCode: string;
}

interface HistoricalCycleOption {
  courseCycleId: string;
  academicCycleCode: string;
}

interface SelectedCourseConfig {
  courseId: string;
  courseCode: string;
  courseName: string;
  courseCycleId: string;
  academicCycleCode: string;
  evaluations: EvaluationOption[];
  historicalCycles: HistoricalCycleOption[];
}

export interface EnrollmentStudentOption {
  id: string;
  fullName: string;
  email: string;
}

interface CareerOption {
  id: number;
  name: string;
}

interface NewStudentFormData {
  firstName: string;
  lastName1: string;
  lastName2: string;
  email: string;
  phone: string;
  career: CareerOption | null;
}

type EnrollmentMode = "FULL" | "PARTIAL" | "HISTORICAL_ONLY";

interface EnrollmentRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEnrollmentCreated?: (payload: { isNewStudent: boolean }) => void;
  fixedCourseCycleId?: string | null;
  fixedStudent?: EnrollmentStudentOption | null;
}

export default function EnrollmentRegistrationModal({
  isOpen,
  onClose,
  onEnrollmentCreated,
  fixedCourseCycleId = null,
  fixedStudent = null,
}: EnrollmentRegistrationModalProps) {
  const { showToast } = useToast();

  const [courseCatalog, setCourseCatalog] = useState<CourseCatalogItem[]>([]);
  const [loadingCourseCatalog, setLoadingCourseCatalog] = useState(false);
  const [selectedCourse, setSelectedCourse] =
    useState<SelectedCourseConfig | null>(null);
  const [courseQuery, setCourseQuery] = useState("");
  const [loadingCourseConfig, setLoadingCourseConfig] = useState(false);
  const [isNewStudent, setIsNewStudent] = useState(false);
  const [studentQuery, setStudentQuery] = useState("");
  const [studentSearchResults, setStudentSearchResults] = useState<
    EnrollmentStudentOption[]
  >([]);
  const [searchingStudents, setSearchingStudents] = useState(false);
  const [selectedStudent, setSelectedStudent] =
    useState<EnrollmentStudentOption | null>(null);
  const [careers, setCareers] = useState<CareerOption[]>([]);
  const [loadingCareers, setLoadingCareers] = useState(false);
  const [careerQuery, setCareerQuery] = useState("");
  const [newStudentData, setNewStudentData] = useState<NewStudentFormData>({
    firstName: "",
    lastName1: "",
    lastName2: "",
    email: "",
    phone: "",
    career: null,
  });
  const [enrollmentMode, setEnrollmentMode] = useState<EnrollmentMode>("FULL");
  const [selectedEvaluationIds, setSelectedEvaluationIds] = useState<
    Set<string>
  >(new Set());
  const [historicalEnabled, setHistoricalEnabled] = useState(true);
  const [selectedHistoricalIds, setSelectedHistoricalIds] = useState<
    Set<string>
  >(new Set());
  const [historicalEvaluationsMap, setHistoricalEvaluationsMap] = useState<
    Record<string, EvaluationOption[]>
  >({});
  const [savingEnrollment, setSavingEnrollment] = useState(false);

  const lockCourse = Boolean(fixedCourseCycleId);
  const lockStudent = Boolean(fixedStudent);

  const filteredCourses = useMemo(() => {
    const normalizedQuery = courseQuery.trim().toLowerCase();
    if (!normalizedQuery) return courseCatalog.slice(0, 8);
    return courseCatalog
      .filter(
        (course) =>
          course.courseName.toLowerCase().includes(normalizedQuery) ||
          course.courseCode.toLowerCase().includes(normalizedQuery),
      )
      .slice(0, 8);
  }, [courseCatalog, courseQuery]);

  const filteredCareers = useMemo(() => {
    const normalizedQuery = careerQuery.trim().toLowerCase();
    if (!normalizedQuery) return careers.slice(0, 8);
    return careers
      .filter((career) => career.name.toLowerCase().includes(normalizedQuery))
      .slice(0, 8);
  }, [careerQuery, careers]);

  const hasHistoricalCycles =
    (selectedCourse?.historicalCycles.length || 0) > 0;

  const availableEvaluations = useMemo(() => {
    if (!selectedCourse) return [];

    const historicalEvaluations = historicalEnabled
      ? Array.from(selectedHistoricalIds).flatMap(
          (courseCycleId) => historicalEvaluationsMap[courseCycleId] || [],
        )
      : [];

    if (enrollmentMode === "HISTORICAL_ONLY") {
      return historicalEvaluations;
    }

    if (enrollmentMode === "PARTIAL") {
      return [...selectedCourse.evaluations, ...historicalEvaluations];
    }

    return [];
  }, [
    enrollmentMode,
    historicalEnabled,
    historicalEvaluationsMap,
    selectedCourse,
    selectedHistoricalIds,
  ]);

  const resetState = useCallback(() => {
    setSelectedCourse(null);
    setCourseQuery("");
    setLoadingCourseConfig(false);
    setIsNewStudent(false);
    setStudentQuery("");
    setStudentSearchResults([]);
    setSearchingStudents(false);
    setSelectedStudent(null);
    setCareerQuery("");
    setNewStudentData({
      firstName: "",
      lastName1: "",
      lastName2: "",
      email: "",
      phone: "",
      career: null,
    });
    setEnrollmentMode("FULL");
    setSelectedEvaluationIds(new Set());
    setHistoricalEnabled(true);
    setSelectedHistoricalIds(new Set());
    setHistoricalEvaluationsMap({});
    setSavingEnrollment(false);
  }, []);

  const closeModal = useCallback(() => {
    if (savingEnrollment) return;
    resetState();
    onClose();
  }, [onClose, resetState, savingEnrollment]);

  const handleSelectCourseCycle = useCallback(
    async (courseCycleId: string) => {
      setLoadingCourseConfig(true);
      setSelectedCourse(null);
      setEnrollmentMode("FULL");
      setSelectedEvaluationIds(new Set());
      setSelectedHistoricalIds(new Set());
      setHistoricalEvaluationsMap({});

      try {
        const detail = await usersService.getCourseCycleDetail(courseCycleId);
        setSelectedCourse({
          courseId: detail.courseId,
          courseCode: detail.courseCode,
          courseName: detail.courseName,
          courseCycleId,
          academicCycleCode: detail.academicCycleCode,
          evaluations: detail.evaluations.map((evaluation) => ({
            id: evaluation.id,
            shortName: evaluation.shortName,
            fullName: evaluation.fullName,
            sourceCourseCycleId: detail.baseCourseCycleId,
            sourceAcademicCycleCode: detail.academicCycleCode,
          })),
          historicalCycles: detail.historicalCycles,
        });
        setCourseQuery(`${detail.courseName} (${detail.academicCycleCode})`);
        setHistoricalEnabled(false);
        setSelectedHistoricalIds(new Set());
      } catch (err) {
        setCourseQuery("");
        showToast({
          type: "error",
          title: "Error",
          description:
            err instanceof Error
              ? err.message
              : "No se pudo preparar la matrícula del curso.",
        });
      } finally {
        setLoadingCourseConfig(false);
      }
    },
    [showToast],
  );

  const handleSelectCourse = useCallback(
    async (course: CourseCatalogItem) => {
      setCourseQuery(course.courseName);
      setLoadingCourseConfig(true);
      setSelectedCourse(null);
      setEnrollmentMode("FULL");
      setSelectedEvaluationIds(new Set());
      setSelectedHistoricalIds(new Set());
      setHistoricalEvaluationsMap({});

      try {
        const cycleOptions = await usersService.getCourseCycleOptions(
          course.courseId,
        );

        if (!cycleOptions.currentCycle) {
          showToast({
            type: "error",
            title: "Curso sin ciclo vigente",
            description:
              "Este curso no tiene un ciclo vigente disponible para matricular.",
          });
          setCourseQuery("");
          return;
        }

        await handleSelectCourseCycle(cycleOptions.currentCycle.courseCycleId);
      } catch (err) {
        setCourseQuery("");
        setLoadingCourseConfig(false);
        showToast({
          type: "error",
          title: "Error",
          description:
            err instanceof Error
              ? err.message
              : "No se pudo preparar la matrícula del curso.",
        });
      }
    },
    [handleSelectCourseCycle, showToast],
  );

  useEffect(() => {
    if (!isOpen) return;

    if (fixedStudent) {
      setIsNewStudent(false);
      setSelectedStudent(fixedStudent);
      setStudentQuery(`${fixedStudent.fullName} - ${fixedStudent.email}`);
    }
  }, [fixedStudent, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    if (!lockCourse && courseCatalog.length === 0) {
      setLoadingCourseCatalog(true);
      usersService
        .getCourseCatalog()
        .then(setCourseCatalog)
        .catch((err) => {
          showToast({
            type: "error",
            title: "Error",
            description:
              err instanceof Error
                ? err.message
                : "No se pudo cargar el catálogo de cursos.",
          });
        })
        .finally(() => setLoadingCourseCatalog(false));
    }

    if (careers.length === 0) {
      setLoadingCareers(true);
      usersService
        .getCareers()
        .then(setCareers)
        .catch(() => setCareers([]))
        .finally(() => setLoadingCareers(false));
    }
  }, [careers.length, courseCatalog.length, isOpen, lockCourse, showToast]);

  useEffect(() => {
    if (
      !isOpen ||
      !fixedCourseCycleId ||
      selectedCourse?.courseCycleId === fixedCourseCycleId
    ) {
      return;
    }

    void handleSelectCourseCycle(fixedCourseCycleId);
  }, [
    fixedCourseCycleId,
    handleSelectCourseCycle,
    isOpen,
    selectedCourse?.courseCycleId,
  ]);

  useEffect(() => {
    if (!isOpen || isNewStudent || lockStudent) {
      setStudentSearchResults([]);
      setSearchingStudents(false);
      return;
    }

    const normalizedQuery = studentQuery.trim();
    if (normalizedQuery.length < 2) {
      setStudentSearchResults([]);
      setSearchingStudents(false);
      return;
    }

    const timeoutId = window.setTimeout(async () => {
      setSearchingStudents(true);
      try {
        const response = await usersService.getAdminUsers({
          roles: "STUDENT",
          status: "ACTIVE",
          search: normalizedQuery,
        });
        setStudentSearchResults(
          response.items.map((item) => ({
            id: item.id,
            fullName: item.fullName,
            email: item.email,
          })),
        );
      } catch (err) {
        showToast({
          type: "error",
          title: "Error",
          description:
            err instanceof Error ? err.message : "No se pudo buscar alumnos.",
        });
      } finally {
        setSearchingStudents(false);
      }
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [isOpen, isNewStudent, lockStudent, showToast, studentQuery]);

  useEffect(() => {
    if (
      !selectedCourse ||
      !historicalEnabled ||
      selectedHistoricalIds.size === 0
    ) {
      return;
    }

    const missingIds = Array.from(selectedHistoricalIds).filter(
      (courseCycleId) => !historicalEvaluationsMap[courseCycleId],
    );

    if (missingIds.length === 0) return;

    void Promise.all(
      missingIds.map(async (courseCycleId) => {
        const detail = await usersService.getCourseCycleDetail(courseCycleId);
        return {
          courseCycleId,
          evaluations: detail.evaluations.map((evaluation) => ({
            id: evaluation.id,
            shortName: evaluation.shortName,
            fullName: evaluation.fullName,
            sourceCourseCycleId: courseCycleId,
            sourceAcademicCycleCode: detail.academicCycleCode,
          })),
        };
      }),
    )
      .then((responses) => {
        setHistoricalEvaluationsMap((prev) => {
          const next = { ...prev };
          responses.forEach(({ courseCycleId, evaluations }) => {
            next[courseCycleId] = evaluations;
          });
          return next;
        });
      })
      .catch((err) => {
        showToast({
          type: "error",
          title: "Error",
          description:
            err instanceof Error
              ? err.message
              : "No se pudieron cargar las evaluaciones históricas.",
        });
      });
  }, [
    historicalEnabled,
    historicalEvaluationsMap,
    selectedCourse,
    selectedHistoricalIds,
    showToast,
  ]);

  useEffect(() => {
    if (enrollmentMode === "FULL") {
      if (selectedEvaluationIds.size > 0) {
        setSelectedEvaluationIds(new Set());
      }
      return;
    }

    const validIds = new Set(
      availableEvaluations.map((evaluation) => evaluation.id),
    );
    setSelectedEvaluationIds((prev) => {
      const next = new Set(Array.from(prev).filter((id) => validIds.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [availableEvaluations, enrollmentMode, selectedEvaluationIds.size]);

  const hasValidPhone =
    newStudentData.phone.trim().length === 0 ||
    newStudentData.phone.trim().length === 9;
  const hasValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    newStudentData.email.trim(),
  );

  const canSaveEnrollment = useMemo(() => {
    if (!selectedCourse || loadingCourseConfig || savingEnrollment) {
      return false;
    }

    if (enrollmentMode !== "FULL" && selectedEvaluationIds.size === 0) {
      return false;
    }

    if (isNewStudent) {
      return Boolean(
        newStudentData.firstName.trim() &&
        newStudentData.lastName1.trim() &&
        newStudentData.email.trim() &&
        hasValidEmail &&
        hasValidPhone,
      );
    }

    return Boolean(selectedStudent);
  }, [
    enrollmentMode,
    hasValidEmail,
    hasValidPhone,
    isNewStudent,
    loadingCourseConfig,
    newStudentData.email,
    newStudentData.firstName,
    newStudentData.lastName1,
    savingEnrollment,
    selectedCourse,
    selectedEvaluationIds.size,
    selectedStudent,
  ]);

  const handleToggleEvaluation = (evaluationId: string) => {
    setSelectedEvaluationIds((prev) => {
      const next = new Set(prev);
      if (next.has(evaluationId)) next.delete(evaluationId);
      else next.add(evaluationId);
      return next;
    });
  };

  const handleToggleHistorical = (courseCycleId: string) => {
    setSelectedHistoricalIds((prev) => {
      const next = new Set(prev);
      if (next.has(courseCycleId)) next.delete(courseCycleId);
      else next.add(courseCycleId);
      return next;
    });
    setSelectedEvaluationIds((prev) => {
      const next = new Set(prev);
      const evaluationsForCycle = historicalEvaluationsMap[courseCycleId] || [];
      evaluationsForCycle.forEach((evaluation) => next.delete(evaluation.id));
      return next;
    });
  };

  const handleSaveEnrollment = async () => {
    if (!selectedCourse || !canSaveEnrollment) return;

    const enrollmentTypeCode = enrollmentMode === "FULL" ? "FULL" : "PARTIAL";
    const enrollmentPayload = {
      courseCycleId: selectedCourse.courseCycleId,
      enrollmentTypeCode,
      evaluationIds:
        enrollmentTypeCode === "PARTIAL"
          ? Array.from(selectedEvaluationIds)
          : undefined,
      historicalCourseCycleIds: historicalEnabled
        ? Array.from(selectedHistoricalIds)
        : [],
    } as const;

    if (isNewStudent && !hasValidPhone) {
      showToast({
        type: "error",
        title: "Teléfono inválido",
        description: "El teléfono debe tener exactamente 9 dígitos.",
      });
      return;
    }

    setSavingEnrollment(true);
    try {
      if (isNewStudent) {
        await usersService.adminOnboarding({
          email: newStudentData.email.trim(),
          firstName: newStudentData.firstName.trim(),
          lastName1: newStudentData.lastName1.trim(),
          lastName2: newStudentData.lastName2.trim() || undefined,
          phone: newStudentData.phone.trim() || undefined,
          careerId: newStudentData.career?.id,
          roleCodes: ["STUDENT"],
          studentEnrollment: enrollmentPayload,
        });
      } else if (selectedStudent) {
        await enrollmentService.create({
          userId: selectedStudent.id,
          ...enrollmentPayload,
        });
      }

      showToast({
        type: "success",
        title: "Matrícula registrada",
        description: isNewStudent
          ? "El alumno fue creado y matriculado correctamente."
          : "La matrícula se registró correctamente.",
      });
      onEnrollmentCreated?.({ isNewStudent });
      resetState();
      onClose();
    } catch (err) {
      showToast({
        type: "error",
        title: "Error",
        description:
          err instanceof Error
            ? err.message
            : "No se pudo completar la matrícula.",
      });
    } finally {
      setSavingEnrollment(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={closeModal}
      title="Nueva Matrícula"
      size="lg"
      footer={
        <>
          <Modal.Button
            variant="secondary"
            onClick={closeModal}
            disabled={savingEnrollment}
          >
            Cancelar
          </Modal.Button>
          <Modal.Button
            onClick={() => void handleSaveEnrollment()}
            disabled={!canSaveEnrollment}
            loading={savingEnrollment}
            loadingText="Guardando..."
          >
            Guardar
          </Modal.Button>
        </>
      }
    >
      <div className="self-stretch flex flex-col gap-5">
        <SearchableSelectField<CourseCatalogItem>
          label="Curso Seleccionado"
          placeholder="Curso Seleccionado"
          value={
            selectedCourse
              ? `${selectedCourse.courseName} (${selectedCourse.academicCycleCode})`
              : ""
          }
          query={courseQuery}
          onQueryChange={(value) => {
            if (lockCourse) return;
            setCourseQuery(value);
            setSelectedCourse(null);
            setSelectedEvaluationIds(new Set());
            setSelectedHistoricalIds(new Set());
          }}
          onOpen={() => {
            if (lockCourse) return;
            if (courseCatalog.length === 0 && !loadingCourseCatalog) {
              setLoadingCourseCatalog(true);
              usersService
                .getCourseCatalog()
                .then(setCourseCatalog)
                .finally(() => setLoadingCourseCatalog(false));
            }
          }}
          options={filteredCourses}
          onSelect={(course) => void handleSelectCourse(course)}
          getOptionKey={(course) => course.courseId}
          renderOption={(course) => (
            <div className="flex flex-col gap-0.5">
              <span className="text-text-secondary text-sm font-medium leading-4">
                {course.courseName}
              </span>
              <span className="text-text-tertiary text-xs leading-4">
                {course.courseCode}
              </span>
            </div>
          )}
          loading={loadingCourseCatalog || loadingCourseConfig}
          disabled={lockCourse}
          emptyText="No se encontraron cursos"
        />

        {!lockStudent && (
          <div className="self-stretch flex flex-col gap-4">
            <div className="self-stretch inline-flex justify-start items-center gap-4">
              <div className="flex-1 flex justify-start items-center gap-3">
                <div className="flex-1 inline-flex flex-col justify-start items-start gap-1">
                  <div className="self-stretch justify-center text-text-primary text-base font-semibold leading-5">
                    Alumno nuevo
                  </div>
                </div>
              </div>
              <ToggleSwitch
                checked={isNewStudent}
                onChange={(checked) => {
                  setIsNewStudent(checked);
                  setSelectedStudent(null);
                  setStudentQuery("");
                  setStudentSearchResults([]);
                }}
              />
            </div>
          </div>
        )}

        {isNewStudent ? (
          <div className="self-stretch flex flex-col gap-4">
            <FloatingInput
              id="new-enrollment-first-name"
              label="Nombres"
              value={newStudentData.firstName}
              onChange={(value) =>
                setNewStudentData((prev) => ({ ...prev, firstName: value }))
              }
            />
            <FloatingInput
              id="new-enrollment-last-name1"
              label="Primer Apellido"
              value={newStudentData.lastName1}
              onChange={(value) =>
                setNewStudentData((prev) => ({ ...prev, lastName1: value }))
              }
            />
            <FloatingInput
              id="new-enrollment-last-name2"
              label="Segundo Apellido"
              value={newStudentData.lastName2}
              onChange={(value) =>
                setNewStudentData((prev) => ({ ...prev, lastName2: value }))
              }
            />
            <FloatingInput
              id="new-enrollment-email"
              label="Correo Electrónico"
              value={newStudentData.email}
              onChange={(value) =>
                setNewStudentData((prev) => ({ ...prev, email: value }))
              }
              helperText={
                newStudentData.email.length > 0 && !hasValidEmail
                  ? "Ingresa un correo válido."
                  : undefined
              }
            />
            <FloatingInput
              id="new-enrollment-phone"
              label="Teléfono"
              value={newStudentData.phone}
              onChange={(value) =>
                setNewStudentData((prev) => ({
                  ...prev,
                  phone: value.replace(/\D/g, "").slice(0, 9),
                }))
              }
              helperText={
                !hasValidPhone
                  ? "El teléfono debe tener exactamente 9 dígitos."
                  : undefined
              }
              maxLength={9}
              inputMode="numeric"
            />
            <SearchableSelectField<CareerOption>
              label="Carrera"
              placeholder="Carrera"
              value={newStudentData.career?.name ?? ""}
              query={careerQuery}
              onQueryChange={(value) => {
                setCareerQuery(value);
                setNewStudentData((prev) => ({ ...prev, career: null }));
              }}
              options={filteredCareers}
              onSelect={(career) => {
                setNewStudentData((prev) => ({ ...prev, career }));
                setCareerQuery(career.name);
              }}
              getOptionKey={(career) => career.id}
              renderOption={(career) => (
                <span className="text-text-secondary text-sm font-normal leading-4">
                  {career.name}
                </span>
              )}
              loading={loadingCareers}
              emptyText="No se encontraron carreras"
            />
          </div>
        ) : (
          <SearchableSelectField<EnrollmentStudentOption>
            label="Alumno"
            placeholder="Alumno"
            value={
              selectedStudent
                ? `${selectedStudent.fullName} - ${selectedStudent.email}`
                : ""
            }
            query={studentQuery}
            onQueryChange={(value) => {
              if (lockStudent) return;
              setStudentQuery(value);
              setSelectedStudent(null);
            }}
            options={studentSearchResults}
            onSelect={(student) => {
              setSelectedStudent(student);
              setStudentQuery(`${student.fullName} - ${student.email}`);
            }}
            getOptionKey={(student) => student.id}
            renderOption={(student) => (
              <div className="flex flex-col gap-0.5">
                <span className="text-text-secondary text-sm font-medium leading-4">
                  {student.fullName}
                </span>
                <span className="text-text-tertiary text-xs leading-4">
                  {student.email}
                </span>
              </div>
            )}
            loading={searchingStudents}
            disabled={lockStudent}
            emptyText={
              studentQuery.trim().length < 2
                ? "Escribe al menos 2 caracteres para buscar."
                : "No se encontraron alumnos"
            }
          />
        )}

        <div className="self-stretch flex flex-col justify-start items-start gap-2">
          <div className="self-stretch justify-center text-text-quartiary text-sm font-medium leading-4">
            Modalidad de Inscripción
          </div>

          <EnrollmentModeCard
            title="Ciclo completo"
            description="Acceso a todas las evaluaciones"
            selected={enrollmentMode === "FULL"}
            onClick={() => {
              setEnrollmentMode("FULL");
              setSelectedEvaluationIds(new Set());
            }}
          />
          <EnrollmentModeCard
            title="Evaluaciones una a una"
            description="Acceso a evaluaciones espec??ficas"
            selected={enrollmentMode === "PARTIAL"}
            onClick={() => setEnrollmentMode("PARTIAL")}
          />
          {enrollmentMode === "PARTIAL" && selectedCourse && (
            <EnrollmentSelectionList layout="grid">
              {availableEvaluations.length === 0 ? (
                <div className="text-text-tertiary text-sm">
                  Este curso no tiene evaluaciones configuradas.
                </div>
              ) : (
                availableEvaluations.map((evaluation) => (
                  <CheckboxChip
                    key={evaluation.id}
                    label={
                      evaluation.sourceCourseCycleId !==
                      selectedCourse.courseCycleId
                        ? `${evaluation.shortName} ?? ${evaluation.sourceAcademicCycleCode}`
                        : evaluation.shortName
                    }
                    checked={selectedEvaluationIds.has(evaluation.id)}
                    onClick={() => handleToggleEvaluation(evaluation.id)}
                  />
                ))
              )}
            </EnrollmentSelectionList>
          )}
          <EnrollmentModeCard
            title="Solo ciclos pasados"
            description="Acceso solo a evaluaciones de ciclos históricos"
            selected={enrollmentMode === "HISTORICAL_ONLY"}
            onClick={() => {
              setEnrollmentMode("HISTORICAL_ONLY");
              setHistoricalEnabled(true);
              setSelectedEvaluationIds(new Set());
            }}
          />
          {enrollmentMode === "HISTORICAL_ONLY" && selectedCourse && (
            <EnrollmentSelectionList layout="grid">
              {availableEvaluations.length === 0 ? (
                <div className="text-text-tertiary text-sm">
                  Selecciona al menos un ciclo pasado para ver sus evaluaciones.
                </div>
              ) : (
                availableEvaluations.map((evaluation) => (
                  <CheckboxChip
                    key={evaluation.id}
                    label={`${evaluation.shortName} ?? ${evaluation.sourceAcademicCycleCode}`}
                    checked={selectedEvaluationIds.has(evaluation.id)}
                    onClick={() => handleToggleEvaluation(evaluation.id)}
                  />
                ))
              )}
            </EnrollmentSelectionList>
          )}
        </div>

        {hasHistoricalCycles && (
          <div className="self-stretch p-6 bg-bg-info-primary-light rounded-xl flex flex-col justify-start items-start gap-4">
            <div className="self-stretch inline-flex justify-start items-center gap-4">
              <div className="flex-1 flex justify-start items-center gap-3">
                <div className="p-2 bg-bg-info-primary-light-hover rounded-lg flex justify-center items-center">
                  <Icon
                    name="inventory_2"
                    size={24}
                    className="text-icon-info-primary"
                  />
                </div>
                <div className="flex-1 inline-flex flex-col justify-start items-start gap-1">
                  <div className="self-stretch justify-center text-text-primary text-base font-semibold leading-5">
                    Ciclos Pasados
                  </div>
                  <div className="self-stretch justify-center text-text-quartiary text-xs font-normal leading-4">
                    Habilitar material hist??rico
                  </div>
                </div>
              </div>
              <ToggleSwitch
                checked={historicalEnabled}
                onChange={setHistoricalEnabled}
                variant="info"
              />
            </div>

            {historicalEnabled ? (
              <div className="self-stretch inline-flex flex-col justify-start items-start">
                {selectedCourse?.historicalCycles.map((cycle) => (
                  <CheckboxChip
                    key={cycle.courseCycleId}
                    label={cycle.academicCycleCode}
                    checked={selectedHistoricalIds.has(cycle.courseCycleId)}
                    onClick={() => handleToggleHistorical(cycle.courseCycleId)}
                  />
                ))}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </Modal>
  );
}
