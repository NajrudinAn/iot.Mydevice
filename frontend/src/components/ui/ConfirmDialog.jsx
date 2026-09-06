import React from 'react';
import Modal from './Modal';
import Button from './Button';

export default function ConfirmDialog({ isOpen, onClose, onConfirm, title, message, confirmText = "Confirm", confirmVariant = "danger", loading = false }) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      footer={
        <div className="flex gap-4 justify-end">
          <Button variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button variant={confirmVariant} onClick={onConfirm} loading={loading}>{confirmText}</Button>
        </div>
      }
    >
      <p className="text-muted">{message}</p>
    </Modal>
  );
}
