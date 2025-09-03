import React, { useState, useEffect, useMemo, useContext } from 'react';
import { collection, doc, onSnapshot, query, addDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { AppContext } from '../context/AppContext';
import Modal from '../components/Modal';
import SearchableCustomSelect from '../components/SearchableCustomSelect';
import FilterPopover from '../components/FilterPopover';
import MultiSelectPopover from '../components/MultiSelectPopover';
import CustomSelect from '../components/CustomSelect';
import CircularProgress from '../components/CircularProgress';
import { Plus, BarChart, X, Star, TrendingUp, Table, Pencil, Trash2, ChevronUp, ChevronDown, Filter, Calendar } from '../components/Icons';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';

// --- Helper para obtener la fecha local en formato YYYY-MM-DD ---
const getLocalDate = () => {
    const today = new Date();
    today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
    return today.toISOString().split('T')[0];
};

// --- Componente de Tooltip Personalizado para Gráficos ---
const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="bg-gray-700 p-3 rounded-lg border border-gray-600 shadow-xl">
                <p className="text-sm font-bold text-white">{`Fecha: ${label}`}</p>
                <p className="text-sm" style={{ color: payload[0].color }}>{`${payload[0].name}: ${payload[0].value.toFixed(2)}`}</p>
                <p className="text-xs text-gray-400">{`Detalle: ${data.weight}kg x ${data.reps} reps`}</p>
                {data.note && <p className="text-xs text-cyan-300 italic mt-1">Nota: "{data.note}"</p>}
            </div>
        );
    }
    return null;
};

