'use client';

import Modal from '@/components/ui/Modal';

interface ConfirmBanModalProps {
  isOpen: boolean;
  userName: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export default function ConfirmBanModal({
  isOpen,
  userName,
  onConfirm,
  onCancel,
  loading = false,
}: ConfirmBanModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title="Desactivar cuenta de usuario"
      footer={
        <>
          <Modal.Button variant="secondary" onClick={onCancel} disabled={loading}>
            Cancelar
          </Modal.Button>
          <Modal.Button
            variant="danger"
            onClick={onConfirm}
            loading={loading}
            loadingText="Desactivando..."
          >
            Desactivar cuenta
          </Modal.Button>
        </>
      }
    >
      <p className="text-text-tertiary text-base font-normal leading-4">
        Estás a punto de desactivar la cuenta de <strong className="text-text-primary">{userName}</strong>.
        Esta acción cerrará todas sus sesiones activas y le impedirá acceder
        a la plataforma hasta que un administrador reactive su cuenta.
      </p>
    </Modal>
  );
}
