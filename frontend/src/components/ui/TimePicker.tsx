'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

interface TimePickerProps {
  value: string; // HH:mm (24h)
  onChange: (value: string) => void;
  placeholder?: string;
}

function formatDisplay(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const hourNum = h % 12 || 12;
  const ampm = h >= 12 ? 'pm' : 'am';
  return m === 0 ? `${hourNum}:00${ampm}` : `${hourNum}:${m.toString().padStart(2, '0')}${ampm}`;
}

function generateTimeSlots(): string[] {
  const slots: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (const m of [0, 30]) {
      slots.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
    }
  }
  return slots;
}

const TIME_SLOTS = generateTimeSlots();

export default function TimePicker({ value, onChange, placeholder = 'Hora' }: TimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });

  const updatePos = useCallback(() => {
    if (!triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    setPos({ top: r.bottom + 4, left: r.left, width: r.width });
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    updatePos();
    const handleClick = (e: MouseEvent) => {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target as Node) &&
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node)
      ) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen, updatePos]);

  useEffect(() => {
    if (isOpen && selectedRef.current) {
      selectedRef.current.scrollIntoView({ block: 'center' });
    }
  }, [isOpen]);

  return (
    <div className="flex-1">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full h-12 px-3 py-3.5 bg-bg-primary rounded outline outline-1 outline-offset-[-1px] ${
          isOpen ? 'outline-stroke-accent-secondary' : 'outline-stroke-primary'
        } inline-flex justify-start items-center transition-colors`}
      >
        <span className={`flex-1 text-left text-base font-normal leading-4 line-clamp-1 ${value ? 'text-text-primary' : 'text-text-tertiary'}`}>
          {value ? formatDisplay(value) : placeholder}
        </span>
      </button>

      {isOpen && createPortal(
        <div
          ref={dropdownRef}
          style={{ position: 'fixed', top: pos.top, left: pos.left, width: pos.width, zIndex: 9999 }}
          className="max-h-60 overflow-y-auto bg-bg-primary rounded-lg shadow-[0px_0px_8px_0px_rgba(0,0,0,0.25)] border border-stroke-primary p-1 flex flex-col"
        >
          {TIME_SLOTS.map((slot) => {
            const selected = slot === value;
            return (
              <button
                key={slot}
                ref={selected ? selectedRef : undefined}
                type="button"
                onClick={() => { onChange(slot); setIsOpen(false); }}
                className={`w-full px-3 py-2.5 rounded text-left text-sm font-normal leading-4 transition-colors ${
                  selected ? 'bg-bg-accent-light text-text-accent-primary font-medium' : 'text-text-secondary hover:bg-bg-secondary'
                }`}
              >
                {formatDisplay(slot)}
              </button>
            );
          })}
        </div>,
        document.body,
      )}
    </div>
  );
}
