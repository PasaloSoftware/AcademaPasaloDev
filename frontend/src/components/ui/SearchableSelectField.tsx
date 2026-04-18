"use client";

import { useEffect, useRef, useState } from "react";
import Icon from "@/components/ui/Icon";

interface SearchableSelectFieldProps<T> {
  label: string;
  placeholder: string;
  value: string;
  query: string;
  onQueryChange: (value: string) => void;
  onOpen?: () => void;
  options: T[];
  onSelect: (option: T) => void;
  getOptionKey: (option: T) => string | number;
  renderOption: (option: T) => React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
  emptyText: string;
  className?: string;
  dropdownClassName?: string;
}

export default function SearchableSelectField<T>({
  label,
  placeholder,
  value,
  query,
  onQueryChange,
  onOpen,
  options,
  onSelect,
  getOptionKey,
  renderOption,
  loading = false,
  disabled = false,
  emptyText,
  className = "self-stretch",
  dropdownClassName = "absolute top-full left-0 right-0 mt-1 z-40 max-h-64 overflow-y-auto p-1 bg-bg-primary rounded-lg shadow-[2px_4px_4px_0px_rgba(0,0,0,0.05)] outline outline-1 outline-offset-[-1px] outline-stroke-secondary flex flex-col",
}: SearchableSelectFieldProps<T>) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const displayValue = open ? query : value || query;
  const isFilled = open ? query.length > 0 : value.length > 0;

  return (
    <div
      ref={wrapperRef}
      className={`${className} relative flex flex-col gap-1 ${open ? "z-30" : ""}`}
    >
      <div
        className={`self-stretch h-12 px-3 py-3.5 bg-bg-primary rounded outline outline-1 outline-offset-[-1px] ${open ? "outline-stroke-accent-secondary" : "outline-stroke-primary"} inline-flex justify-start items-center gap-2 transition-colors ${disabled ? "opacity-60" : ""}`}
      >
        <input
          type="text"
          value={displayValue}
          onChange={(event) => {
            onQueryChange(event.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            if (disabled) return;
            onOpen?.();
            setOpen(true);
          }}
          placeholder={isFilled ? "" : placeholder}
          disabled={disabled}
          className="flex-1 text-text-primary text-base font-normal leading-4 bg-transparent outline-none placeholder:text-text-tertiary disabled:cursor-not-allowed"
        />
        {loading ? (
          <div className="w-4 h-4 border-2 border-accent-solid border-t-transparent rounded-full animate-spin" />
        ) : (
          <Icon name="expand_more" size={20} className="text-icon-tertiary" />
        )}
      </div>
      {isFilled && (
        <div className="px-1 left-[8px] top-[-7px] absolute bg-bg-primary inline-flex justify-start items-start">
          <span
            className={`text-xs font-normal leading-4 ${open ? "text-text-accent-primary" : "text-text-tertiary"}`}
          >
            {label}
          </span>
        </div>
      )}
      {open && !disabled && (
        <div className={dropdownClassName}>
          {options.length === 0 ? (
            <div className="px-3 py-3 text-text-tertiary text-sm">
              {emptyText}
            </div>
          ) : (
            options.map((option) => (
              <button
                key={getOptionKey(option)}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onSelect(option);
                  setOpen(false);
                }}
                className="px-2 py-3 rounded text-left hover:bg-bg-secondary transition-colors"
              >
                {renderOption(option)}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
