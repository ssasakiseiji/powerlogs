import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown } from './Icons';

const SearchableCustomSelect = ({ options, value, onChange, placeholder }) => {
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
            <button onClick={() => setIsOpen(!isOpen)} className="w-full bg-gray-700 text-white p-2 rounded-lg border border-gray-600 flex justify-between items-center">
                <span>{selectedOption ? selectedOption.label : placeholder}</span>
                <ChevronDown className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
                <div className="absolute top-full mt-2 w-full bg-gray-700 border border-gray-600 rounded-lg z-20 shadow-lg flex flex-col">
                    <div className="p-2 border-b border-gray-600">
                        <input
                            type="text"
                            placeholder="Buscar..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full bg-gray-800 p-2 rounded-md"
                        />
                    </div>
                    <div className="max-h-52 overflow-y-auto">
                        {filteredOptions.map(option => (
                            <div key={option.value} onClick={() => { onChange(option.value); setIsOpen(false); setSearchTerm(''); }} className="p-2 hover:bg-gray-600 cursor-pointer">{option.label}</div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SearchableCustomSelect;