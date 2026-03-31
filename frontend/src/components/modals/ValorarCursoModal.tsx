'use client';

import { useState } from 'react';
import Modal from '@/components/ui/Modal';

interface ValorarCursoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (rating: number, comment: string) => Promise<void>;
}

const MAX_COMMENT_LENGTH = 500;

function RatingStar({ filled }: { filled: boolean }) {
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M18 26.655L27.27 32.25L24.81 21.705L33 14.61L22.215 13.695L18 3.75L13.785 13.695L3 14.61L11.19 21.705L8.73 32.25L18 26.655Z"
        className={filled ? 'fill-bg-rating-solid' : 'fill-[#CED4DA]'}
      />
    </svg>
  );
}

function StarRatingInput({
  rating,
  onRate,
}: {
  rating: number;
  onRate: (value: number) => void;
}) {
  const [hovered, setHovered] = useState(0);

  return (
    <div className="self-stretch flex flex-col justify-start items-center gap-2">
      <div className="inline-flex justify-start items-center">
        {Array.from({ length: 5 }, (_, i) => {
          const value = i + 1;
          const isActive = value <= (hovered || rating);
          return (
            <button
              key={value}
              type="button"
              onMouseEnter={() => setHovered(value)}
              onMouseLeave={() => setHovered(0)}
              onClick={() => onRate(value)}
              className="inline-flex flex-col justify-start items-start"
            >
              <RatingStar filled={isActive} />
            </button>
          );
        })}
      </div>
      <div className="self-stretch flex flex-col justify-center items-center">
        <span className="self-stretch text-center text-text-quartiary text-xs font-normal leading-4">
          Haz clic para calificar
        </span>
      </div>
    </div>
  );
}

export default function ValorarCursoModal({
  isOpen,
  onClose,
  onSubmit,
}: ValorarCursoModalProps) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isValid = rating >= 1 && comment.trim().length >= 3;

  const handleSubmit = async () => {
    if (!isValid || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit(rating, comment.trim());
      setRating(0);
      setComment('');
      onClose();
    } catch {
      // error handling delegated to parent
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (submitting) return;
    setRating(0);
    setComment('');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Valorar Curso"
      size="sm"
      footer={
        <>
          <Modal.Button variant="secondary" onClick={handleClose} disabled={submitting}>
            Cancelar
          </Modal.Button>
          <Modal.Button
            variant="primary"
            onClick={handleSubmit}
            disabled={!isValid}
            loading={submitting}
            loadingText="Enviando..."
          >
            Enviar
          </Modal.Button>
        </>
      }
    >
      <div className="self-stretch flex flex-col justify-center items-center gap-4">
        <div className="self-stretch flex flex-col justify-center items-center">
          <span className="self-stretch text-center text-text-secondary text-sm font-normal leading-4">
            Tu opinión nos ayuda a mejorar
          </span>
        </div>
        <div className="self-stretch flex flex-col justify-center items-center gap-8">
          <StarRatingInput rating={rating} onRate={setRating} />
          <div className="self-stretch flex flex-col justify-start items-start gap-1">
            <textarea
              value={comment}
              onChange={(e) => {
                if (e.target.value.length <= MAX_COMMENT_LENGTH) {
                  setComment(e.target.value);
                }
              }}
              placeholder="Escribe tu experiencia con el curso..."
              className="self-stretch h-28 px-3 py-3.5 bg-bg-primary rounded outline outline-1 outline-offset-[-1px] outline-stroke-primary text-text-primary text-base font-normal leading-4 placeholder:text-text-placeholder resize-none focus:outline-stroke-accent-primary"
            />
            <div className="self-stretch inline-flex justify-end items-start gap-1">
              <span className="text-right text-text-tertiary text-xs font-light leading-4">
                {comment.length}/{MAX_COMMENT_LENGTH}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
