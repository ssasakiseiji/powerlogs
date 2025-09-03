import React, { useState, useEffect, useRef } from 'react';
import { Filter } from './Icons';

const FilterPopover = ({ children, filterCount }) => {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef(null);
    useEffect(() => {
        const handleClickOutside = (event) => { if (ref.current && !ref.current.contains(event.target)) setIsOpen(false); };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [ref]);

    return (
        <div className="relative" ref={ref}>
            <button onClick={() => setIsOpen(!isOpen)} className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg flex items-center transition-colors">
                <Filter className="w-5 h-5 sm:mr-2" />
                {/* CORREGIDO: Texto oculto en pantallas pequeñas */}
                <span className="hidden sm:inline">Filtros</span>
                {filterCount > 0 && <span className="ml-2 bg-violet-500 text-xs w-5 h-5 flex items-center justify-center rounded-full">{filterCount}</span>}
            </button>
            {isOpen && (
                <div className="absolute top-full right-0 mt-2 w-72 bg-gray-800 border border-gray-600 rounded-lg z-20 shadow-lg p-4">
                    {children}
                </div>
            )}
        </div>
    );
};

export default FilterPopover;
