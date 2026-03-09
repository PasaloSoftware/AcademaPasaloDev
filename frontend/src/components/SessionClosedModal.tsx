'use client';

import { useEffect, useState, useCallback } from 'react';
import { clearAuth } from '@/lib/storage';
import Modal from '@/components/ui/Modal';

/**
 * Modal que se muestra cuando la sesión ha sido cerrada remotamente
 * (ej. sesión cerrada en otro dispositivo o token expirado)
 *
 * Este modal bloquea toda interacción y controla el flujo de redirect.
 * clearAuth() se llama aquí (no en apiClient) para evitar que
 * DashboardLayout redirija antes de que el usuario vea el mensaje.
 */
export default function SessionClosedModal() {
  const [showModal, setShowModal] = useState(false);

  const handleRedirect = useCallback(() => {
    clearAuth();
    window.location.href = '/plataforma';
  }, []);

  useEffect(() => {
    const handleSessionClosed = () => {
      setShowModal(true);
    };

    window.addEventListener('session-closed-remotely', handleSessionClosed);

    return () => {
      window.removeEventListener('session-closed-remotely', handleSessionClosed);
    };
  }, []);

  return (
    <Modal
      isOpen={showModal}
      onClose={handleRedirect}
      title="Tu sesión ha sido cerrada"
      closeOnOverlay={false}
      showCloseButton={false}
      zIndex={9999}
      footer={
        <Modal.Button variant="primary" onClick={handleRedirect} className="w-full">
          Iniciar sesión nuevamente
        </Modal.Button>
      }
    >
      <p className="text-text-tertiary text-base font-normal leading-4">
        Esto puede ocurrir porque iniciaste sesión en otro dispositivo, tu sesión expiró
        por inactividad, o se detectó actividad sospechosa.
      </p>
    </Modal>
  );
}
