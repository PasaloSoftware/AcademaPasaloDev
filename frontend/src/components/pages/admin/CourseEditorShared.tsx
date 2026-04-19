"use client";

import type { ReactNode } from "react";
import Modal from "@/components/ui/Modal";
import Icon from "@/components/ui/Icon";
import FloatingInput from "@/components/ui/FloatingInput";
import FloatingSelect from "@/components/ui/FloatingSelect";
import DatePicker from "@/components/ui/DatePicker";
import type { AdminCourseCycleProfessor } from "@/services/courses.service";

export type CourseEditorTab = "structure" | "students";

export type ProfessorModalOption = {
  id: string;
  firstName: string;
  lastName1: string;
  lastName2: string;
  fullName: string;
};

export type CourseEditorEvaluationItem = {
  id: string;
  evaluationTypeCode: string;
  shortName: string;
  fullName: string;
};

export const MAX_COURSE_PROFESSORS = 2;

export function normalizeCourseTypeName(name?: string | null): string {
  if (!name) return "Sin unidad";
  const normalized = name.trim().toLowerCase();
  if (normalized === "ciencias") return "Ciencias";
  if (normalized === "letras") return "Letras";
  if (normalized === "facultad") return "Facultad";
  return name.trim();
}

export function getProfessorDisplayName(
  professor: Pick<
    AdminCourseCycleProfessor,
    "firstName" | "lastName1" | "lastName2"
  >,
): string {
  return [professor.firstName, professor.lastName1, professor.lastName2]
    .filter(Boolean)
    .join(" ")
    .trim();
}

export function getEvaluationTypeMeta(code: string): {
  label: string;
  bg: string;
  text: string;
} {
  const normalized = code.toUpperCase();
  if (normalized.startsWith("PC")) {
    return {
      label: "Practica Calificada",
      bg: "bg-bg-info-secondary-light",
      text: "text-text-info-secondary",
    };
  }

  if (normalized.startsWith("EX")) {
    return {
      label: "Examen",
      bg: "bg-bg-success-light",
      text: "text-text-success-primary",
    };
  }

  return {
    label: normalized,
    bg: "bg-bg-secondary",
    text: "text-text-secondary",
  };
}

interface CourseEditorHeaderProps {
  title: string;
  backLabel: string;
  onBack: () => void;
}

export function CourseEditorHeader({
  title,
  backLabel,
  onBack,
}: CourseEditorHeaderProps) {
  return (
    <>
      <button
        onClick={onBack}
        className="p-1 rounded-lg inline-flex justify-center items-center gap-2 hover:bg-bg-accent-light transition-colors"
      >
        <Icon
          name="arrow_back"
          size={20}
          className="text-icon-accent-primary"
        />
        <span className="text-text-accent-primary text-base font-medium leading-4">
          {backLabel}
        </span>
      </button>

      <div className="self-stretch text-text-primary text-3xl font-semibold leading-8">
        {title}
      </div>
    </>
  );
}

interface CourseGeneralInfoSectionProps {
  courseName: string;
  onCourseNameChange: (value: string) => void;
  courseCode: string;
  onCourseCodeChange: (value: string) => void;
  selectedType: string | null;
  onSelectedTypeChange: (value: string | null) => void;
  typeOptions: Array<{ value: string; label: string }>;
  selectedLevel?: string | null;
  onSelectedLevelChange?: (value: string | null) => void;
  levelOptions?: Array<{ value: string; label: string }>;
  professors: AdminCourseCycleProfessor[];
  onOpenProfessorModal: () => void;
}

