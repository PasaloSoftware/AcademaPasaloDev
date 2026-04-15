'use client';

import Modal from '@/components/ui/Modal';

interface ConfirmBanModalProps {
  isOpen: boolean;
  userName: string;
  action?: 'activate' | 'deactivate';
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export default function ConfirmBanModal({
  isOpen,
  userName,
  action = 'deactivate',
  onConfirm,
  onCancel,
  loading = false,
}: ConfirmBanModalProps) {
  const isDeactivate = action === 'deactivate';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title={
        isDeactivate
          ? 'Desactivar cuenta de usuario'
          : 'Activar cuenta de usuario'
      }
      footer={
        <>
          <Modal.Button
            variant="secondary"
            onClick={onCancel}
            disabled={loading}
          >
            Cancelar
          </Modal.Button>
          <Modal.Button
            variant={isDeactivate ? 'danger' : 'primary'}
            onClick={onConfirm}
            loading={loading}
            loadingText={isDeactivate ? 'Desactivando...' : 'Activando...'}
          >
            {isDeactivate ? 'Desactivar cuenta' : 'Activar cuenta'}
          </Modal.Button>
        </>
      }
    >
      <p className="text-text-tertiary text-base font-normal leading-4">
        {isDeactivate ? (
          <>
            Estas a punto de desactivar la cuenta de{' '}
            <strong className="text-text-primary">{userName}</strong>. Esta
            accion cerrara todas sus sesiones activas y le impedira acceder a
            la plataforma hasta que un administrador reactive su cuenta.
          </>
        ) : (
          <>
            Estas a punto de activar la cuenta de{' '}
            <strong className="text-text-primary">{userName}</strong>. El
            usuario recuperara el acceso a la plataforma con sus permisos
            actuales.
          </>
        )}
      </p>
    </Modal>
  );
}
