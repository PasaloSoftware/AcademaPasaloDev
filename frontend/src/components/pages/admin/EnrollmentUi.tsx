"use client";

import Icon from "@/components/ui/Icon";

export function ToggleSwitch({
  checked,
  onChange,
  disabled = false,
  variant = "primary",
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  variant?: "primary" | "info";
}) {
  const activeClasses =
    variant === "info"
      ? "bg-bg-info-primary-solid outline-bg-info-primary-solid"
      : "bg-bg-accent-primary-solid outline-bg-accent-primary-solid";
  const inactiveClasses =
    variant === "info"
      ? "bg-bg-info-primary-light outline-stroke-info-primary"
      : "bg-bg-accent-light outline-stroke-accent-primary";
  const knobClasses =
    variant === "info"
      ? checked
        ? "left-[19px] bg-bg-tertiary"
        : "left-[3px] bg-bg-info-primary-solid"
      : checked
        ? "left-[19px] bg-bg-tertiary"
        : "left-[3px] bg-bg-accent-primary-solid";

  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      aria-pressed={checked}
      className="w-10 h-6 inline-flex items-center overflow-hidden disabled:opacity-50"
    >
      <div
        className={`relative h-6 w-10 rounded-full outline outline-1 outline-offset-[-1px] overflow-hidden transition-colors ${
          checked ? activeClasses : inactiveClasses
        }`}
      >
        <div
          className={`absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full transition-all ${knobClasses}`}
        />
      </div>
    </button>
  );
}

export function CheckboxChip({
  label,
  checked,
  onClick,
}: {
  label: string;
  checked: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`self-stretch p-2 bg-bg-primary rounded-lg outline outline-1 inline-flex justify-start items-start gap-2 overflow-hidden ${
        checked
          ? "outline-stroke-accent-primary"
          : "outline-offset-[-1px] outline-stroke-disabled"
      }`}
    >
      <div className="flex-1 flex justify-start items-center gap-1">
        <div className="w-5 h-5 flex justify-center items-center overflow-hidden">
          <div
            className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
              checked
                ? "bg-bg-accent-primary-solid border-bg-accent-primary-solid"
                : "border-icon-tertiary"
            }`}
          >
            {checked && (
              <Icon name="check" size={12} className="text-text-white" />
            )}
          </div>
        </div>
        <div className="flex-1 justify-center text-text-secondary text-base font-normal leading-4 text-left">
          {label}
        </div>
      </div>
    </button>
  );
}

export function EnrollmentSelectionList({
  children,
  layout = "stack",
}: {
  children: React.ReactNode;
  layout?: "stack" | "grid";
}) {
  return (
    <div className="self-stretch pl-3 border-l-2 border-stroke-secondary inline-flex flex-col justify-start items-start gap-2">
      <div
        className={`self-stretch ${
          layout === "grid"
            ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2"
            : "inline-flex flex-col justify-start items-start gap-2"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

export function EnrollmentModeCard({
  title,
  description,
  selected,
  disabled = false,
  badge,
  onClick,
}: {
  title: string;
  description: string;
  selected: boolean;
  disabled?: boolean;
  badge?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`self-stretch p-4 rounded-lg inline-flex justify-start items-start gap-2 overflow-hidden transition-colors ${
        selected
          ? "outline outline-1 outline-offset-[-1px] outline-stroke-accent-primary"
          : "outline outline-1 outline-offset-[-1px] outline-stroke-secondary"
      } ${disabled ? "opacity-60 cursor-not-allowed" : "hover:bg-bg-secondary/40"}`}
    >
      <div className="flex-1 inline-flex flex-col justify-start items-start">
        <div className="self-stretch inline-flex justify-start items-center gap-1">
          <div className="w-5 h-5 flex justify-center items-center overflow-hidden">
            <div
              className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                selected
                  ? "border-bg-accent-primary-solid"
                  : "border-icon-tertiary"
              }`}
            >
              {selected && (
                <div className="w-2.5 h-2.5 rounded-full bg-bg-accent-primary-solid" />
              )}
            </div>
          </div>
          <div className="flex-1 justify-start text-text-primary text-base font-normal leading-4 text-left">
            {title}
          </div>
          {badge && (
            <span className="px-2 py-1 bg-bg-secondary rounded-full text-[10px] font-medium text-text-tertiary leading-3">
              {badge}
            </span>
          )}
        </div>
        <div className="self-stretch pl-6 inline-flex justify-between items-center">
          <div className="flex-1 justify-start text-text-tertiary text-xs font-light leading-3 text-left">
            {description}
          </div>
        </div>
      </div>
    </button>
  );
}