export function CourseGeneralInfoSection({
  courseName,
  onCourseNameChange,
  courseCode,
  onCourseCodeChange,
  selectedType,
  onSelectedTypeChange,
  typeOptions,
  selectedLevel = null,
  onSelectedLevelChange,
  levelOptions = [],
  professors,
  onOpenProfessorModal,
}: CourseGeneralInfoSectionProps) {
  return (
    <div className="self-stretch p-6 bg-bg-primary rounded-xl outline outline-1 outline-offset-[-1px] outline-stroke-secondary flex flex-col justify-start items-start gap-6">
      <div className="self-stretch inline-flex justify-start items-start gap-2">
        <Icon name="info" size={20} className="text-icon-info-secondary" />
        <div className="flex-1 text-text-primary text-lg font-semibold leading-5">
          Informacion General
        </div>
      </div>
      <div className="self-stretch flex flex-col justify-start items-start gap-4">
        <FloatingInput
          id="course-name"
          label="Nombre del Curso"
          value={courseName}
          onChange={onCourseNameChange}
        />
        <FloatingInput
          id="course-code"
          label="Código del Curso"
          value={courseCode}
          onChange={onCourseCodeChange}
        />
        <FloatingSelect
          label="Unidad"
          value={selectedType}
          options={typeOptions}
          onChange={onSelectedTypeChange}
          allLabel="Unidad"
          emptyValueIsPlaceholder
          className="w-full"
          variant="floating"
          size="large"
        />
        {onSelectedLevelChange ? (
          <FloatingSelect
            label="Ciclo"
            value={selectedLevel}
            options={levelOptions}
            onChange={onSelectedLevelChange}
            allLabel="Ciclo"
            emptyValueIsPlaceholder
            className="w-full"
            variant="floating"
            size="large"
          />
        ) : null}

        <div className="self-stretch relative inline-flex flex-col justify-start items-start gap-1">
          {professors.length > 0 && (
            <div className="px-1 left-[8px] top-[-7px] absolute bg-bg-primary inline-flex justify-start items-start">
              <span className="text-text-tertiary text-xs font-normal leading-4">
                Asesor asignado
              </span>
            </div>
          )}
          <div
            className="self-stretch min-h-12 px-3 py-3.5 bg-bg-primary rounded outline outline-1 outline-offset-[-1px] outline-stroke-primary inline-flex justify-start items-center gap-2 cursor-pointer hover:bg-bg-secondary transition-colors"
            onClick={onOpenProfessorModal}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onOpenProfessorModal();
              }
            }}
          >
            <div className="flex-1 flex justify-start items-center gap-2 flex-wrap">
              {professors.length === 0 ? (
                <span className="text-text-tertiary text-base font-normal leading-4">
                  Asesor asignado
                </span>
              ) : (
                professors.slice(0, MAX_COURSE_PROFESSORS).map((professor) => (
                  <div
                    key={professor.id}
                    className="px-2.5 py-1.5 bg-bg-info-primary-light rounded-full flex justify-center items-center gap-1"
                  >
                    <span className="text-text-info-primary text-xs font-medium leading-3">
                      {getProfessorDisplayName(professor)}
                    </span>
                    <button
                      type="button"
                      onClick={onOpenProfessorModal}
                      className="inline-flex items-center justify-center"
                    >
                      <Icon
                        name="close"
                        size={14}
                        className="text-icon-info-primary"
                        variant="outlined"
                      />
                    </button>
                  </div>
                ))
              )}
            </div>
            <Icon name="expand_more" size={16} className="text-icon-tertiary" />
          </div>
        </div>
      </div>
    </div>
  );
}

interface CourseEditorTabsProps {
  activeTab: CourseEditorTab;
  onChange: (tab: CourseEditorTab) => void;
  disableStudents?: boolean;
}

