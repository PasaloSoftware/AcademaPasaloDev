'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon';

interface DatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  min?: string;  // YYYY-MM-DD
  placeholder?: string;
}

const DAY_HEADERS = ['DO', 'LU', 'MA', 'MI', 'JU', 'VI', 'SA'];

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function toDateStr(y: number, m: number, d: number): string {
  return `${y}-${(m + 1).toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
}

function formatDisplay(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const formatted = date.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' });
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

export default function DatePicker({ value, onChange, min, placeholder = 'Fecha' }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const initDate = value ? new Date(value + 'T12:00:00') : new Date();
  const [viewYear, setViewYear] = useState(initDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initDate.getMonth());

  const updatePos = useCallback(() => {
    if (!triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    setPos({ top: r.bottom + 4, left: r.left });
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

  // Calendar grid
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrev = new Date(viewYear, viewMonth, 0).getDate();

  const cells: { day: number; inMonth: boolean; dateStr: string }[] = [];
  for (let i = firstDay - 1; i >= 0; i--) {
    const d = daysInPrev - i;
    const m = viewMonth === 0 ? 11 : viewMonth - 1;
    const y = viewMonth === 0 ? viewYear - 1 : viewYear;
    cells.push({ day: d, inMonth: false, dateStr: toDateStr(y, m, d) });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, inMonth: true, dateStr: toDateStr(viewYear, viewMonth, d) });
  }
  const rem = 7 - (cells.length % 7);
  if (rem < 7) {
    for (let d = 1; d <= rem; d++) {
      const m = viewMonth === 11 ? 0 : viewMonth + 1;
      const y = viewMonth === 11 ? viewYear + 1 : viewYear;
      cells.push({ day: d, inMonth: false, dateStr: toDateStr(y, m, d) });
    }
  }

  const weeks: typeof cells[] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  const prevMonth = () => { if (viewMonth === 0) { setViewYear(viewYear - 1); setViewMonth(11); } else setViewMonth(viewMonth - 1); };
  const nextMonth = () => { if (viewMonth === 11) { setViewYear(viewYear + 1); setViewMonth(0); } else setViewMonth(viewMonth + 1); };

  const handleSelect = (dateStr: string) => { onChange(dateStr); setIsOpen(false); };
  const isDisabled = (dateStr: string) => min ? dateStr < min : false;

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
          style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999 }}
          className="p-6 bg-bg-primary rounded-lg shadow-[0px_0px_8px_0px_rgba(0,0,0,0.25)] border-b border-stroke-primary inline-flex flex-col justify-center items-center gap-2"
        >
          <div className="self-stretch inline-flex justify-start items-center gap-2">
            <span className="flex-1 text-text-secondary text-lg font-normal leading-5">
              {MONTH_NAMES[viewMonth]} de {viewYear}
            </span>
            <button type="button" onClick={prevMonth} className="p-0.5 rounded-full flex justify-center items-center hover:bg-bg-secondary transition-colors">
              <Icon name="chevron_left" size={16} className="text-icon-tertiary" variant="rounded" />
            </button>
            <button type="button" onClick={nextMonth} className="p-0.5 rounded-full flex justify-center items-center hover:bg-bg-secondary transition-colors">
              <Icon name="chevron_right" size={16} className="text-icon-tertiary" variant="rounded" />
            </button>
          </div>

          <div className="inline-flex justify-center items-center gap-3">
            {DAY_HEADERS.map((d) => (
              <div key={d} className="w-8 h-8 text-center flex items-center justify-center text-text-primary text-sm font-medium leading-4">{d}</div>
            ))}
          </div>

          {weeks.map((week, wi) => (
            <div key={wi} className="inline-flex justify-center items-center gap-3">
              {week.map((cell, ci) => {
                const selected = cell.dateStr === value;
                const dis = !cell.inMonth || isDisabled(cell.dateStr);
                return (
                  <button
                    key={ci}
                    type="button"
                    disabled={dis}
                    onClick={() => !dis && handleSelect(cell.dateStr)}
                    className={`w-8 h-8 rounded-full inline-flex flex-col justify-center items-center transition-colors ${
                      selected ? 'bg-bg-accent-primary-solid' : dis ? 'bg-bg-primary' : 'bg-bg-primary hover:bg-bg-secondary'
                    }`}
                  >
                    <span className={`text-center text-xs leading-4 ${
                      selected ? 'text-text-white font-medium' : dis ? 'text-text-disabled font-normal' : 'text-text-primary font-normal'
                    }`}>{cell.day}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>,
        document.body,
      )}
    </div>
  );
}