// --- Componente Principal ---
const PRTracker = () => {
    const { exercises, muscleGroups, subcategories, userId, db, appId } = useContext(AppContext);
    const [prs, setPrs] = useState([]);
    const [isPrModalOpen, setPrModalOpen] = useState(false);
    const [newPr, setNewPr] = useState({ exerciseId: '', weight: '', reps: '', date: getLocalDate(), note: '' });
    const [chartMetric, setChartMetric] = useState({});
    const [muscleFilters, setMuscleFilters] = useState([]);
    const [subcategoryFilters, setSubcategoryFilters] = useState([]);
    const [dateFilters, setDateFilters] = useState({ start: '', end: '' });
    const [sortOrder, setSortOrder] = useState('recent');
    const [favoritePrs, setFavoritePrs] = useState([]);
    const [statsModalData, setStatsModalData] = useState(null);
    const [tableModalId, setTableModalId] = useState(null);

    useEffect(() => {
        if (!db || !userId) return;
        const unsubPrs = onSnapshot(query(collection(db, `/artifacts/${appId}/users/${userId}/personalRecords`)), (snap) => setPrs(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
        const unsubFavorites = onSnapshot(doc(db, `/artifacts/${appId}/users/${userId}/appState`, 'prFavorites'), (snap) => {
            if (snap.exists()) setFavoritePrs(snap.data().exerciseIds || []);
        });
        return () => { unsubPrs(); unsubFavorites(); };
    }, [db, userId, appId]);

    const handleAddPr = async () => {
        if (newPr.exerciseId === '' || newPr.weight === '' || newPr.reps === '') return;
        const weight = parseFloat(newPr.weight);
        const reps = parseInt(newPr.reps);
        const e1rm = reps === 1 ? weight : weight * (1 + reps / 30);
        await addDoc(collection(db, `/artifacts/${appId}/users/${userId}/personalRecords`), {
            ...newPr, weight, reps,
            e1rm: parseFloat(e1rm.toFixed(2)),
            volume: parseFloat((weight * reps).toFixed(2)),
            note: newPr.note || ""
        });
        setNewPr({ exerciseId: '', weight: '', reps: '', date: getLocalDate(), note: '' });
        setPrModalOpen(false);
    };

    const toggleFavorite = async (exerciseId) => {
        let updatedFavorites;
        if (favoritePrs.includes(exerciseId)) {
            updatedFavorites = favoritePrs.filter(id => id !== exerciseId);
        } else {
            if (favoritePrs.length >= 5) {
                alert("Puedes tener un máximo de 5 ejercicios favoritos.");
                return;
            }
            updatedFavorites = [...favoritePrs, exerciseId];
        }
        await setDoc(doc(db, `/artifacts/${appId}/users/${userId}/appState`, 'prFavorites'), { exerciseIds: updatedFavorites });
    };

    const processedData = useMemo(() => {
        let filteredExercises = exercises;

        if (muscleFilters.length > 0) {
            filteredExercises = filteredExercises.filter(ex => muscleFilters.includes(ex.muscleGroupId));
        }
        if (subcategoryFilters.length > 0) {
            filteredExercises = filteredExercises.filter(ex => ex.subcategoryIds && ex.subcategoryIds.some(subId => subcategoryFilters.includes(subId)));
        }

        const dataWithRecords = filteredExercises.map(exercise => {
            let allRecordsForExercise = prs.filter(pr => pr.exerciseId === exercise.id);
            
            if (dateFilters.start) {
                const startDate = new Date(`${dateFilters.start}T00:00:00`);
                allRecordsForExercise = allRecordsForExercise.filter(pr => new Date(pr.date) >= startDate);
            }
            if (dateFilters.end) {
                const endDate = new Date(`${dateFilters.end}T23:59:59`);
                allRecordsForExercise = allRecordsForExercise.filter(pr => new Date(pr.date) <= endDate);
            }

            if (allRecordsForExercise.length === 0) return null;
            
            allRecordsForExercise.sort((a, b) => new Date(b.date) - new Date(a.date));

            const latestRecord = allRecordsForExercise[0];
            const maxE1rmRecord = allRecordsForExercise.reduce((max, current) => (current.e1rm > max.e1rm ? current : max), allRecordsForExercise[0]);
            
            let goalProgress = 0;
            if (exercise.goal > 0 && latestRecord) {
                const goalE1rm = (exercise.goalReps || 1) === 1 ? exercise.goal : exercise.goal * (1 + (exercise.goalReps || 1) / 30);
                goalProgress = Math.min(Math.round((maxE1rmRecord.e1rm / goalE1rm) * 100), 100);
            }

            return { ...exercise, allRecords: allRecordsForExercise, latestRecord, maxE1rmRecord, goalProgress };
        }).filter(Boolean);
        
        switch(sortOrder) {
            case 'name_asc': return dataWithRecords.sort((a,b) => a.name.localeCompare(b.name));
            case 'name_desc': return dataWithRecords.sort((a,b) => b.name.localeCompare(a.name));
            case 'goal_desc': return dataWithRecords.sort((a,b) => (b.goal || 0) - (a.goal || 0));
            case 'recent': default: return dataWithRecords.sort((a,b) => new Date(b.latestRecord?.date || 0) - new Date(a.latestRecord?.date || 0));
        }
    }, [exercises, prs, muscleFilters, subcategoryFilters, dateFilters, sortOrder, muscleGroups]);
    
    const favoriteData = useMemo(() => processedData.filter(d => favoritePrs.includes(d.id)), [favoritePrs, processedData]);
    const nonFavoriteData = useMemo(() => processedData.filter(d => !favoritePrs.includes(d.id)), [favoritePrs, processedData]);
    
    const chartViewConfig = { e1rm: { name: 'e1RM', unit: 'kg' }, weight: { name: 'Peso', unit: 'kg' }, volume: { name: 'Volumen', unit: '' } };
    const chartViewOrder = ['e1rm', 'weight', 'volume'];

    const renderPrCard = (exercise) => {
        const currentChartMetric = chartMetric[exercise.id] || 'e1rm';
        const muscleColor = muscleGroups.find(mg => mg.id === exercise.muscleGroupId)?.color || '#8b5cf6';
        const isFavorited = favoritePrs.includes(exercise.id);

        const prsByDay = {};
        exercise.allRecords.forEach(pr => {
            const dayKey = pr.date;
            if (!prsByDay[dayKey] || pr[currentChartMetric] > prsByDay[dayKey][currentChartMetric]) {
                prsByDay[dayKey] = pr;
            }
        });
        const bestRecordsPerDay = Object.values(prsByDay);
        
        const formatDate = (dateStr) => {
            const date = new Date(`${dateStr}T00:00:00`);
            return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
        };
        
        const chartRecords = bestRecordsPerDay.map(r => ({...r, date: formatDate(r.date)})).sort((a,b) => new Date(a.date.split('/').reverse().join('-')) - new Date(b.date.split('/').reverse().join('-')));
        const dataMax = Math.max(...chartRecords.map(r => r[currentChartMetric]), 0);
        
        const goalE1rm = (exercise.goalReps || 1) === 1 ? exercise.goal : exercise.goal * (1 + (exercise.goalReps || 1) / 30);

        const yDomain = [ 'dataMin - 5', exercise.goal > 0 && currentChartMetric === 'weight' ? Math.max(dataMax, exercise.goal) + 10 : (exercise.goal > 0 && currentChartMetric === 'e1rm' ? Math.max(dataMax, goalE1rm) + 10 : dataMax + 10) ];

        return (
            <div key={exercise.id} className="bg-gray-800 rounded-xl shadow-lg p-5 flex flex-col">
                <div className="flex flex-wrap justify-between items-start gap-4">
                    <div className="flex-grow min-w-[200px]">
                        <h3 className="text-xl font-bold" style={{color: muscleColor}}>{exercise.name}</h3>
                        {exercise.goal > 0 && <p className="text-xs font-bold text-amber-400 mt-1">Meta: {exercise.goal}kg x {exercise.goalReps || 1}</p>}
                        <div className="text-xs text-gray-400 space-y-1 mt-2">
                            {exercise.latestRecord && <p>Último PR: <span className="font-bold text-white">{exercise.latestRecord.weight}kg x {exercise.latestRecord.reps}</span> ({formatDate(exercise.latestRecord.date)})</p>}
                            {exercise.maxE1rmRecord && <p>Max e1RM: <span className="font-bold text-white">{exercise.maxE1rmRecord.e1rm.toFixed(2)}kg</span> ({formatDate(exercise.maxE1rmRecord.date)})</p>}
                        </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                        {exercise.goal > 0 && <CircularProgress percentage={exercise.goalProgress} color={muscleColor} />}
                        <div className="flex items-center">
                            <button onClick={() => setStatsModalData({type: 'pr', data: exercise, name: exercise.name})} className="p-2 text-gray-400 hover:text-white"><TrendingUp className="w-5 h-5"/></button>
                            <button onClick={() => setTableModalId(exercise.id)} className="p-2 text-gray-400 hover:text-white"><Table className="w-5 h-5"/></button>
                            <button onClick={() => toggleFavorite(exercise.id)} className={`p-2 transition-colors ${isFavorited ? 'text-yellow-400 hover:text-yellow-300' : 'text-gray-400 hover:text-white'}`}><Star fill={isFavorited ? 'currentColor' : 'none'} className="w-5 h-5"/></button>
                        </div>
                    </div>
                </div>
                
                <div className="mt-4 flex-grow flex flex-col">
                    <div className="flex justify-center gap-2 mb-2 flex-wrap">
                        {chartViewOrder.map(view => (<button key={view} onClick={() => setChartMetric(prev => ({...prev, [exercise.id]: view}))} className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors ${currentChartMetric === view ? 'bg-violet-500 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>{chartViewConfig[view].name}</button>))}
                    </div>
                    {chartRecords.length > 1 ? (
                        <div className="h-64 w-full">
                            <ResponsiveContainer>
                                <LineChart data={chartRecords} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#4a5568" />
                                    <XAxis dataKey="date" stroke="#a0aec0" fontSize={12} />
                                    <YAxis stroke="#a0aec0" fontSize={12} domain={yDomain} tickFormatter={(tick) => Math.round(tick)} />
                                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: muscleColor, strokeWidth: 1, strokeDasharray: "3 3" }}/>
                                    <Legend />
                                    <Line type="monotone" dataKey={currentChartMetric} name={`${chartViewConfig[currentChartMetric].name} (${chartViewConfig[currentChartMetric].unit})`} stroke={muscleColor} strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 8 }} />
                                    {exercise.goal > 0 && currentChartMetric === 'weight' && <ReferenceLine y={exercise.goal} label={{ value: `Meta: ${exercise.goal}kg`, fill: '#f59e0b', position: 'insideTopRight' }} stroke="#f59e0b" strokeDasharray="3 3" />}
                                    {exercise.goal > 0 && currentChartMetric === 'e1rm' && <ReferenceLine y={goalE1rm} label={{ value: `Meta: ${goalE1rm.toFixed(2)}kg`, fill: '#f59e0b', position: 'insideTopRight' }} stroke="#f59e0b" strokeDasharray="3 3" />}
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="h-64 w-full flex items-center justify-center text-gray-500 text-sm">
                            <p>No hay suficientes datos para mostrar un gráfico.</p>
                        </div>
                    )}
                </div>
            </div>
        )
    };
    
    const tableData = useMemo(() => {
        if (!tableModalId) return null;
        return processedData.find(ex => ex.id === tableModalId);
    }, [tableModalId, processedData]);

    const activeFilterCount = muscleFilters.length + subcategoryFilters.length + (dateFilters.start ? 1 : 0) + (dateFilters.end ? 1 : 0) + (sortOrder !== 'recent' ? 1 : 0);
    
    const clearAllFilters = () => {
        setMuscleFilters([]);
        setSubcategoryFilters([]);
        setDateFilters({ start: '', end: '' });
        setSortOrder('recent');
    };

    return (
        <div className="p-4 md:p-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
                <h2 className="text-2xl font-bold text-white">Mis Récords (PRs)</h2>
                <div className="flex gap-2 items-center self-end sm:self-center">
                    <FilterPopover filterCount={activeFilterCount}>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Músculos</label>
                                <MultiSelectPopover options={muscleGroups.map(g => ({value: g.id, label: g.name}))} selected={muscleFilters} onChange={setMuscleFilters} title="Seleccionar..."/>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Subcategorías</label>
                                <MultiSelectPopover options={subcategories.map(s => ({value: s.id, label: s.name}))} selected={subcategoryFilters} onChange={setSubcategoryFilters} title="Seleccionar..."/>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Rango de Fechas</label>
                                <div className="flex flex-col gap-2">
                                    <input type="date" value={dateFilters.start} onChange={e => setDateFilters({...dateFilters, start: e.target.value})} className="bg-gray-700 p-2 rounded-md text-sm w-full border border-gray-600"/>
                                    <input type="date" value={dateFilters.end} onChange={e => setDateFilters({...dateFilters, end: e.target.value})} className="bg-gray-700 p-2 rounded-md text-sm w-full border border-gray-600"/>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Ordenar por</label>
                                <CustomSelect options={[{value: 'recent', label: 'Más Reciente'}, {value: 'name_asc', label: 'Nombre (A-Z)'}, {value: 'name_desc', label: 'Nombre (Z-A)'}, {value: 'goal_desc', label: 'Meta más alta'}]} value={sortOrder} onChange={setSortOrder} placeholder="Ordenar..."/>
                            </div>
                            {activeFilterCount > 0 && (
                                <button onClick={clearAllFilters} className="w-full text-center text-sm text-cyan-400 hover:text-cyan-300 pt-2 border-t border-gray-700">
                                    Limpiar Filtros
                                </button>
                            )}
                        </div>
                    </FilterPopover>
                    <button onClick={() => setPrModalOpen(true)} className="bg-violet-500 hover:bg-violet-600 text-white font-bold py-2 px-4 rounded-lg flex items-center transition-colors">
                        <Plus className="w-5 h-5 sm:mr-2" />
                        <span className="hidden sm:inline">Registrar PR</span>
                    </button>
                </div>
            </div>

            {activeFilterCount > 0 && 
                <div className="flex flex-wrap gap-2 mb-6 items-center">
                    <span className="text-sm text-gray-400">Filtros activos:</span>
                    {muscleFilters.map(f => <span key={f} className="bg-gray-600 text-white px-2 py-1 rounded-full text-xs flex items-center">{muscleGroups.find(mg=>mg.id === f)?.name} <button onClick={() => setMuscleFilters(muscleFilters.filter(i => i !== f))} className="ml-1 text-gray-400 hover:text-white"><X className="w-3 h-3"/></button></span>)}
                    {subcategoryFilters.map(f => <span key={f} className="bg-gray-600 text-white px-2 py-1 rounded-full text-xs flex items-center">{subcategories.find(s=>s.id === f)?.name} <button onClick={() => setSubcategoryFilters(subcategoryFilters.filter(i => i !== f))} className="ml-1 text-gray-400 hover:text-white"><X className="w-3 h-3"/></button></span>)}
                    {(dateFilters.start || dateFilters.end) && <span className="bg-gray-600 text-white px-2 py-1 rounded-full text-xs">{`${dateFilters.start || '*' } - ${dateFilters.end || '*'}`}</span>}
                    <button onClick={clearAllFilters} className="text-xs text-cyan-400 hover:text-cyan-300">Limpiar todo</button>
                </div>
            }

            {favoriteData.length > 0 && (
                <div className="mb-8">
                    <h3 className="text-lg font-bold text-yellow-400 mb-4 flex items-center"><Star className="w-5 h-5 mr-2" />Favoritos</h3>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {favoriteData.map(exercise => renderPrCard(exercise))}
                    </div>
                </div>
            )}
            
            {nonFavoriteData.length > 0 && favoriteData.length > 0 && <hr className="border-gray-700 my-8" />}

            {processedData.length === 0 && (<div className="text-center py-10 px-4 bg-gray-800 rounded-lg"><BarChart className="mx-auto h-12 w-12 text-gray-500" /><h3 className="mt-2 text-lg font-medium text-white">Sin récords que mostrar</h3><p className="mt-1 text-sm text-gray-400">Ajusta los filtros o añade nuevos ejercicios y récords.</p></div>)}
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {nonFavoriteData.map((exercise) => renderPrCard(exercise))}
            </div>

            <Modal isOpen={isPrModalOpen} onClose={() => setPrModalOpen(false)} title="Registrar Nuevo PR">
                <div className="space-y-4 min-h-[300px]">
                    <SearchableCustomSelect options={exercises.map(ex => ({value: ex.id, label: ex.name}))} value={newPr.exerciseId} onChange={val => setNewPr({...newPr, exerciseId: val})} placeholder="Busca un ejercicio..." />
                    <div className="flex gap-4">
                        <input type="number" value={newPr.weight} onChange={(e) => setNewPr({ ...newPr, weight: e.target.value })} placeholder="Peso (kg)" className="w-full bg-gray-700 text-white p-3 rounded-lg border border-gray-600" />
                        <input type="number" value={newPr.reps} onChange={(e) => setNewPr({ ...newPr, reps: e.target.value })} placeholder="Repeticiones" className="w-full bg-gray-700 text-white p-3 rounded-lg border border-gray-600" />
                    </div>
                    <input type="date" value={newPr.date} onChange={(e) => setNewPr({ ...newPr, date: e.target.value })} className="w-full bg-gray-700 text-white p-3 rounded-lg border border-gray-600" />
                    <textarea value={newPr.note} onChange={e => setNewPr({ ...newPr, note: e.target.value })} placeholder="Nota (opcional)" className="w-full bg-gray-700 text-white p-3 rounded-lg border border-gray-600 h-24" />
                    <button onClick={handleAddPr} className="w-full bg-violet-500 hover:bg-violet-600 text-white font-bold py-2 px-4 rounded-lg transition-colors">Guardar Récord</button>
                </div>
            </Modal>
            {statsModalData && <StatisticsModal isOpen={!!statsModalData} onClose={() => setStatsModalData(null)} modalData={statsModalData} />}
            {tableData && <RecordsTableModal isOpen={!!tableData} onClose={() => setTableModalId(null)} exerciseData={tableData} />}
        </div>
    );
};

// --- Sub-componentes de PRTracker (Sin cambios) ---

const StatisticsModal = ({ isOpen, onClose, modalData }) => {
    const { data, name } = modalData;
    const [prMetric, setPrMetric] = useState('e1rm');
    
    const formatDate = (dateObj) => {
        if (dateObj instanceof Date && !isNaN(dateObj)) {
            return dateObj.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
        }
        const d = new Date(dateObj);
        if (d instanceof Date && !isNaN(d)) {
            return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
        }
        return "Fecha inválida";
    };

    const prMetricConfig = { 
        e1rm: { name: 'e1RM', unit: 'kg' },
        weight: { name: 'Peso', unit: 'kg' }, 
        volume: { name: 'Volumen', unit: '' } 
    };

    const renderPrStats = () => {
        const records = data.allRecords.map(r => ({...r, date: new Date(r.date)})).sort((a,b) => a.date - b.date);
        if (records.length < 1) return <p>No hay récords para mostrar estadísticas.</p>;
        
        const first = records[0];
        const latest = records[records.length - 1];
        const previous = records.length > 1 ? records[records.length - 2] : null;
        const maxRecord = records.reduce((max, current) => (current[prMetric] > max[prMetric] ? current : max), first);

        const getChange = (oldVal, newVal, unit) => {
            if (oldVal === undefined || newVal === undefined) return { value: 'N/A', percent: '', class: 'text-gray-400' };
            const change = newVal - oldVal;
            if (oldVal === 0 && change > 0) return { value: `+${newVal.toFixed(1)}${unit}`, percent: '(∞%)', class: 'text-green-400' };
            if (oldVal === 0) return { value: 'N/A', percent: '', class: 'text-gray-400' };
            const percent = (change / oldVal) * 100;
            const cssClass = change >= 0 ? 'text-green-400' : 'text-red-400';
            return { value: `${change > 0 ? '+' : ''}${change.toFixed(1)}${unit}`, percent: `(${change > 0 ? '+' : ''}${percent.toFixed(1)}%)`, class: cssClass };
        };

        const metricKey = prMetric;
        const { unit } = prMetricConfig[metricKey];
        const latestVsFirst = getChange(first[metricKey], latest[metricKey], unit);
        const maxVsFirst = getChange(first[metricKey], maxRecord[metricKey], unit);
        const latestVsPrevious = previous ? getChange(previous[metricKey], latest[metricKey], unit) : null;
        
        const StatDisplay = ({ title, subtitle, changeData }) => (
            <div>
                <p className="font-semibold text-gray-300">{title}</p>
                <p className="text-xs text-gray-500 mb-1">{subtitle}</p>
                <p className={`text-lg font-bold ${changeData.class}`}>{changeData.value} {changeData.percent}</p>
            </div>
        );

        return (
            <div className="space-y-4">
                 <div className="text-center">
                    <h3 className="text-xl font-bold text-violet-400">{name}</h3>
                    <p className="text-sm text-gray-400">Estadísticas de Progreso</p>
                </div>
                <div className="flex justify-center gap-2 mb-4">
                    {Object.keys(prMetricConfig).map(key => (
                        <button key={key} onClick={() => setPrMetric(key)} className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors ${prMetric === key ? 'bg-violet-500 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>{prMetricConfig[key].name}</button>
                    ))}
                </div>
                <div className="bg-gray-700 p-4 rounded-lg space-y-4 text-sm">
                    <StatDisplay 
                        title="Último vs. Primero"
                        subtitle={`${formatDate(latest.date)} vs. ${formatDate(first.date)}`}
                        changeData={latestVsFirst}
                    />
                     <StatDisplay 
                        title="Máximo vs. Primero"
                        subtitle={`${formatDate(maxRecord.date)} vs. ${formatDate(first.date)}`}
                        changeData={maxVsFirst}
                    />
                    {latestVsPrevious && (
                         <StatDisplay 
                            title="Último vs. Anterior"
                            subtitle={`${formatDate(latest.date)} vs. ${formatDate(previous.date)}`}
                            changeData={latestVsPrevious}
                        />
                    )}
                </div>
            </div>
        );
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Estadísticas de PR">
            {renderPrStats()}
        </Modal>
    )
}

const EditRecordModal = ({ isOpen, onClose, record, onSave, exerciseName }) => {
    const [editingRecord, setEditingRecord] = useState(record);

    useEffect(() => {
        setEditingRecord(record);
    }, [record]);

    const handleSave = () => {
        onSave(editingRecord);
        onClose();
    };
    
    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Editar Récord`}>
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Ejercicio</label>
                    <input type="text" value={exerciseName} readOnly className="w-full bg-gray-600 p-3 rounded-lg border border-gray-500 text-gray-300 cursor-not-allowed"/>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Fecha</label>
                    <input type="date" value={editingRecord.date} onChange={e => setEditingRecord({...editingRecord, date: e.target.value})} className="w-full bg-gray-700 p-3 rounded-lg"/>
                </div>
                <div className="flex gap-4">
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-300 mb-1">Peso (kg)</label>
                        <input type="number" value={editingRecord.weight} onChange={e => setEditingRecord({...editingRecord, weight: e.target.value})} className="w-full bg-gray-700 p-3 rounded-lg"/>
                    </div>
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-300 mb-1">Reps</label>
                        <input type="number" value={editingRecord.reps} onChange={e => setEditingRecord({...editingRecord, reps: e.target.value})} className="w-full bg-gray-700 p-3 rounded-lg"/>
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Nota (Opcional)</label>
                    <textarea value={editingRecord.note || ''} onChange={e => setEditingRecord({...editingRecord, note: e.target.value})} className="w-full bg-gray-700 p-3 rounded-lg h-20"/>
                </div>
                <button onClick={handleSave} className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg">Guardar Cambios</button>
            </div>
        </Modal>
    );
};

const RecordsTableModal = ({ isOpen, onClose, exerciseData }) => {
    const { userId, db, appId } = useContext(AppContext);
    const [localRecords, setLocalRecords] = useState(exerciseData.allRecords);
    const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });
    const [recordToEdit, setRecordToEdit] = useState(null);
    const [confirmDelete, setConfirmDelete] = useState(null);
    const [filters, setFilters] = useState({ startDate: '', endDate: '', minWeight: '' });

    useEffect(() => {
        setLocalRecords(exerciseData.allRecords);
    }, [exerciseData.allRecords]);

    const filteredAndSortedRecords = useMemo(() => {
        let records = [...localRecords];

        if (filters.startDate) {
            const startDate = new Date(`${filters.startDate}T00:00:00`);
            records = records.filter(r => new Date(r.date) >= startDate);
        }
        if (filters.endDate) {
            const endDate = new Date(`${filters.endDate}T23:59:59`);
            records = records.filter(r => new Date(r.date) <= endDate);
        }
        if (filters.minWeight) {
            const minWeight = parseFloat(filters.minWeight);
            if (!isNaN(minWeight)) {
                records = records.filter(r => r.weight >= minWeight);
            }
        }

        if (sortConfig.key) {
            records.sort((a, b) => {
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
        return records;
    }, [localRecords, sortConfig, filters]);
    
    const activeFilterCount = Object.values(filters).filter(Boolean).length;

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const handleUpdateRecord = async (updatedRecord) => {
        const { id, weight, reps } = updatedRecord;
        const weightNum = parseFloat(weight);
        const repsNum = parseInt(reps);
        const e1rm = repsNum === 1 ? weightNum : weightNum * (1 + repsNum / 30);
        const volume = weightNum * repsNum;
        
        const recordRef = doc(db, `/artifacts/${appId}/users/${userId}/personalRecords`, id);
        const dataToUpdate = { ...updatedRecord, weight: weightNum, reps: repsNum, e1rm: parseFloat(e1rm.toFixed(2)), volume: parseFloat(volume.toFixed(2)) };
        
        await updateDoc(recordRef, dataToUpdate);
        
        setLocalRecords(localRecords.map(r => r.id === id ? dataToUpdate : r));
        setRecordToEdit(null);
    };

    const handleDeleteRecord = async (recordId) => {
        await deleteDoc(doc(db, `/artifacts/${appId}/users/${userId}/personalRecords`, recordId));
        setLocalRecords(localRecords.filter(r => r.id !== recordId));
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
            <Modal isOpen={isOpen} onClose={onClose} title={`Historial de ${exerciseData.name}`} size="2xl">
                <div className="p-4 bg-gray-900/40 rounded-t-lg border-b border-gray-700">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">Desde</label>
                            <input type="date" value={filters.startDate} onChange={e => setFilters({...filters, startDate: e.target.value})} className="w-full bg-gray-700 p-2 rounded-md text-sm border border-gray-600"/>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">Hasta</label>
                            <input type="date" value={filters.endDate} onChange={e => setFilters({...filters, endDate: e.target.value})} className="w-full bg-gray-700 p-2 rounded-md text-sm border border-gray-600"/>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">Peso Mínimo (kg)</label>
                            <input type="number" placeholder="Ej: 80" value={filters.minWeight} onChange={e => setFilters({...filters, minWeight: e.target.value})} className="w-full bg-gray-700 p-2 rounded-md text-sm border border-gray-600"/>
                        </div>
                    </div>
                    {activeFilterCount > 0 && (
                         <button onClick={() => setFilters({ startDate: '', endDate: '', minWeight: '' })} className="text-xs text-cyan-400 hover:text-cyan-300 mt-3 w-full text-center">
                            Limpiar {activeFilterCount} filtro(s)
                        </button>
                    )}
                </div>
                <div className="max-h-[55vh] overflow-y-auto">
                    <table className="min-w-full divide-y divide-gray-700">
                        <thead className="bg-gray-800 sticky top-0">
                            <tr>
                                <SortableHeader columnKey="date">Fecha</SortableHeader>
                                <SortableHeader columnKey="weight">Peso</SortableHeader>
                                <SortableHeader columnKey="reps">Reps</SortableHeader>
                                <SortableHeader columnKey="e1rm">e1RM</SortableHeader>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="bg-gray-800 divide-y divide-gray-700">
                            {filteredAndSortedRecords.map(r => (
                                <tr key={r.id} className="hover:bg-gray-700/50">
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">{formatDate(r.date)}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-white font-semibold">{r.weight} kg</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-white font-semibold">{r.reps}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-cyan-400 font-bold">{r.e1rm.toFixed(1)} kg</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium flex gap-2">
                                        <button onClick={() => setRecordToEdit(r)} className="p-1 text-blue-400 hover:text-blue-300"><Pencil className="w-5 h-5" /></button>
                                        <button onClick={() => setConfirmDelete(r.id)} className="p-1 text-red-500 hover:text-red-400"><Trash2 className="w-5 h-5" /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                     {filteredAndSortedRecords.length === 0 && <p className="text-center py-8 text-gray-500">No se encontraron récords con los filtros aplicados.</p>}
                </div>
            </Modal>
            
            {recordToEdit && (
                <EditRecordModal
                    isOpen={!!recordToEdit}
                    onClose={() => setRecordToEdit(null)}
                    record={recordToEdit}
                    onSave={handleUpdateRecord}
                    exerciseName={exerciseData.name}
                />
            )}
            
            {confirmDelete && (
                <Modal isOpen={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Confirmar Eliminación">
                    <p className="text-gray-300 mb-6">¿Estás seguro? Esta acción no se puede deshacer.</p>
                    <div className="flex justify-end gap-4">
                        <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg font-semibold">Cancelar</button>
                        <button onClick={() => handleDeleteRecord(confirmDelete)} className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg font-semibold text-white">Confirmar</button>
                    </div>
                </Modal>
            )}
        </>
    );
};

export default PRTracker;