export function CourseEditorTabs({
  activeTab,
  onChange,
  disableStudents = false,
}: CourseEditorTabsProps) {
  return (
    <div className="p-1 bg-bg-primary rounded-xl outline outline-1 outline-offset-[-1px] outline-stroke-secondary inline-flex justify-center items-center">
      <button
        onClick={() => onChange("structure")}
        className={`px-6 py-3 rounded-lg flex justify-center items-center gap-2 ${activeTab === "structure" ? "bg-bg-accent-primary-solid" : "bg-bg-primary"}`}
      >
        <div
          className={`text-center text-base leading-4 ${activeTab === "structure" ? "text-text-white font-medium" : "text-text-secondary font-normal"}`}
        >
          Gestión de Estructura
        </div>
      </button>
      <button
        onClick={() => !disableStudents && onChange("students")}
        disabled={disableStudents}
        className={`px-6 py-3 rounded-lg flex justify-center items-center gap-2 ${activeTab === "students" ? "bg-bg-accent-primary-solid" : "bg-bg-primary"} ${disableStudents ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        <div
          className={`text-center text-base leading-4 ${activeTab === "students" ? "text-text-white font-medium" : "text-text-secondary font-normal"}`}
        >
          Gestión de Alumnos
        </div>
      </button>
    </div>
  );
}

interface CourseSectionCardProps {
  title: string;
  icon: string;
  actions?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
}

export function CourseSectionCard({
  title,
  icon,
  actions,
  description,
  children,
}: CourseSectionCardProps) {
  return (
    <div className="self-stretch p-6 bg-bg-primary rounded-xl outline outline-1 outline-offset-[-1px] outline-stroke-secondary flex flex-col justify-start items-start gap-6">
      <div className="self-stretch flex flex-col justify-start items-start gap-4">
        <div className="self-stretch inline-flex justify-start items-center gap-2">
          <Icon name={icon} size={20} className="text-icon-info-secondary" />
          <div className="flex-1 text-text-primary text-lg font-semibold leading-5">
            {title}
          </div>
          {actions}
        </div>
        {description ? (
          <div className="self-stretch text-text-secondary text-xs font-light leading-4">
            {description}
          </div>
        ) : null}
      </div>
      {children}
    </div>
  );
}

interface CourseEmptyStatePanelProps {
  icon: string;
  title: string;
  description: ReactNode;
}

export function CourseEmptyStatePanel({
  icon,
  title,
  description,
}: CourseEmptyStatePanelProps) {
  return (
    <div className="self-stretch px-6 md:px-12 lg:px-28 py-6 relative bg-white rounded-xl border-2 border-dashed border-gray-200 flex flex-col justify-center items-center gap-4 text-center">
      <div className="self-stretch h-16 p-3 bg-gray-200 rounded-full inline-flex justify-center items-center max-w-max mx-auto">
        <Icon
          name={icon}
          size={44}
          className="text-gray-500"
          variant="outlined"
        />
      </div>
      <div className="text-text-secondary text-base font-medium leading-4">
        {title}
      </div>
      <div className="max-w-xl text-gray-600 text-sm font-normal leading-4">
        {description}
      </div>
    </div>
  );
}

interface CourseInfoBannerProps {
  title: string;
  description: string;
}

export function CourseInfoBanner({
  title,
  description,
}: CourseInfoBannerProps) {
  return (
    <div className="self-stretch px-2 py-3 bg-bg-secondary rounded-lg outline outline-2 outline-offset-[-2px] outline-stroke-primary inline-flex justify-start items-center gap-2">
      <div className="px-2 py-1 rounded-full flex justify-start items-center">
        <Icon name="info" size={24} className="text-icon-tertiary" />
      </div>
      <div className="flex-1 inline-flex flex-col justify-start items-start gap-0.5">
        <div className="self-stretch text-text-primary text-sm font-normal leading-4">
          {title}
        </div>
        <div className="self-stretch text-text-tertiary text-xs font-normal leading-4">
          {description}
        </div>
      </div>
    </div>
  );
}

interface CourseSelectQuantityModalProps {
  isOpen: boolean;
  title: string;
  selectLabel: string;
  quantityLabel: string;
  selectValue: string | null;
  onSelectChange: (value: string | null) => void;
  selectOptions: Array<{ value: string; label: string }>;
  selectPlaceholder: string;
  quantityValue: string;
  onQuantityChange: (value: string) => void;
  quantityError?: string;
  onClose: () => void;
  onSave: () => void;
  saveDisabled: boolean;
  selectDisabled?: boolean;
}

export function CourseSelectQuantityModal({
  isOpen,
  title,
  selectLabel,
  quantityLabel,
  selectValue,
  onSelectChange,
  selectOptions,
  selectPlaceholder,
  quantityValue,
  onQuantityChange,
  quantityError,
  onClose,
  onSave,
  saveDisabled,
  selectDisabled = false,
}: CourseSelectQuantityModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="md"
      bodyClassName="overflow-visible"
      footer={
        <>
          <Modal.Button variant="secondary" onClick={onClose}>
            Cancelar
          </Modal.Button>
          <Modal.Button onClick={onSave} disabled={saveDisabled}>
            Guardar
          </Modal.Button>
        </>
      }
    >
      <div className="self-stretch flex flex-col justify-start items-start gap-4">
        <FloatingSelect
          label={selectLabel}
          value={selectValue}
          options={selectOptions}
          onChange={onSelectChange}
          allLabel={selectPlaceholder}
          emptyValueIsPlaceholder
          className="w-full"
          variant="floating"
          size="large"
          disabled={selectDisabled}
        />
        <div className="self-stretch flex flex-col gap-1">
          <FloatingInput
            id={`${title.toLowerCase().replace(/\s+/g, "-")}-quantity`}
            label={quantityLabel}
            value={quantityValue}
            onChange={onQuantityChange}
            inputMode="numeric"
          />
          {quantityError ? (
            <span className="text-xs font-normal leading-4 text-text-error-primary">
              {quantityError}
            </span>
          ) : null}
        </div>
      </div>
    </Modal>
  );
}

interface CourseEvaluationDateModalProps {
  isOpen: boolean;
  title: string;
  startDate: string;
  endDate: string;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  error?: string;
  onClose: () => void;
  onSave: () => void;
  saveDisabled: boolean;
  saving?: boolean;
}

export function CourseEvaluationDateModal({
  isOpen,
  title,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  error,
  onClose,
  onSave,
  saveDisabled,
  saving = false,
}: CourseEvaluationDateModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      bodyClassName="overflow-visible"
      footer={
        <>
          <Modal.Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Modal.Button>
          <Modal.Button
            onClick={onSave}
            disabled={saveDisabled}
            loading={saving}
            loadingText="Guardando..."
          >
            Guardar
          </Modal.Button>
        </>
      }
    >
      <div className="self-stretch flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-text-tertiary text-xs font-normal leading-4 px-1">
            Fecha de inicio
          </span>
          <DatePicker
            value={startDate}
            onChange={(v) => {
              onStartDateChange(v);
              if (endDate && v > endDate) onEndDateChange(v);
            }}
            placeholder="Fecha de inicio"
          />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-text-tertiary text-xs font-normal leading-4 px-1">
            Fecha de fin
          </span>
          <DatePicker
            value={endDate}
            onChange={onEndDateChange}
            min={startDate || undefined}
            placeholder="Fecha de fin"
          />
        </div>
        {error ? (
          <span className="text-xs font-normal leading-4 text-text-error-primary">
            {error}
          </span>
        ) : null}
      </div>
    </Modal>
  );
}

interface CourseBankFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  typeOptions?: Array<{ value: string; label: string }>;
  selectedType?: string | null;
  onTypeChange?: (value: string | null) => void;
  groupName: string;
  onGroupNameChange: (value: string) => void;
  quantity: string;
  onQuantityChange: (value: string) => void;
  quantityError?: string;
  error?: string;
  saving: boolean;
  saveDisabled: boolean;
  onSave: () => void;
}

export function CourseBankFolderModal({
  isOpen,
  onClose,
  title = "Editar Carpeta del Banco",
  typeOptions,
  selectedType,
  onTypeChange,
  groupName,
  onGroupNameChange,
  quantity,
  onQuantityChange,
  quantityError,
  error,
  saving,
  saveDisabled,
  onSave,
}: CourseBankFolderModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      bodyClassName="overflow-visible"
      footer={
        <>
          <Modal.Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Modal.Button>
          <Modal.Button
            onClick={onSave}
            disabled={saveDisabled}
            loading={saving}
            loadingText="Guardando..."
          >
            Guardar
          </Modal.Button>
        </>
      }
    >
      <div className="self-stretch flex flex-col gap-4">
        {typeOptions && onTypeChange ? (
          <FloatingSelect
            label="Tipo de Evaluación"
            value={selectedType ?? null}
            onChange={onTypeChange}
            options={typeOptions}
            allLabel="Selecciona un tipo"
            emptyValueIsPlaceholder
            variant="floating"
            size="large"
            className="w-full"
          />
        ) : (
          <FloatingInput
            id="bank-folder-group-name"
            label="Nombre de la Carpeta"
            value={groupName}
            onChange={onGroupNameChange}
            maxLength={80}
          />
        )}
        <div className="self-stretch flex flex-col gap-1">
          <FloatingInput
            id="bank-folder-quantity"
            label="Cantidad de Evaluaciones"
            value={quantity}
            onChange={onQuantityChange}
            inputMode="numeric"
          />
          {quantityError ? (
            <span className="text-xs font-normal leading-4 text-text-error-primary">
              {quantityError}
            </span>
          ) : null}
        </div>
        {error ? (
          <span className="text-xs font-normal leading-4 text-text-error-primary">
            {error}
          </span>
        ) : null}
      </div>
    </Modal>
  );
}

interface CourseMaterialFolderModalProps {
  isOpen: boolean;
  title: string;
  nameValue: string;
  onNameChange: (value: string) => void;
  descriptionValue: string;
  onDescriptionChange: (value: string) => void;
  onClose: () => void;
  onSave: () => void;
  saveDisabled: boolean;
}

export function CourseMaterialFolderModal({
  isOpen,
  title,
  nameValue,
  onNameChange,
  descriptionValue,
  onDescriptionChange,
  onClose,
  onSave,
  saveDisabled,
}: CourseMaterialFolderModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="md"
      bodyClassName="overflow-visible"
      footer={
        <>
          <Modal.Button variant="secondary" onClick={onClose}>
            Cancelar
          </Modal.Button>
          <Modal.Button onClick={onSave} disabled={saveDisabled}>
            Guardar
          </Modal.Button>
        </>
      }
    >
      <div className="self-stretch flex flex-col justify-start items-start gap-4">
        <FloatingInput
          id={`${title.toLowerCase().replace(/\s+/g, "-")}-name`}
          label="Nombre de la Carpeta Adicional"
          value={nameValue}
          onChange={onNameChange}
          maxLength={80}
        />
        <FloatingInput
          id={`${title.toLowerCase().replace(/\s+/g, "-")}-description`}
          label="Descripción"
          value={descriptionValue}
          onChange={onDescriptionChange}
          maxLength={180}
        />
      </div>
    </Modal>
  );
}

interface CourseDeleteConfirmModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  onClose: () => void;
  onConfirm: () => void;
}

export function CourseDeleteConfirmModal({
  isOpen,
  title,
  description,
  onClose,
  onConfirm,
}: CourseDeleteConfirmModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Modal.Button variant="secondary" onClick={onClose}>
            Cancelar
          </Modal.Button>
          <Modal.Button variant="danger" onClick={onConfirm}>
            Eliminar
          </Modal.Button>
        </>
      }
    >
      <div className="self-stretch flex flex-col justify-center items-center gap-6">
        <div className="self-stretch text-text-tertiary text-base font-normal leading-4">
          {description}
        </div>
      </div>
    </Modal>
  );
}

interface CourseResourceCardProps {
  title: string;
  description: string;
  iconName?: string;
  iconToneClassName?: string;
  iconWrapperClassName?: string;
  actions?: ReactNode;
}

export function CourseResourceCard({
  title,
  description,
  iconName = "folder",
  iconToneClassName = "text-gray-500",
  iconWrapperClassName = "bg-bg-disabled",
  actions,
}: CourseResourceCardProps) {
  return (
    <div className="min-h-52 p-6 bg-bg-primary rounded-xl outline outline-1 outline-offset-[-1px] outline-stroke-secondary inline-flex flex-col justify-between items-start gap-6">
      <div className="self-stretch flex flex-col justify-start items-start gap-4">
        <div
          className={`w-12 h-12 p-2 bg-gray-200 rounded-xl inline-flex justify-center items-center ${iconWrapperClassName}`}
        >
          <Icon name={iconName} size={24} className={iconToneClassName} />
        </div>
        <div className="self-stretch flex flex-col justify-start items-start gap-1">
          <div className="self-stretch text-text-primary text-lg font-semibold leading-5">
            {title}
          </div>
          <div className="self-stretch text-text-secondary text-xs font-normal leading-4">
            {description}
          </div>
        </div>
      </div>
      {actions ? (
        <div className="self-stretch flex flex-col justify-start items-end gap-2.5">
          {actions}
        </div>
      ) : null}
    </div>
  );
}

interface CourseEvaluationListProps {
  evaluations: CourseEditorEvaluationItem[];
  draggedEvaluationId?: string | null;
  dragOverEvaluationId?: string | null;
  onDragStart?: (evaluationId: string) => void;
  onDragOver?: (evaluationId: string) => void;
  onDrop?: (evaluationId: string) => void;
  onDragEnd?: () => void;
  onEdit: (evaluationId: string) => void;
  onDelete: (evaluationId: string) => void;
}

export function CourseEvaluationList({
  evaluations,
  draggedEvaluationId = null,
  dragOverEvaluationId = null,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onEdit,
  onDelete,
}: CourseEvaluationListProps) {
  return (
    <div className="self-stretch flex flex-col justify-start items-start gap-3">
      {evaluations.map((evaluation) => {
        const typeMeta = getEvaluationTypeMeta(evaluation.evaluationTypeCode);
        const isDragging = draggedEvaluationId === evaluation.id;
        const isDragTarget =
          dragOverEvaluationId === evaluation.id &&
          draggedEvaluationId !== evaluation.id;
        const canDrag = Boolean(
          onDragStart && onDragOver && onDrop && onDragEnd,
        );

        return (
          <div
            key={evaluation.id}
            draggable={canDrag}
            onDragStart={
              canDrag ? () => onDragStart?.(evaluation.id) : undefined
            }
            onDragOver={
              canDrag
                ? (event) => {
                    event.preventDefault();
                    onDragOver?.(evaluation.id);
                  }
                : undefined
            }
            onDrop={
              canDrag
                ? (event) => {
                    event.preventDefault();
                    onDrop?.(evaluation.id);
                  }
                : undefined
            }
            onDragEnd={canDrag ? onDragEnd : undefined}
            className={`self-stretch p-4 bg-bg-primary rounded-2xl outline outline-1 outline-offset-[-1px] inline-flex justify-start items-center gap-6 flex-wrap lg:flex-nowrap transition-colors ${
              isDragTarget
                ? "outline-stroke-accent-primary bg-bg-accent-light"
                : "outline-stroke-secondary"
            } ${isDragging ? "opacity-60" : ""}`}
          >
            <div className="flex-1 flex justify-start items-center gap-6 min-w-[260px]">
              <button
                type="button"
                onClick={(event) => event.preventDefault()}
                className={`inline-flex h-9 w-9 items-center justify-center rounded-lg p-0 leading-none ${
                  canDrag
                    ? "cursor-grab active:cursor-grabbing hover:bg-bg-secondary transition-colors"
                    : "text-gray-500"
                }`}
                title={canDrag ? "Arrastra para reordenar" : undefined}
              >
                <Icon
                  name="drag_indicator"
                  size={28}
                  className={`block leading-none ${canDrag ? "text-gray-500" : ""}`}
                />
              </button>
              <div className="inline-flex flex-col justify-start items-start gap-1">
                <div className="text-text-primary text-lg font-medium leading-5">
                  {evaluation.fullName}
                </div>
                <div className="inline-flex justify-start items-start gap-4">
                  <div className="flex justify-start items-center gap-1">
                    <Icon
                      name="collections_bookmark"
                      size={12}
                      className="text-icon-tertiary"
                    />
                    <div className="text-text-quartiary text-xs font-normal leading-4">
                      {evaluation.shortName}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end items-center gap-4 flex-wrap ml-auto">
              <span
                className={`px-2.5 py-1.5 ${typeMeta.bg} rounded-full flex justify-center items-center gap-1`}
              >
                <span
                  className={`${typeMeta.text} text-xs font-medium leading-3`}
                >
                  {typeMeta.label}
                </span>
              </span>
              <div className="flex justify-start items-center gap-2">
                <button
                  onClick={() => onEdit(evaluation.id)}
                  className="p-0.5 rounded-full flex justify-center items-center gap-1 hover:bg-bg-secondary transition-colors"
                >
                  <Icon name="edit" size={16} className="text-icon-tertiary" />
                </button>
                <button
                  onClick={() => onDelete(evaluation.id)}
                  className="p-0.5 rounded-full flex justify-center items-center gap-1 hover:bg-bg-secondary transition-colors"
                >
                  <Icon
                    name="delete"
                    size={16}
                    className="text-icon-tertiary"
                  />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface CourseEditorFooterProps {
  onCancel: () => void;
  onSave: () => void;
  saveDisabled: boolean;
  saveLoading?: boolean;
  saveLabel?: string;
  saveLoadingLabel?: string;
}

export function CourseEditorFooter({
  onCancel,
  onSave,
  saveDisabled,
  saveLoading = false,
  saveLabel = "Guardar",
  saveLoadingLabel = "Guardando...",
}: CourseEditorFooterProps) {
  return (
    <div className="self-stretch inline-flex justify-end items-center gap-4">
      <button
        onClick={onCancel}
        disabled={saveLoading}
        className="px-6 py-3 bg-bg-primary rounded-lg outline outline-1 outline-offset-[-1px] outline-stroke-primary flex justify-center items-center gap-1.5 hover:bg-bg-secondary transition-colors"
      >
        <span className="text-text-tertiary text-sm font-medium leading-4">
          Cancelar
        </span>
      </button>
      <button
        onClick={onSave}
        disabled={saveDisabled || saveLoading}
        className={`px-6 py-3 rounded-lg flex justify-center items-center gap-1.5 ${
          !saveDisabled && !saveLoading
            ? "bg-bg-accent-primary-solid hover:bg-bg-accent-solid-hover"
            : saveLoading
              ? "bg-bg-accent-primary-solid cursor-wait"
              : "bg-bg-disabled cursor-not-allowed"
        }`}
      >
        {saveLoading ? (
          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : null}
        <span
          className={`${
            !saveDisabled || saveLoading
              ? "text-text-white"
              : "text-text-disabled"
          } text-sm font-medium leading-4`}
        >
          {saveLoading ? saveLoadingLabel : saveLabel}
        </span>
      </button>
    </div>
  );
}

interface CourseProfessorManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  assignedProfessors: AdminCourseCycleProfessor[];
  availableProfessors: ProfessorModalOption[];
  professorOptionsLoading: boolean;
  professorSearch: string;
  onProfessorSearchChange: (value: string) => void;
  actionLoadingId: string | null;
  onAddProfessor: (professor: ProfessorModalOption) => void;
  onRemoveProfessor: (professorId: string) => void;
}

export function CourseProfessorManagerModal({
  isOpen,
  onClose,
  assignedProfessors,
  availableProfessors,
  professorOptionsLoading,
  professorSearch,
  onProfessorSearchChange,
  actionLoadingId,
  onAddProfessor,
  onRemoveProfessor,
}: CourseProfessorManagerModalProps) {
  const canAddProfessor = assignedProfessors.length < MAX_COURSE_PROFESSORS;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Gestionar asesores"
      size="md"
      footer={
        <Modal.Button
          variant="secondary"
          onClick={onClose}
          disabled={Boolean(actionLoadingId)}
        >
          Cerrar
        </Modal.Button>
      }
    >
      <div className="flex flex-col gap-5">
        <p className="text-text-secondary text-sm leading-5">
          Puedes asignar hasta {MAX_COURSE_PROFESSORS} asesores por curso.
        </p>

        <div className="flex flex-col gap-2">
          <div className="text-text-primary text-sm font-semibold leading-4">
            Asesores asignados
          </div>
          <div className="flex flex-wrap gap-2">
            {assignedProfessors.length > 0 ? (
              assignedProfessors.map((professor) => (
                <div
                  key={professor.id}
                  className="px-2.5 py-1.5 bg-bg-info-primary-light rounded-full flex justify-center items-center gap-1"
                >
                  <span className="text-text-info-primary text-xs font-medium leading-3">
                    {getProfessorDisplayName(professor)}
                  </span>
                  <button
                    type="button"
                    onClick={() => onRemoveProfessor(professor.id)}
                    disabled={actionLoadingId === professor.id}
                    className="inline-flex items-center justify-center disabled:opacity-50"
                  >
                    <Icon
                      name="close"
                      size={14}
                      className="text-icon-info-primary"
                      variant="outlined"
                    />
                  </button>
                </div>
              ))
            ) : (
              <span className="text-text-tertiary text-sm leading-4">
                Sin asignar
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="text-text-primary text-sm font-semibold leading-4">
            Añadir asesor
          </div>
          {canAddProfessor ? (
            <div className="flex flex-col gap-1">
              <div className="self-stretch h-12 px-3 py-3.5 bg-bg-primary rounded outline outline-1 outline-offset-[-1px] outline-stroke-primary inline-flex justify-start items-center gap-2">
                <Icon name="search" size={16} className="text-icon-tertiary" />
                <input
                  type="text"
                  value={professorSearch}
                  onChange={(event) =>
                    onProfessorSearchChange(event.target.value)
                  }
                  placeholder="Buscar asesor por nombre o correo..."
                  className="flex-1 bg-transparent text-text-primary text-base font-normal leading-4 placeholder:text-text-tertiary outline-none"
                />
              </div>
            </div>
          ) : null}
          {professorOptionsLoading ? (
            <div className="py-4 flex justify-center">
              <div className="w-8 h-8 border-3 border-accent-solid border-t-transparent rounded-full animate-spin" />
            </div>
          ) : !canAddProfessor ? (
            <div className="text-text-tertiary text-sm leading-4">
              Ya alcanzaste el máximo de {MAX_COURSE_PROFESSORS} asesores.
            </div>
          ) : availableProfessors.length === 0 ? (
            <div className="text-text-tertiary text-sm leading-4">
              {professorSearch.trim()
                ? "No se encontraron asesores con esa busqueda."
                : "Busca un asesor para agregarlo al curso."}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {availableProfessors.map((professor) => (
                <button
                  key={professor.id}
                  type="button"
                  onClick={() => onAddProfessor(professor)}
                  disabled={Boolean(actionLoadingId)}
                  className="w-full px-3 py-3 rounded-lg outline outline-1 outline-offset-[-1px] outline-stroke-primary flex items-center justify-between gap-3 text-left hover:bg-bg-secondary transition-colors disabled:opacity-50"
                >
                  <div className="flex flex-col">
                    <span className="text-text-primary text-sm font-medium leading-4">
                      {professor.fullName}
                    </span>
                    <span className="text-text-tertiary text-xs leading-4">
                      Asesor disponible
                    </span>
                  </div>
                  <Icon
                    name="person_add_alt"
                    size={18}
                    className="text-icon-tertiary"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}


