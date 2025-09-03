import React from 'react';

const CircularProgress = ({ percentage, color }) => {
    const safePercentage = Math.min(Math.max(percentage, 0), 100);
    const radius = 42;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (safePercentage / 100) * circumference;

    return (
        <div className="relative w-20 h-20">
            <svg className="w-full h-full" viewBox="0 0 100 100">
                <circle className="text-gray-700" strokeWidth="10" stroke="currentColor" fill="transparent" r={radius} cx="50" cy="50" />
                <circle className="transition-all duration-500" style={{stroke: color}} strokeWidth="10" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" fill="transparent" r={radius} cx="50" cy="50" transform="rotate(-90 50 50)" />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-white font-bold text-lg">{Math.round(percentage)}%</span>
        </div>
    );
};

export default CircularProgress;