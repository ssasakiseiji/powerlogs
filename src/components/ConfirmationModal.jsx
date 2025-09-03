import React from 'react';
import Modal from './Modal';

const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message }) => {
  if (!isOpen) return null;
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <p className="text-gray-300 mb-6">{message}</p>
      <div className="flex justify-end gap-4">
        <button onClick={onClose} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg font-semibold">Cancelar</button>
        <button onClick={onConfirm} className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg font-semibold text-white">Confirmar</button>
      </div>
    </Modal>
  );
};

export default ConfirmationModal;