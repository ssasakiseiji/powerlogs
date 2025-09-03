import React, { useEffect, useRef } from 'react';
import { Settings, X, LayoutDashboard, SlidersHorizontal, Table, BarChart } from './Icons';

const SidePanel = ({ isOpen, onClose, onLogout, setMainView, setTableView }) => {
    const panelRef = useRef(null);

    // Efecto para cerrar el panel si se hace clic fuera de él
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (panelRef.current && !panelRef.current.contains(event.target)) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, onClose]);

    const handleNavigation = (view, tableView = null) => {
        setMainView(view);
        if (tableView) {
            setTableView(tableView);
        }
        onClose();
    };

    // Clases de transición para las animaciones
    const overlayTransition = isOpen
        ? 'opacity-100'
        : 'opacity-0 pointer-events-none';

    const panelTransition = isOpen
        ? 'translate-x-0'
        : '-translate-x-full';

    return (
        <>
            {/* Fondo oscuro semi-transparente */}
            <div
                className={`fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300 ${overlayTransition}`}
                onClick={onClose}
            ></div>

            {/* Panel lateral */}
            <div
                ref={panelRef}
                className={`fixed top-0 left-0 h-full w-64 bg-gray-800 text-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out ${panelTransition}`}
            >
                <div className="p-4 flex flex-col h-full">
                    <div className="flex justify-between items-center mb-8 flex-shrink-0">
                        <h2 className="text-xl font-bold">Menú</h2>
                        <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-700">
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    <nav className="flex flex-col space-y-2 flex-grow">
                        <h3 className="px-3 text-xs font-bold uppercase text-gray-500">Vistas</h3>
                        <button onClick={() => handleNavigation('dashboards')} className="flex items-center w-full text-left px-3 py-2 rounded-lg hover:bg-gray-700 transition-colors">
                            <LayoutDashboard className="w-5 h-5 mr-3 text-cyan-400" />
                            Dashboards
                        </button>
                        <button onClick={() => handleNavigation('data')} className="flex items-center w-full text-left px-3 py-2 rounded-lg hover:bg-gray-700 transition-colors">
                            <SlidersHorizontal className="w-5 h-5 mr-3 text-green-400" />
                            Gestión de Datos
                        </button>
                        <button onClick={() => handleNavigation('tables', 'prs_table')} className="flex items-center w-full text-left px-3 py-2 rounded-lg hover:bg-gray-700 transition-colors">
                            <Table className="w-5 h-5 mr-3 text-amber-400" />
                            Tablas
                        </button>
                        
                        <div className="border-t border-gray-700 my-4"></div>

                        <h3 className="px-3 text-xs font-bold uppercase text-gray-500">Tablas Específicas</h3>
                         <button onClick={() => handleNavigation('tables', 'prs_table')} className="flex items-center w-full text-left px-3 py-2 rounded-lg hover:bg-gray-700 transition-colors text-sm">
                            <BarChart className="w-5 h-5 mr-3" />
                            Tabla de PRs
                        </button>
                        {/* Aquí puedes añadir el botón para la segunda tabla cuando esté lista */}

                    </nav>

                    <div className="flex-shrink-0">
                         <div className="border-t border-gray-700 my-4"></div>
                        <button className="flex items-center w-full text-left px-3 py-2 rounded-lg hover:bg-gray-700 transition-colors">
                            <Settings className="w-5 h-5 mr-3" />
                            Configuración
                        </button>
                        <button
                            onClick={onLogout}
                            className="w-full text-left px-3 py-2 rounded-lg text-red-500 hover:bg-red-500 hover:text-white transition-colors"
                        >
                            Salir
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

export default SidePanel;