'use client';

import { useState, useEffect, useCallback } from 'react';
import { FaWhatsapp } from "react-icons/fa";
import Icon from '@/components/ui/Icon';

// ============================================
// Input con floating label
// ============================================

interface FloatingInputProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  helperText: string;
}

function FloatingInput({ id, label, value, onChange, helperText }: FloatingInputProps) {
  const isFilled = value.length > 0;

  return (
    <div className="self-stretch relative flex flex-col gap-1">
      <div className="self-stretch h-12 px-3 py-3.5 bg-bg-primary rounded outline outline-1 outline-offset-[-1px] outline-stroke-primary inline-flex items-center focus-within:outline-stroke-accent-primary transition-colors">
        <input
          id={id}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={isFilled ? '' : label}
          className="flex-1 text-text-primary text-base font-normal leading-4 line-clamp-1 bg-transparent outline-none placeholder:text-text-tertiary"
        />
      </div>
      {isFilled && (
        <div className="px-1 left-[8px] top-[-7px] absolute bg-bg-primary inline-flex">
          <span className="text-text-tertiary text-xs font-normal leading-4">{label}</span>
        </div>
      )}
      <span className="text-text-tertiary text-xs font-light leading-4">{helperText}</span>
    </div>
  );
}

// ============================================
// Modal
// ============================================

interface AgendarTutoriaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (curso: string, tema: string) => void;
}

export default function AgendarTutoriaModal({ isOpen, onClose, onSubmit }: AgendarTutoriaModalProps) {
  const [curso, setCurso] = useState('');
  const [tema, setTema] = useState('');

  const handleClose = useCallback(() => {
    setCurso('');
    setTema('');
    onClose();
  }, [onClose]);

  const handleSubmit = () => {
    if (curso.trim() && tema.trim()) {
      onSubmit(curso.trim(), tema.trim());
      setCurso('');
      setTema('');
      onClose();
    }
  };

  // Escape key + scroll lock
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };

    document.addEventListener('keydown', handleKeyDown);
    const scrollY = window.scrollY;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
      window.scrollTo(0, scrollY);
    };
  }, [isOpen, handleClose]);

  if (!isOpen) return null;

  const isFormValid = curso.trim() && tema.trim();

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 z-50">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/25" onClick={handleClose} />

      {/* Panel */}
      <div className="relative w-[448px] bg-bg-primary rounded-xl outline-offset-[-1px] outline-stroke-secondary flex flex-col shadow-[0px_24px_48px_-12px_rgba(0,0,0,0.25)] animate-slideUp">
        {/* Header */}
        <div className="self-stretch pl-5 pr-4 py-5 bg-info-secondary-solid rounded-tl-xl rounded-tr-xl border-b border-stroke-primary flex items-center gap-3">
          <div className="flex-1 flex items-center gap-2">
            <div className="w-8 h-8 p-1 bg-fuchsia-300/50 rounded-full flex justify-center items-center">
              <Icon name="auto_awesome" size={20} className="text-icon-white" />
            </div>
            <h2 className="flex-1 text-text-white text-base font-semibold leading-5">
              Agendar tutoría
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded-full flex justify-center items-center hover:bg-white/10 transition-colors"
          >
            <Icon name="close" size={20} className="text-icon-white" />
          </button>
        </div>

        {/* Body + Footer */}
        <div className="self-stretch p-5 flex flex-col gap-5">
          {/* Inputs */}
          <div className="self-stretch flex flex-col gap-4">
            <FloatingInput
              id="curso"
              label="Curso"
              value={curso}
              onChange={setCurso}
              helperText="Ej: Fundamentos de Física"
            />
            <FloatingInput
              id="tema"
              label="Evaluación o Tema"
              value={tema}
              onChange={setTema}
              helperText="Ej: PC1, EX1, Laboratorio 3"
            />
          </div>

          {/* Footer */}
          <div className="self-stretch inline-flex justify-end items-center gap-4">
            <button
              onClick={handleClose}
              className="px-6 py-3 bg-bg-primary rounded-lg outline outline-1 outline-offset-[-1px] outline-stroke-primary flex justify-center items-center gap-1.5 hover:bg-bg-secondary transition-colors"
            >
              <span className="text-text-tertiary text-sm font-medium leading-4">Cancelar</span>
            </button>
            <button
              onClick={handleSubmit}
              disabled={!isFormValid}
              className={`px-6 py-3 rounded-lg flex justify-center items-center gap-1.5 transition-colors ${
                isFormValid
                  ? 'bg-info-secondary-solid hover:bg-bg-info-secondary-solid/90'
                  : 'bg-bg-disabled cursor-not-allowed'
              }`}
            >
              <FaWhatsapp className={`text-base ${isFormValid ? 'text-icon-white' : 'text-icon-disabled'}`} />
              <span className={`text-sm font-medium leading-4 ${isFormValid ? 'text-text-white' : 'text-text-disabled'}`}>
                Continuar
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
