'use client';

import Icon from '@/components/ui/Icon';
import type { CycleEvaluation, EvaluationLabel } from '@/types/curso';

// ============================================
// Helpers de estado visual para evaluaciones
// ============================================

export function getEvalIcon(label: EvaluationLabel): string {
  switch (label) {
    case 'Completado':
      return 'check_circle';
    case 'En curso':
      return 'bookmark';
    case 'Próximamente':
      return 'watch_later';
    case 'Bloqueado':
      return 'lock';
  }
}

export function getEvalIconBg(label: EvaluationLabel): string {
  switch (label) {
    case 'Completado':
      return 'bg-bg-success-light';
    case 'En curso':
      return 'bg-bg-accent-light';
    case 'Próximamente':
      return 'bg-bg-tertiary';
    case 'Bloqueado':
      return 'bg-bg-disabled';
  }
}

export function getEvalIconColor(label: EvaluationLabel): string {
  switch (label) {
    case 'Completado':
      return 'text-icon-success-primary';
    case 'En curso':
      return 'text-icon-accent-primary';
    case 'Próximamente':
      return 'text-icon-tertiary';
    case 'Bloqueado':
      return 'text-icon-disabled';
  }
}

export function getEvalBadgeBg(label: EvaluationLabel): string {
  switch (label) {
    case 'Completado':
      return 'bg-bg-success-light';
    case 'En curso':
      return 'bg-bg-accent-light';
    case 'Próximamente':
      return 'bg-bg-quartiary';
    case 'Bloqueado':
      return 'bg-bg-disabled';
  }
}

export function getEvalBadgeText(label: EvaluationLabel): string {
  switch (label) {
    case 'Completado':
      return 'text-text-success-primary';
    case 'En curso':
      return 'text-text-accent-primary';
    case 'Próximamente':
      return 'text-text-secondary';
    case 'Bloqueado':
      return 'text-text-disabled';
  }
}

export function getEvalCardBg(label: EvaluationLabel): string {
  return label === 'Bloqueado' ? 'bg-bg-tertiary' : 'bg-bg-primary';
}

export function isEvalDisabled(label: EvaluationLabel): boolean {
  return label === 'Próximamente' || label === 'Bloqueado';
}

const evalLabelOrder: Record<EvaluationLabel, number> = {
  'Completado': 0,
  'En curso': 1,
  'Próximamente': 2,
  'Bloqueado': 3,
};

export function sortEvaluations<T extends { label: EvaluationLabel }>(evaluations: T[]): T[] {
  return [...evaluations].sort((a, b) => evalLabelOrder[a.label] - evalLabelOrder[b.label]);
}

// ============================================
// EvaluationCard
// ============================================

export function EvaluationCard({
  evaluation,
  onSelect,
  forceEnabled = false,
}: {
  evaluation: CycleEvaluation;
  onSelect?: (evaluation: CycleEvaluation) => void;
  forceEnabled?: boolean;
}) {
  const disabled = forceEnabled ? false : isEvalDisabled(evaluation.label);
  const isEnCurso = evaluation.label === 'En curso';

  if (isEnCurso) {
    return (
      <div className="self-stretch bg-bg-primary rounded-2xl border-l-[3px] border-stroke-accent-primary inline-flex flex-col justify-start items-end">
        <div className="self-stretch p-6 rounded-2xl border-r border-t border-b border-stroke-primary flex flex-col justify-start items-end gap-4">
          <div className="self-stretch inline-flex justify-between items-start">
            <div
              className={`p-3 ${getEvalIconBg(evaluation.label)} rounded-full flex justify-start items-center`}
            >
              <Icon
                name={getEvalIcon(evaluation.label)}
                size={24}
                className={getEvalIconColor(evaluation.label)}
              />
            </div>
            <div className="flex justify-start items-start">
              <div
                className={`px-2.5 py-1.5 ${getEvalBadgeBg(evaluation.label)} rounded-full flex justify-center items-center gap-1`}
              >
                <span
                  className={`text-xs font-medium leading-3 ${getEvalBadgeText(evaluation.label)}`}
                >
                  {evaluation.label}
                </span>
              </div>
            </div>
          </div>

          <div className="self-stretch flex flex-col justify-start items-start gap-1">
            <div className="self-stretch text-text-primary text-lg font-semibold leading-5">
              {evaluation.shortName}
            </div>
            <div className="self-stretch text-text-secondary text-xs font-normal leading-4">
              {evaluation.fullName}
            </div>
          </div>

          <button
            onClick={() => onSelect?.(evaluation)}
            className="p-1 rounded-lg inline-flex justify-center items-center gap-1.5 hover:bg-bg-accent-light transition-colors"
          >
            <span className="text-text-accent-primary text-sm font-medium leading-4">
              Ver Clases
            </span>
            <Icon
              name="arrow_forward"
              size={16}
              className="text-icon-accent-primary"
            />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`self-stretch p-6 ${getEvalCardBg(evaluation.label)} rounded-2xl outline outline-1 outline-offset-[-1px] outline-stroke-primary inline-flex flex-col justify-start items-end gap-4`}
    >
      <div className="self-stretch inline-flex justify-between items-start">
        <div
          className={`p-3 ${getEvalIconBg(evaluation.label)} rounded-full flex justify-start items-center`}
        >
          <Icon
            name={getEvalIcon(evaluation.label)}
            size={24}
            className={getEvalIconColor(evaluation.label)}
          />
        </div>
        <div className="flex justify-start items-start">
          <div
            className={`px-2.5 py-1.5 ${getEvalBadgeBg(evaluation.label)} rounded-full flex justify-center items-center gap-1`}
          >
            <span
              className={`text-xs font-medium leading-3 ${getEvalBadgeText(evaluation.label)}`}
            >
              {evaluation.label}
            </span>
          </div>
        </div>
      </div>

      <div className="self-stretch flex flex-col justify-start items-start gap-1">
        <div
          className={`self-stretch text-lg font-semibold leading-5 ${disabled ? 'text-text-secondary' : 'text-text-primary'}`}
        >
          {evaluation.shortName}
        </div>
        <div
          className={`self-stretch text-xs font-normal leading-4 ${disabled ? 'text-text-tertiary' : 'text-text-secondary'}`}
        >
          {evaluation.fullName}
        </div>
      </div>

      <button
        disabled={disabled}
        onClick={() => !disabled && onSelect?.(evaluation)}
        className={`p-1 rounded-lg inline-flex justify-center items-center gap-1.5 ${disabled ? 'cursor-not-allowed' : 'hover:bg-bg-accent-light transition-colors'}`}
      >
        <span
          className={`text-sm font-medium leading-4 ${disabled ? 'text-text-disabled' : 'text-text-accent-primary'}`}
        >
          Ver Clases
        </span>
        <Icon
          name="arrow_forward"
          size={16}
          className={
            disabled ? 'text-icon-disabled' : 'text-icon-accent-primary'
          }
        />
      </button>
    </div>
  );
}

