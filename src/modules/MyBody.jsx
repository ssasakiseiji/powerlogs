import React, { useState, useEffect, useMemo, useContext } from 'react';
import { collection, doc, onSnapshot, query, addDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { AppContext } from '../context/AppContext';
import Modal from '../components/Modal';
import StatCard from '../components/StatCard';
import { Pencil, Plus, TrendingUp, Body, Table, Trash2, ChevronUp, ChevronDown, Calendar, X } from '../components/Icons';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// --- Helper para obtener la fecha local en formato YYYY-MM-DD ---
const getLocalDate = () => {
    const today = new Date();
    today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
    return today.toISOString().split('T')[0];
};

// --- Componente para editar una medición en un modal enfocado ---
const EditMeasurementModal = ({ isOpen, onClose, measurement, onSave }) => {
    const [editingMeasurement, setEditingMeasurement] = useState(measurement);

    useEffect(() => {
        setEditingMeasurement(measurement);
    }, [measurement]);

    const handleSave = () => {
        onSave(editingMeasurement);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Editar Medición">
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Fecha</label>
                    <input type="date" value={editingMeasurement.date} onChange={e => setEditingMeasurement({...editingMeasurement, date: e.target.value})} className="w-full bg-gray-700 p-3 rounded-lg"/>
                </div>
                <div className="flex gap-4">
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-300 mb-1">Peso (kg)</label>
                        <input type="number" value={editingMeasurement.weight} onChange={e => setEditingMeasurement({...editingMeasurement, weight: e.target.value})} className="w-full bg-gray-700 p-3 rounded-lg"/>
                    </div>
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-300 mb-1">% Grasa</label>
                        <input type="number" value={editingMeasurement.bodyFat} onChange={e => setEditingMeasurement({...editingMeasurement, bodyFat: e.target.value})} className="w-full bg-gray-700 p-3 rounded-lg"/>
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Músculo Esquelético (kg)</label>
                    <input type="number" value={editingMeasurement.skeletalMuscle} onChange={e => setEditingMeasurement({...editingMeasurement, skeletalMuscle: e.target.value})} className="w-full bg-gray-700 p-3 rounded-lg" />
                </div>
                <button onClick={handleSave} className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg">Guardar Cambios</button>
            </div>
        </Modal>
    );
};

const MeasurementsTableModal = ({ isOpen, onClose, measurements, onSave, onDelete }) => {
    const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });
    const [dateFilters, setDateFilters] = useState({ start: '', end: '' });
    const [measurementToEdit, setMeasurementToEdit] = useState(null);
    const [confirmDelete, setConfirmDelete] = useState(null);

    const filteredAndSortedMeasurements = useMemo(() => {
        let filtered = [...measurements];
        if (dateFilters.start) {
            const startDate = new Date(`${dateFilters.start}T00:00:00`);
            filtered = filtered.filter(m => new Date(m.date) >= startDate);
        }
        if (dateFilters.end) {
            const endDate = new Date(`${dateFilters.end}T23:59:59`);
            filtered = filtered.filter(m => new Date(m.date) <= endDate);
        }

        if (sortConfig.key) {
            filtered.sort((a, b) => {
                let aValue = a[sortConfig.key];
                let bValue = b[sortConfig.key];
                if (sortConfig.key === 'date') {
                    aValue = new Date(aValue).getTime();
                    bValue = new Date(bValue).getTime();
                }
                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return filtered;
    }, [measurements, sortConfig, dateFilters]);

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const handleDelete = (measurementId) => {
        onDelete(measurementId);
        setConfirmDelete(null);
    };
    
    const SortableHeader = ({ children, columnKey }) => {
        const isSorted = sortConfig.key === columnKey;
        const icon = isSorted ? (sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />) : null;
        return (
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer" onClick={() => handleSort(columnKey)}>
                <div className="flex items-center gap-2">{children} {icon}</div>
            </th>
        );
    };

    const formatDate = (dateStr) => {
        const date = new Date(`${dateStr}T00:00:00`);
        return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    return (
        <>
            <Modal isOpen={isOpen} onClose={onClose} title="Historial de Mediciones" size="2xl">
                <div className="p-4 bg-gray-900/40 rounded-t-lg border-b border-gray-700">
                    <div className="flex items-center gap-2 bg-gray-700 p-2 rounded-lg border border-gray-600">
                        <Calendar className="w-5 h-5 text-gray-400 flex-shrink-0 ml-1" />
                        <input type="date" value={dateFilters.start} onChange={e => setDateFilters({...dateFilters, start: e.target.value})} className="bg-transparent w-full text-sm outline-none text-gray-300"/>
                        <span className="text-gray-400">-</span>
                        <input type="date" value={dateFilters.end} onChange={e => setDateFilters({...dateFilters, end: e.target.value})} className="bg-transparent w-full text-sm outline-none text-gray-300"/>
                        {(dateFilters.start || dateFilters.end) && <button onClick={() => setDateFilters({start: '', end: ''})}><X className="w-4 h-4 text-gray-400 hover:text-white"/></button>}
                    </div>
                </div>
                <div className="max-h-[60vh] overflow-y-auto">
                    <table className="min-w-full divide-y divide-gray-700">
                        <thead className="bg-gray-800 sticky top-0 z-10">
                            <tr>
                                <SortableHeader columnKey="date">Fecha</SortableHeader>
                                <SortableHeader columnKey="weight">Peso (kg)</SortableHeader>
                                <SortableHeader columnKey="bodyFat">% Grasa</SortableHeader>
                                <SortableHeader columnKey="skeletalMuscle">Músculo (kg)</SortableHeader>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="bg-gray-800 divide-y divide-gray-700">
                            {filteredAndSortedMeasurements.map(m => (
                                <tr key={m.id} className="hover:bg-gray-700/50">
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">{formatDate(m.date)}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-white font-semibold">{m.weight}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-white font-semibold">{m.bodyFat}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">{m.skeletalMuscle}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium flex gap-2">
                                        <button onClick={() => setMeasurementToEdit(m)} className="p-1 text-blue-400 hover:text-blue-300"><Pencil className="w-5 h-5" /></button>
                                        <button onClick={() => setConfirmDelete(m.id)} className="p-1 text-red-500 hover:text-red-400"><Trash2 className="w-5 h-5" /></button>
                                    </td>
                                </tr>
                            ))}
                             {filteredAndSortedMeasurements.length === 0 && (
                                <tr>
                                    <td colSpan="5" className="text-center py-8 text-gray-500">
                                        No se encontraron mediciones con los filtros aplicados.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Modal>

            {measurementToEdit && (
                <EditMeasurementModal 
                    isOpen={!!measurementToEdit} 
                    onClose={() => setMeasurementToEdit(null)} 
                    measurement={measurementToEdit} 
                    onSave={onSave}
                />
            )}

            {confirmDelete && (
                <Modal isOpen={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Confirmar Eliminación">
                    <p className="text-gray-300 mb-6">¿Seguro que quieres eliminar esta medición? Esta acción no se puede deshacer.</p>
                    <div className="flex justify-end gap-4">
                        <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg font-semibold">Cancelar</button>
                        <button onClick={() => handleDelete(confirmDelete)} className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg font-semibold text-white">Confirmar</button>
                    </div>
                </Modal>
            )}
        </>
    );
};

const BodyStatsModal = ({ isOpen, onClose, measurements }) => {
    const formatDate = (dateStr) => {
        const date = new Date(`${dateStr}T00:00:00`);
        return date.toLocaleDateString();
    };

    if (measurements.length < 2) {
        return <Modal isOpen={isOpen} onClose={onClose} title="Estadísticas Corporales"><p className="text-center text-gray-400">Necesitas al menos dos mediciones para ver comparativas.</p></Modal>
    }

    const first = measurements[0];
    const latest = measurements[measurements.length - 1];

    const getChange = (oldVal, newVal, unit, positiveIsGood = true) => {
        if (oldVal === undefined || newVal === undefined || oldVal === null || newVal === null) return { value: 'N/A', percent: '', class: 'text-gray-400' };
        const change = newVal - oldVal;
        if (oldVal === 0 && change > 0) return { value: `+${newVal.toFixed(1)}${unit}`, percent: '(∞%)', class: positiveIsGood ? 'text-green-400' : 'text-red-400' };
        if (oldVal === 0) return { value: 'N/A', percent: '', class: 'text-gray-400' };
        const percent = (change / oldVal) * 100;
        const cssClass = change >= 0 ? (positiveIsGood ? 'text-green-400' : 'text-red-400') : (positiveIsGood ? 'text-red-400' : 'text-green-400');
        return { value: `${change > 0 ? '+' : ''}${change.toFixed(1)}${unit}`, percent: `(${change > 0 ? '+' : ''}${percent.toFixed(1)}%)`, class: cssClass };
    };

    const weightChange = getChange(first.weight, latest.weight, 'kg', false);
    const fatChange = getChange(first.bodyFat, latest.bodyFat, '%', false);
    const muscleChange = getChange(first.skeletalMuscle, latest.skeletalMuscle, 'kg', true);

    const StatDisplay = ({ title, changeData }) => (
        <div>
            <p className="font-semibold text-gray-300">{title}</p>
            <p className={`text-lg font-bold ${changeData.class}`}>{changeData.value} {changeData.percent}</p>
        </div>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Estadísticas de Progreso Corporal">
             <div className="space-y-4">
                 <div className="text-center">
                    <h3 className="text-xl font-bold text-emerald-400">Comparativa Global</h3>
                    <p className="text-sm text-gray-400">Última ({formatDate(latest.date)}) vs. Primera ({formatDate(first.date)})</p>
                </div>
                
                <div className="bg-gray-700 p-4 rounded-lg space-y-4 text-sm">
                    <StatDisplay title="Cambio de Peso Corporal" changeData={weightChange} />
                    <StatDisplay title="Cambio de % Grasa Corporal" changeData={fatChange} />
                    <StatDisplay title="Cambio de Masa Muscular" changeData={muscleChange} />
                </div>
            </div>
        </Modal>
    )
};

const MyBody = () => {
    const { userId, db, appId } = useContext(AppContext);
    const [allMeasurements, setAllMeasurements] = useState([]);
    const [profile, setProfile] = useState({ height: '' });
    const [isModalOpen, setModalOpen] = useState(false);
    const [isProfileModalOpen, setProfileModalOpen] = useState(false);
    const [newMeasurement, setNewMeasurement] = useState({ date: getLocalDate(), weight: '', bodyFat: '', skeletalMuscle: '' });
    const [isStatsModalOpen, setStatsModalOpen] = useState(false);
    const [isTableModalOpen, setTableModalOpen] = useState(false);

    useEffect(() => {
        if (!db || !userId) return;
        const unsubMeasurements = onSnapshot(query(collection(db, `/artifacts/${appId}/users/${userId}/bodyMeasurements`)), (snap) => {
            const measurementsData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setAllMeasurements(measurementsData);
        });
        const unsubProfile = onSnapshot(doc(db, `/artifacts/${appId}/users/${userId}/profile`, 'main'), (snap) => { if(snap.exists()) setProfile(snap.data()) });
        return () => { unsubMeasurements(); unsubProfile(); };
    }, [db, userId, appId]);

    const bestMeasurementsPerDay = useMemo(() => {
        const measurementsByDay = {};
        allMeasurements.forEach(m => {
            const dayKey = m.date;
            if (!measurementsByDay[dayKey] || m.weight > measurementsByDay[dayKey].weight) {
                measurementsByDay[dayKey] = m;
            }
        });
        return Object.values(measurementsByDay).sort((a,b) => new Date(a.date) - new Date(b.date));
    }, [allMeasurements]);

    const handleAddMeasurement = async () => {
        const { date, weight, bodyFat, skeletalMuscle } = newMeasurement;
        if (weight === '' || bodyFat === '') return;
        const w = parseFloat(weight);
        const bf = parseFloat(bodyFat);
        const fatMass = w * (bf / 100);
        const leanMass = w - fatMass;
        let smm = skeletalMuscle ? parseFloat(skeletalMuscle) : 0;
        await addDoc(collection(db, `/artifacts/${appId}/users/${userId}/bodyMeasurements`), { date, weight: w, bodyFat: bf, fatMass: parseFloat(fatMass.toFixed(2)), leanMass: parseFloat(leanMass.toFixed(2)), skeletalMuscle: parseFloat(smm.toFixed(2)) });
        setNewMeasurement({ date: getLocalDate(), weight: '', bodyFat: '', skeletalMuscle: '' });
        setModalOpen(false);
    };

    const handleUpdateMeasurement = async (measurement) => {
        const { id, date, weight, bodyFat, skeletalMuscle } = measurement;
        const w = parseFloat(weight);
        const bf = parseFloat(bodyFat);
        const fatMass = w * (bf / 100);
        const leanMass = w - fatMass;
        let smm = skeletalMuscle ? parseFloat(skeletalMuscle) : 0;
        const measurementRef = doc(db, `/artifacts/${appId}/users/${userId}/bodyMeasurements`, id);
        await updateDoc(measurementRef, { date, weight: w, bodyFat: bf, skeletalMuscle: smm, fatMass, leanMass });
    };
    
    const handleDeleteMeasurement = async (measurementId) => {
        await deleteDoc(doc(db, `/artifacts/${appId}/users/${userId}/bodyMeasurements`, measurementId));
    };

    const handleUpdateProfile = async () => {
        const heightToSave = profile.height ? parseFloat(profile.height) : '';
        await setDoc(doc(db, `/artifacts/${appId}/users/${userId}/profile`, 'main'), { height: heightToSave }, { merge: true });
        setProfileModalOpen(false);
    };
    
    const chartData = useMemo(() => {
        return bestMeasurementsPerDay.map(m => {
            const date = new Date(`${m.date}T00:00:00`);
            return {...m, date: date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' }) };
        });
    }, [bestMeasurementsPerDay]);
    
    const latest = useMemo(() => {
        const sorted = [...bestMeasurementsPerDay].sort((a,b) => new Date(b.date) - new Date(a.date));
        return sorted[0];
    }, [bestMeasurementsPerDay]);

    const heightInMeters = profile.height ? parseFloat(profile.height) / 100 : 0;
    const bmi = latest && heightInMeters ? (latest.weight / (heightInMeters * heightInMeters)).toFixed(1) : null;
    const yAxisFormatter = (value) => Math.round(value);

    const renderChart = (title, dataKey, color, unit = '') => (
        <div className="bg-gray-800 p-5 rounded-xl">
            <h3 className="font-bold text-lg mb-4" style={{color}}>{title}</h3>
            <div className="h-64">
                <ResponsiveContainer>
                    <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#4a5568" />
                        <XAxis dataKey="date" stroke="#a0aec0" fontSize={12} />
                        <YAxis stroke="#a0aec0" domain={['dataMin-2', 'dataMax+2']} unit={unit} fontSize={12} tickFormatter={yAxisFormatter} />
                        <Tooltip contentStyle={{ backgroundColor: '#2d3748' }} />
                        <Line type="monotone" dataKey={dataKey} stroke={color} name={title} unit={unit} />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );

    return (
        <div className="p-4 md:p-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
                <h2 className="text-2xl font-bold text-white">Mi Cuerpo</h2>
                <div className="flex gap-2 w-full sm:w-auto">
                    <button onClick={() => setStatsModalOpen(true)} className="flex-1 sm:flex-none bg-teal-500 hover:bg-teal-600 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center"><TrendingUp className="w-5 h-5 sm:mr-2" /> <span className="hidden sm:inline">Estadísticas</span></button>
                    <button onClick={() => setTableModalOpen(true)} className="flex-1 sm:flex-none bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center"><Table className="w-5 h-5 sm:mr-2" /> <span className="hidden sm:inline">Tabla</span></button>
                    <button onClick={() => setProfileModalOpen(true)} className="p-2 sm:px-4 sm:py-2 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-lg flex items-center justify-center"><Pencil className="w-5 h-5 sm:mr-2" /> <span className="hidden sm:inline">Perfil</span></button>
                    <button onClick={() => setModalOpen(true)} className="flex-1 sm:flex-none bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center"><Plus className="w-5 h-5 sm:mr-2" /> <span className="hidden sm:inline">Medición</span></button>
                </div>
            </div>
           
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <StatCard title="Peso Corporal" value={latest?.weight} unit="kg" subValue={bmi} subUnit="IMC"/>
                <div className="bg-gray-700 p-4 rounded-lg text-center">
                    <p className="text-sm text-gray-400">% Grasa / Masa Grasa</p>
                    <p className="text-2xl font-bold text-white">{latest?.bodyFat ?? 'N/A'}<span className="text-lg text-gray-300 ml-1">%</span></p>
                    <p className="text-sm text-gray-400">{latest?.fatMass ?? 'N/A'} kg</p>
                </div>
                <StatCard title="Masa Muscular" value={latest?.skeletalMuscle} unit="kg" />
                <StatCard title="Altura" value={profile.height} unit="cm" />
            </div>

            {allMeasurements.length === 0 ? (
                <div className="text-center py-10 px-4 bg-gray-800 rounded-lg">
                    <Body className="mx-auto h-12 w-12 text-gray-500" />
                    <h3 className="mt-2 text-lg font-medium text-white">Sin mediciones</h3>
                    <p className="mt-1 text-sm text-gray-400">Añade tu primera medición para ver tu progreso.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {renderChart('Peso Corporal', 'weight', '#10b981', 'kg')}
                    {renderChart('% Grasa Corporal', 'bodyFat', '#34d399', '%')}
                    {renderChart('Masa Muscular Esquelética', 'skeletalMuscle', '#6ee7b7', 'kg')}
                    <div className="bg-gray-800 p-5 rounded-xl">
                        <h3 className="font-bold text-lg text-emerald-400 mb-4">Masa Magra vs. Grasa (kg)</h3>
                        <div className="h-64"><ResponsiveContainer><LineChart data={chartData}><CartesianGrid strokeDasharray="3 3" stroke="#4a5568" /><XAxis dataKey="date" stroke="#a0aec0" /><YAxis stroke="#a0aec0" domain={['dataMin-2', 'dataMax+2']} tickFormatter={yAxisFormatter} /><Tooltip contentStyle={{ backgroundColor: '#2d3748' }} /><Legend /><Line type="monotone" dataKey="leanMass" name="Masa Magra" stroke="#a7f3d0" unit="kg" /><Line type="monotone" dataKey="fatMass" name="Masa Grasa" stroke="#ef4444" unit="kg" /></LineChart></ResponsiveContainer></div>
                    </div>
                </div>
            )}
            <Modal isOpen={isModalOpen} onClose={() => setModalOpen(false)} title="Añadir Medición Corporal">
                <div className="space-y-4">
                    <input type="date" value={newMeasurement.date} onChange={e=>setNewMeasurement({...newMeasurement, date: e.target.value})} className="w-full bg-gray-700 p-3 rounded-lg" />
                    <input type="number" value={newMeasurement.weight} onChange={e=>setNewMeasurement({...newMeasurement, weight: e.target.value})} placeholder="Peso (kg)" className="w-full bg-gray-700 p-3 rounded-lg" />
                    <input type="number" value={newMeasurement.bodyFat} onChange={e=>setNewMeasurement({...newMeasurement, bodyFat: e.target.value})} placeholder="% Grasa Corporal" className="w-full bg-gray-700 p-3 rounded-lg" />
                    <input type="number" value={newMeasurement.skeletalMuscle} onChange={e=>setNewMeasurement({...newMeasurement, skeletalMuscle: e.target.value})} placeholder="Músculo Esquelético (kg) (Opcional)" className="w-full bg-gray-700 p-3 rounded-lg" />
                    <button onClick={handleAddMeasurement} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2 px-4 rounded-lg">Guardar Medición</button>
                </div>
            </Modal>
            <Modal isOpen={isProfileModalOpen} onClose={() => setProfileModalOpen(false)} title="Editar Perfil">
                <div className="space-y-4">
                    <label className="block text-sm font-medium text-gray-300">Altura (cm)</label>
                    <input type="number" value={profile.height || ''} onChange={e=>setProfile({...profile, height: e.target.value})} placeholder="Tu altura en cm" className="w-full bg-gray-700 p-3 rounded-lg" />
                    <button onClick={handleUpdateProfile} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2 px-4 rounded-lg">Guardar Perfil</button>
                </div>
            </Modal>
            
            {isStatsModalOpen && <BodyStatsModal isOpen={isStatsModalOpen} onClose={() => setStatsModalOpen(false)} measurements={bestMeasurementsPerDay} />}
            {isTableModalOpen && <MeasurementsTableModal isOpen={isTableModalOpen} onClose={() => setTableModalOpen(false)} measurements={allMeasurements} onSave={handleUpdateMeasurement} onDelete={handleDeleteMeasurement} />}
        </div>
    );
};

export default MyBody;