import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Search } from './Icons';

const MultiSelectPopover = ({ options, selected, onChange, title }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [maxHeightStyle, setMaxHeightStyle] = useState({});
    const popoverRef = useRef(null);
    const buttonRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (popoverRef.current && !popoverRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);
    
    const handleSelect = (optionValue) => {
        if (selected.includes(optionValue)) {
            onChange(selected.filter(item => item !== optionValue));
        } else {
            onChange([...selected, optionValue]);
        }
    };

    const toggleOpen = () => {
        if (!isOpen && buttonRef.current) {
            const buttonRect = buttonRef.current.getBoundingClientRect();
            const spaceBelow = window.innerHeight - buttonRect.bottom;
            // Deja un margen de 24px para que no pegue al borde inferior
            const calculatedMaxHeight = spaceBelow - 24;
            
            // Establece la altura máxima, pero no más grande que la altura por defecto (max-h-60 / 240px)
            setMaxHeightStyle({ maxHeight: `${Math.min(calculatedMaxHeight, 240)}px` });
        }
        setIsOpen(!isOpen);
    };

    const filteredOptions = options.filter(opt => opt.label.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const displayTitle = selected.length > 0 ? `${selected.length} seleccionados` : title;

    return (
        <div className="relative" ref={popoverRef}>
            <button ref={buttonRef} onClick={toggleOpen} className="w-full bg-gray-700 text-white p-3 rounded-lg border border-gray-600 flex justify-between items-center">
                <span className="truncate">{displayTitle}</span>
                <ChevronDown className={`w-5 h-5 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
                <div className="absolute top-full mt-2 w-full bg-gray-800 border border-gray-600 rounded-lg z-20 shadow-lg flex flex-col">
                    <div className="p-2 border-b border-gray-600 relative flex-shrink-0">
                        <input
                            type="text"
                            placeholder="Buscar..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full bg-gray-700 p-2 pl-8 rounded-md border-0 focus:ring-2 focus:ring-violet-500 focus:outline-none"
                        />
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    </div>
                    <div style={maxHeightStyle} className="overflow-y-auto">
                        {filteredOptions.length > 0 ? filteredOptions.map(option => (
                            <label key={option.value} className="flex items-center p-3 hover:bg-gray-600 cursor-pointer">
                                <input type="checkbox" checked={selected.includes(option.value)} onChange={() => handleSelect(option.value)} className="form-checkbox h-5 w-5 text-violet-500 bg-gray-900 border-gray-600 rounded focus:ring-violet-600 focus:ring-offset-gray-800" />
                                <span className="ml-3 text-sm">{option.label}</span>
                            </label>
                        )) : (
                             <div className="p-3 text-sm text-gray-500">No se encontraron resultados</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default MultiSelectPopover;