// ============================================
// PreviousCycleCard
// ============================================

export function PreviousCycleCard({
  cycleCode,
  onViewCycle,
}: {
  cycleCode: string;
  onViewCycle: (code: string) => void;
}) {
  return (
    <div className="self-stretch p-6 bg-bg-primary rounded-2xl outline outline-1 outline-offset-[-1px] outline-stroke-primary inline-flex flex-col justify-start items-end gap-4">
      <div className="self-stretch inline-flex justify-start items-start">
        <div className="p-3 bg-bg-quartiary rounded-xl flex justify-start items-center">
          <Icon
            name="inventory_2"
            size={24}
            className="text-gray-700"
          />
        </div>
      </div>

      <div className="self-stretch flex flex-col justify-start items-start gap-1">
        <div className="self-stretch text-text-primary text-lg font-semibold leading-5">
          Ciclo {cycleCode}
        </div>
        <div className="self-stretch text-text-secondary text-xs font-normal leading-4">
          Contenido del ciclo {cycleCode}
        </div>
      </div>

      <button
        onClick={() => onViewCycle(cycleCode)}
        className="p-1 rounded-lg inline-flex justify-center items-center gap-1.5 hover:bg-bg-accent-light transition-colors"
      >
        <span className="text-text-accent-primary text-sm font-medium leading-4">
          Ver Ciclo
        </span>
        <Icon
          name="arrow_forward"
          size={16}
          className="text-icon-accent-primary"
        />
      </button>
    </div>
  );
}

// ============================================
// BancoCategoryCard
// ============================================

export const typeIconStyles: Record<string, { iconBg: string; iconColor: string }> = {
  PD: { iconBg: 'bg-bg-info-primary-light', iconColor: 'text-icon-info-primary' },
  PC: { iconBg: 'bg-bg-info-secondary-light', iconColor: 'text-icon-info-secondary' },
  EX: { iconBg: 'bg-bg-success-light', iconColor: 'text-icon-success-primary' },
};

export const defaultIconStyle = { iconBg: 'bg-bg-quartiary', iconColor: 'text-icon-secondary' };

export function BancoCategoryCard({
  typeCode,
  typeName,
  onSelect,
}: {
  typeCode: string;
  typeName: string;
  onSelect: () => void;
}) {
  const style = typeIconStyles[typeCode] || defaultIconStyle;

  return (
    <div className="self-stretch p-6 bg-bg-primary rounded-2xl outline outline-1 outline-offset-[-1px] outline-stroke-primary inline-flex flex-col justify-start items-end gap-4">
      <div className="self-stretch inline-flex justify-start items-start">
        <div
          className={`p-3 ${style.iconBg} rounded-xl flex justify-start items-center`}
        >
          <Icon name="folder" size={24} className={style.iconColor} />
        </div>
      </div>

      <div className="self-stretch flex flex-col justify-start items-start gap-1">
        <div className="self-stretch text-text-primary text-lg font-semibold leading-5">
          {typeName}
        </div>
        <div className="self-stretch text-text-secondary text-xs font-normal leading-4">
          Enunciados de {typeName.toLowerCase()} del curso
        </div>
      </div>

      <button
        onClick={onSelect}
        className="p-1 rounded-lg inline-flex justify-center items-center gap-1.5 hover:bg-bg-accent-light transition-colors"
      >
        <span className="text-text-accent-primary text-sm font-medium leading-4">
          Ver Enunciados
        </span>
        <Icon
          name="arrow_forward"
          size={16}
          className="text-icon-accent-primary"
        />
      </button>
    </div>
  );
}
