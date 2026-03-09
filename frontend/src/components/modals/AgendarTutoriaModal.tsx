'use client';

import { useState } from 'react';
import { FaWhatsapp } from "react-icons/fa";
import Modal from '@/components/ui/Modal';

interface AgendarTutoriaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (curso: string, tema: string) => void;
}

export default function AgendarTutoriaModal({ isOpen, onClose, onSubmit }: AgendarTutoriaModalProps) {
  const [curso, setCurso] = useState('');
  const [tema, setTema] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (curso.trim() && tema.trim()) {
      onSubmit(curso.trim(), tema.trim());
      setCurso('');
      setTema('');
      onClose();
    }
  };

  const handleClose = () => {
    setCurso('');
    setTema('');
    onClose();
  };

  const inputClasses = "w-full pl-4 pr-4 py-3 border border-stroke-primary rounded-lg text-sm text-text-primary placeholder:text-text-placeholder focus:outline-none focus:border-stroke-accent-primary transition-colors";

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Agendar Tutoría"
      footer={
        <>
          <Modal.Button variant="secondary" onClick={handleClose}>
            Cancelar
          </Modal.Button>
          <Modal.Button
            variant="primary"
            disabled={!curso.trim() || !tema.trim()}
            onClick={() => {
              const form = document.getElementById('agendar-tutoria-form') as HTMLFormElement;
              form?.requestSubmit();
            }}
          >
            <FaWhatsapp className="text-[18px]" />
            Continuar
          </Modal.Button>
        </>
      }
    >
      <form id="agendar-tutoria-form" onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <input
            id="curso"
            type="text"
            value={curso}
            onChange={(e) => setCurso(e.target.value)}
            placeholder="Curso"
            required
            className={inputClasses}
          />
          <label htmlFor="curso" className="text-sm text-text-tertiary">
            Ej: Fundamentos de Física
          </label>
        </div>

        <div className="flex flex-col gap-1">
          <input
            id="tema"
            type="text"
            value={tema}
            onChange={(e) => setTema(e.target.value)}
            placeholder="Evaluación o Tema"
            required
            className={inputClasses}
          />
          <label htmlFor="tema" className="text-sm text-text-tertiary">
            Ej: PC1, EX1, Laboratorio 3
          </label>
        </div>
      </form>
    </Modal>
  );
}
