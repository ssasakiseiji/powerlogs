import React from 'react';

const StatCard = ({title, value, unit, subValue, subUnit}) => (
    <div className="bg-gray-700 p-4 rounded-lg text-center flex-grow">
        <p className="text-sm text-gray-400">{title}</p>
        <p className="text-2xl font-bold text-white">{value ?? 'N/A'}<span className="text-lg text-gray-300 ml-1">{unit}</span></p>
        {subValue && <p className="text-sm text-gray-400">{subValue} {subUnit}</p>}
    </div>
);

export default StatCard;