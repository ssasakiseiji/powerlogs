import React from 'react';

const Modal = ({ isOpen, onClose, children, title, size = 'md' }) => {
    if (!isOpen) return null;
    const sizeClasses = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-xl', '2xl': 'max-w-2xl' };
    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4 animate-fade-in">
            <div className={`bg-gray-800 rounded-lg shadow-xl w-full text-white transform transition-all scale-95 animate-scale-in ${sizeClasses[size]}`}>
                <div className="p-4 border-b border-gray-700 flex justify-between items-center"><h3 className="text-lg font-bold">{title}</h3><button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">&times;</button></div>
                <div className="p-6 overflow-y-auto max-h-[80vh]">{children}</div>
            </div>
        </div>
    );
};

export default Modal;