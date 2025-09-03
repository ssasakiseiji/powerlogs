import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Search } from './Icons';

const CustomSelect = ({ options, value, onChange, placeholder }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const ref = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => { if (ref.current && !ref.current.contains(event.target)) setIsOpen(false); };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [ref]);

    const filteredOptions = options.filter(opt => opt.label.toLowerCase().includes(searchTerm.toLowerCase()));
    const selectedOption = options.find(opt => opt.value === value);

    return (
        <div className="relative" ref={ref}>
            <button onClick={() => setIsOpen(!isOpen)} className="w-full bg-gray-700 text-white p-3 rounded-lg border border-gray-600 focus:ring-2 focus:ring-violet-500 focus:outline-none flex justify-between items-center text-left">
                <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
                <ChevronDown className={`w-5 h-5 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
                <div className="absolute top-full mt-2 w-full bg-gray-800 border border-gray-600 rounded-lg z-20 shadow-lg flex flex-col">
                    <div className="p-2 border-b border-gray-600 relative">
                        <input
                            type="text"
                            placeholder="Buscar..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full bg-gray-700 p-2 pl-8 rounded-md border-0 focus:ring-2 focus:ring-violet-500 focus:outline-none"
                        />
                         <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                        {filteredOptions.length > 0 ? filteredOptions.map(option => (
                            <div key={option.value} onClick={() => { onChange(option.value); setIsOpen(false); setSearchTerm(''); }} className="p-3 hover:bg-gray-600 cursor-pointer text-sm truncate">{option.label}</div>
                        )) : (
                            <div className="p-3 text-sm text-gray-500">No se encontraron resultados</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomSelect;