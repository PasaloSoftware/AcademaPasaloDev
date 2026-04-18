"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import Icon from "@/components/ui/Icon";

export interface FloatingSelectOption {
  value: string;
  label: string;
}

interface FloatingSelectProps {
  label: string;
  value: string | null;
  options: FloatingSelectOption[];
  onChange: (value: string | null) => void;
  allLabel?: string;
  includeAllOption?: boolean;
  disabled?: boolean;
  className?: string;
  variant?: "floating" | "filled";
  size?: "medium" | "large";
}

export default function FloatingSelect({
  label,
  value,
  options,
  onChange,
  allLabel = "Todos",
  includeAllOption = true,
  disabled = false,
  className = "w-64",
  variant = "floating",
  size = "medium",
}: FloatingSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedLabel = value
    ? (options.find((o) => o.value === value)?.label ?? allLabel)
    : allLabel;

  const isFloating = variant === "floating";
  const triggerHeightClass =
    size === "large" ? "h-12 px-3 py-3.5" : "h-10 px-2.5 py-3";
  const triggerTextClass =
    size === "large" ? "text-base leading-4" : "text-sm leading-4";
  const dropdownItemClass =
    size === "large"
      ? "px-3 py-4 text-base leading-4"
      : "px-3 py-4 text-base leading-4";

  useEffect(() => {
    if (!isOpen || !containerRef.current) return;

    const updateDropdownPosition = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      setDropdownStyle({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      });
    };

    updateDropdownPosition();
    window.addEventListener("resize", updateDropdownPosition);
    window.addEventListener("scroll", updateDropdownPosition, true);

    return () => {
      window.removeEventListener("resize", updateDropdownPosition);
      window.removeEventListener("scroll", updateDropdownPosition, true);
    };
  }, [isOpen]);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      const clickedTrigger =
        containerRef.current && containerRef.current.contains(target);
      const clickedDropdown =
        dropdownRef.current && dropdownRef.current.contains(target);

      if (!clickedTrigger && !clickedDropdown) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setIsOpen(false);
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  return (
    <div
      ref={containerRef}
      className={`${className} relative inline-flex flex-col justify-start items-start ${isFloating ? "gap-1" : "gap-0"}`}
    >
      {/* Trigger */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        disabled={disabled}
        className={`self-stretch ${triggerHeightClass} bg-bg-primary rounded outline outline-1 outline-offset-[-1px] ${
          isOpen ? "outline-stroke-accent-secondary" : "outline-stroke-primary"
        } inline-flex justify-start items-center gap-2 transition-colors`}
      >
        <span
          className={`flex-1 text-left text-text-primary font-normal line-clamp-1 ${triggerTextClass}`}
        >
          {selectedLabel}
        </span>
        <Icon
          name="expand_more"
          size={20}
          className={`transition-transform ${isOpen ? "rotate-180" : ""} ${
            isOpen ? "text-icon-accent-primary" : "text-icon-tertiary"
          }`}
        />
      </button>

      {/* Floating label */}
      {isFloating && (
        <div className="px-1 left-[6px] top-[-7px] absolute bg-bg-primary inline-flex justify-start items-start">
          <span
            className={`text-xs font-normal leading-4 ${
              isOpen ? "text-text-accent-primary" : "text-text-tertiary"
            }`}
          >
            {label}
          </span>
        </div>
      )}

      {/* Dropdown */}
      {isOpen &&
        typeof document !== "undefined" &&
        dropdownStyle &&
        createPortal(
          <div
            ref={dropdownRef}
            className="p-1 fixed bg-bg-primary rounded-lg shadow-[2px_4px_4px_0px_rgba(0,0,0,0.05)] outline outline-1 outline-offset-[-1px] outline-stroke-secondary inline-flex flex-col justify-start items-start z-[120] max-h-80 overflow-y-auto"
            style={{
              top: dropdownStyle.top,
              left: dropdownStyle.left,
              width: dropdownStyle.width,
            }}
          >
            {includeAllOption && (
              <button
                type="button"
                onClick={() => {
                  onChange(null);
                  setIsOpen(false);
                }}
                className={`self-stretch bg-bg-primary rounded inline-flex justify-start items-center gap-2 hover:bg-bg-secondary transition-colors ${dropdownItemClass}`}
              >
                <span className="flex-1 text-left text-text-secondary text-base font-normal leading-4">
                  {allLabel}
                </span>
                {value === null && (
                  <Icon
                    name="check"
                    size={16}
                    className="text-icon-accent-primary"
                  />
                )}
              </button>
            )}

            {/* Course options */}
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`self-stretch bg-bg-primary rounded inline-flex justify-start items-center gap-2 hover:bg-bg-secondary transition-colors ${dropdownItemClass}`}
              >
                <span className="flex-1 text-left text-text-secondary text-base font-normal leading-4">
                  {option.label}
                </span>
                {value === option.value && (
                  <Icon
                    name="check"
                    size={16}
                    className="text-icon-accent-primary"
                  />
                )}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
}
