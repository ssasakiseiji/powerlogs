import React, { useState, useEffect, useMemo, useContext } from 'react';
import { collection, doc, onSnapshot, query, updateDoc, writeBatch, getDoc, addDoc } from 'firebase/firestore';
import { AppContext } from '../context/AppContext';
import CustomSelect from '../components/CustomSelect';
import MultiSelectPopover from '../components/MultiSelectPopover';
import Modal from '../components/Modal';
import { BarChart as ReBarChart, Bar, Cell, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis, Label } from 'recharts';
import { BarChart, BookOpen, Dumbbell, RefreshCw, Search, ChevronDown, CheckCircle, Check } from '../components/Icons';

// --- Helper para obtener la fecha local en formato YYYY-MM-DD ---
const getLocalDate = () => {
    const today = new Date();
    today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
    return today.toISOString().split('T')[0];
};

// --- Componente Principal ---
const Training = () => {
    const { muscleGroups, exercises: allExercises, subcategories, userId, db, appId } = useContext(AppContext);
    const [routines, setRoutines] = useState([]);
    const [activeRoutine, setActiveRoutine] = useState(null);
    const [days, setDays] = useState([]);
    const [isRoutineModalOpen, setRoutineModalOpen] = useState(false);
    const [isStatsModalOpen, setStatsModalOpen] = useState(false);
    const [seriesLogModalData, setSeriesLogModalData] = useState(null);
    const [dayFilter, setDayFilter] = useState('all');
    const [muscleFilter, setMuscleFilter] = useState([]);
    const [openDayId, setOpenDayId] = useState(null);
    const [openExerciseId, setOpenExerciseId] = useState(null);

    useEffect(() => {
        if (!db || !userId) return;
        const unsubRoutines = onSnapshot(collection(db, `/artifacts/${appId}/users/${userId}/routines`), (snapshot) => {
            const routinesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setRoutines(routinesData);
            const currentActive = routinesData.find(r => r.isActive);
            setActiveRoutine(currentActive || (routinesData.length > 0 ? routinesData[0] : null));
        });
        return () => unsubRoutines();
    }, [db, userId, appId]);

    useEffect(() => {
        if (!activeRoutine) { setDays([]); return; };
        const q = query(collection(db, `/artifacts/${appId}/users/${userId}/routines/${activeRoutine.id}/days`));
        const unsubDays = onSnapshot(q, (snapshot) => {
            const daysData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a, b) => a.order - b.order);
            setDays(currentDays => {
                if (currentDays.length === 0 || currentDays[0]?.routineId !== activeRoutine.id) {
                    return daysData.map(d => ({ ...d, routineId: activeRoutine.id }));
                }
                return daysData.map(newDay => {
                    const existingDay = currentDays.find(d => d.id === newDay.id);
                    return existingDay ? { ...newDay, routineId: activeRoutine.id } : newDay;
                });
            });
        });
        return () => unsubDays();
    }, [db, userId, activeRoutine, appId]);

    useEffect(() => {
        setOpenDayId(null);
        setOpenExerciseId(null);
    }, [activeRoutine]);

    const toggleDayCollapse = (dayId) => {
        setOpenDayId(prev => (prev === dayId ? null : dayId));
        setOpenExerciseId(null);
    };
    
    const toggleExerciseCollapse = (exerciseId) => {
        setOpenExerciseId(prev => prev === exerciseId ? null : exerciseId);
    };

    const filteredDays = useMemo(() => {
        return days.filter(day => {
            const dayMatch = dayFilter === 'all' || day.id === dayFilter;
            const muscleMatch = muscleFilter.length === 0 || (day.exercises || []).some(ex => muscleFilter.includes(ex.muscle));
            return dayMatch && muscleMatch;
        });
    }, [days, dayFilter, muscleFilter]);

    const { routineProgress, totalRoutineSets } = useMemo(() => {
        const allSeries = days.flatMap(day => day.exercises || []).flatMap(ex => ex.series || Array(ex.sets).fill({}));
        if (allSeries.length === 0) return { routineProgress: 0, totalRoutineSets: 0 };
        const completed = allSeries.filter(s => s.completed).length;
        return {
            routineProgress: Math.round((completed / allSeries.length) * 100),
            totalRoutineSets: allSeries.length
        };
    }, [days]);
    
    const handleResetWeek = () => {
        if (window.confirm('¿Estás seguro de que quieres reiniciar el progreso de esta semana?')) {
            if (!activeRoutine) return;
            const batch = writeBatch(db);
            days.forEach(day => {
                const exercisesToUpdate = (day.exercises || []).map(ex => ({
                    ...ex,
                    series: (ex.series || Array(ex.sets).fill({})).map(s => ({ ...s, completed: false, weight: null, reps: null, note: null }))
                }));
                batch.update(doc(db, `/artifacts/${appId}/users/${userId}/routines/${activeRoutine.id}/days`, day.id), { exercises: exercisesToUpdate, progress: 0 });
            });
            batch.commit();
        }
    };
    
    const handleSeriesUpdate = (dayId, updatedExercises, newProgress) => {
        setDays(currentDays => currentDays.map(d => d.id === dayId ? { ...d, exercises: updatedExercises, progress: newProgress } : d));
    };

    return (
        <div className="p-4 md:p-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-4 gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-white">{activeRoutine ? activeRoutine.name : 'Entrenamiento'}</h2>
                    {activeRoutine && activeRoutine.notes && (<p className="text-sm text-gray-400 mt-1 italic">"{activeRoutine.notes}"</p>)}
                </div>
                <div className="flex gap-2 flex-shrink-0 w-full sm:w-auto">
                    <button onClick={() => setRoutineModalOpen(true)} className="flex-1 sm:flex-none bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center transition-colors"><BookOpen className="w-5 h-5 sm:mr-2" /><span className="hidden sm:inline">Rutinas</span></button>
                    <button onClick={() => setStatsModalOpen(true)} className="flex-1 sm:flex-none bg-teal-500 hover:bg-teal-600 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center transition-colors"><BarChart className="w-5 h-5 sm:mr-2" /> <span className="hidden sm:inline">Estadísticas</span></button>
                    <button onClick={handleResetWeek} className="flex-1 sm:flex-none bg-amber-500 hover:bg-amber-600 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center transition-colors"><RefreshCw className="w-5 h-5 sm:mr-2" /> <span className="hidden sm:inline">Reiniciar</span></button>
                </div>
            </div>
            {activeRoutine ? (
                <>
                    <div className="mb-4 bg-gray-800 p-4 rounded-lg">
                        <div className="flex justify-between items-center text-sm text-gray-400 mb-1">
                            <span>Progreso de la Rutina</span>
                            <span>{totalRoutineSets} series totales</span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-4"><div className="bg-cyan-500 h-4 rounded-full text-center text-white text-xs font-bold" style={{ width: `${routineProgress}%` }}>{routineProgress}%</div></div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <CustomSelect options={[{ value: 'all', label: 'Todos los días' }, ...days.map(d => ({ value: d.id, label: `${d.order}: ${d.name}` }))]} value={dayFilter} onChange={setDayFilter} placeholder="Filtrar por día..." />
                        <MultiSelectPopover options={muscleGroups.map(mg => ({ value: mg.name, label: mg.name }))} selected={muscleFilter} onChange={setMuscleFilter} title="Filtrar por músculo..." />
                    </div>
                    {filteredDays.length === 0 && (<div className="text-center py-10 px-4 bg-gray-800 rounded-lg"><Dumbbell className="mx-auto h-12 w-12 text-gray-500" /><h3 className="mt-2 text-lg font-medium text-white">Sin resultados</h3><p className="mt-1 text-sm text-gray-400">Ajusta los filtros o añade días/ejercicios a tu rutina.</p></div>)}
                    <div className="space-y-4">{filteredDays.map(day => (
                        <div key={day.id} className="bg-gray-800 rounded-xl shadow-lg p-5">
                            <button onClick={() => toggleDayCollapse(day.id)} className="w-full flex justify-between items-center text-left hover:opacity-80 transition-opacity mb-4">
                                <div>
                                    <h3 className="text-xl font-bold text-cyan-400">Día {day.order}: {day.name}</h3>
                                    <p className="text-sm text-gray-400">{day.progress || 0}% completado ({ (day.exercises || []).reduce((sum, ex) => sum + (ex.sets || 0), 0)} series)</p>
                                </div>
                                <ChevronDown className={`w-6 h-6 ml-4 text-cyan-400 transition-transform flex-shrink-0 ${openDayId !== day.id ? '-rotate-90' : ''}`} />
                            </button>
                            {openDayId === day.id && (
                                <div className="animate-fade-in">
                                    <div className="w-full bg-gray-700 rounded-full h-2.5 mb-4"><div className="bg-cyan-500 h-2.5 rounded-full" style={{ width: `${day.progress || 0}%`, transition: 'width 0.5s ease-in-out' }}></div></div>
                                    <div>{(day.exercises || []).map(exercise => (
                                        <ExerciseItem key={exercise.id} day={day} exercise={exercise} activeRoutineId={activeRoutine.id} isOpen={openExerciseId === exercise.id} onToggle={() => toggleExerciseCollapse(exercise.id)}
                                            onSeriesUpdate={handleSeriesUpdate}
                                            onOpenLogModal={setSeriesLogModalData}
                                        />
                                    ))}</div>
                                    {(day.exercises || []).length === 0 && (<p className="text-gray-500 text-center py-4">No hay ejercicios para este día.</p>)}
                                </div>
                            )}
                        </div>
                    ))}</div>
                </>
            ) : (
                <div className="text-center py-10 px-4 bg-gray-800 rounded-lg"><BookOpen className="mx-auto h-12 w-12 text-gray-500" /><h3 className="mt-2 text-lg font-medium text-white">Sin Rutina Activa</h3><p className="mt-1 text-sm text-gray-400">Selecciona o crea una rutina para empezar a entrenar.</p></div>
            )}
            {isRoutineModalOpen && <RoutineSelectionModal isOpen={isRoutineModalOpen} onClose={() => setRoutineModalOpen(false)} routines={routines} activeRoutine={activeRoutine} />}
            {isStatsModalOpen && <StatisticsModal isOpen={isStatsModalOpen} onClose={() => setStatsModalOpen(false)} days={days} muscleGroups={muscleGroups} allExercises={allExercises} subcategories={subcategories} activeRoutineName={activeRoutine?.name} />}
            {seriesLogModalData && <SeriesLogModal modalData={seriesLogModalData} onClose={() => setSeriesLogModalData(null)} onSeriesUpdate={handleSeriesUpdate} />}
        </div>
    );
};

const ExerciseItem = ({ day, exercise, activeRoutineId, isOpen, onToggle, onSeriesUpdate, onOpenLogModal }) => {
    const { muscleGroups, subcategories, exercises: allExercises } = useContext(AppContext);
    const muscleGroup = muscleGroups.find(mg => mg.name === exercise.muscle);
    const seriesArray = useMemo(() => exercise.series || Array(exercise.sets || 0).fill({}), [exercise.series, exercise.sets]);
    const exerciseDetails = allExercises.find(e => e.name === exercise.name);
    
    const isExerciseComplete = useMemo(() => {
        if (!seriesArray || seriesArray.length === 0) return false;
        return seriesArray.every(s => s.completed);
    }, [seriesArray]);

    const exerciseSubcategories = useMemo(() => {
        if (!exerciseDetails || !exerciseDetails.subcategoryIds) return [];
        return exerciseDetails.subcategoryIds.map(scId => subcategories.find(s => s.id === scId)?.name).filter(Boolean);
    }, [exerciseDetails, subcategories]);

    return (
        <div className={`bg-gray-700 rounded-lg mb-2 overflow-hidden shadow-md transition-all duration-300 ${isExerciseComplete ? 'bg-green-900/30 border border-green-500' : ''}`}>
            <button onClick={onToggle} className="w-full flex items-center justify-between p-3 text-left transition-colors hover:bg-gray-600/50">
                <div className="flex items-center flex-grow min-w-0">
                    {isExerciseComplete && <CheckCircle className="w-5 h-5 mr-3 text-green-400 flex-shrink-0" />}
                    <span className="text-white font-bold px-2 py-1 rounded-full mr-3 text-xs flex-shrink-0" style={{backgroundColor: muscleGroup?.color || '#6b7280'}}>{exercise.muscle}</span>
                    <div className="flex-grow min-w-0">
                        <p className="font-semibold truncate">{exercise.name}</p>
                        <div className="flex items-center text-xs text-gray-400 gap-x-2">
                             <span className="truncate">{seriesArray.length} series</span>
                             {exerciseSubcategories.length > 0 && <span className="italic truncate">({exerciseSubcategories.join(', ')})</span>}
                        </div>
                    </div>
                </div>
                <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform flex-shrink-0 ml-2 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
                <div className="px-3 pb-3 space-y-2 animate-fade-in">
                    {seriesArray.map((series, index) => ( 
                        <SeriesItem 
                            key={index} day={day} exercise={exercise} series={series} seriesIndex={index} 
                            activeRoutineId={activeRoutineId} onSeriesUpdate={onSeriesUpdate} onOpenLogModal={onOpenLogModal}
                        /> 
                    ))}
                </div>
            )}
        </div>
    );
};

const SeriesItem = ({ day, exercise, series, seriesIndex, activeRoutineId, onSeriesUpdate, onOpenLogModal }) => {
    const { userId, db, appId } = useContext(AppContext);
    
    const handleUpdate = async (updateData) => {
        const dayRef = doc(db, `/artifacts/${appId}/users/${userId}/routines/${activeRoutineId}/days`, day.id);
        const updatedSeries = [...(exercise.series || Array(exercise.sets).fill({}))];
        updatedSeries[seriesIndex] = { ...updatedSeries[seriesIndex], ...updateData };
        const updatedExercises = (day.exercises || []).map(ex => ex.id === exercise.id ? { ...ex, series: updatedSeries } : ex );
        const allSeriesInDay = updatedExercises.flatMap(ex => ex.series || Array(ex.sets).fill({}));
        const completedCount = allSeriesInDay.filter(s => s.completed).length;
        const newProgress = allSeriesInDay.length > 0 ? Math.round((completedCount / allSeriesInDay.length) * 100) : 0;
        
        onSeriesUpdate(day.id, updatedExercises, newProgress);
        await updateDoc(dayRef, { exercises: updatedExercises, progress: newProgress });
    };

    const handleQuickComplete = () => handleUpdate({ completed: !series.completed });

    const handleOpenLogModal = () => {
        onOpenLogModal({ day, exercise, series, seriesIndex, activeRoutineId });
    };

    return (
        <div className={`p-3 rounded-lg transition-all duration-300 ${series.completed ? 'bg-gray-800/50' : 'bg-gray-800'}`}>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <input type="checkbox" checked={!!series.completed} onChange={handleQuickComplete} className="form-checkbox h-6 w-6 text-cyan-500 bg-gray-900 border-gray-600 rounded-full focus:ring-cyan-600 focus:ring-offset-gray-800"/>
                    <div>
                        <span className={`font-bold text-base ${series.completed ? 'line-through text-gray-500' : 'text-white'}`}>Serie {seriesIndex + 1}</span>
                        {series.weight && series.reps && <span className="text-sm text-gray-400 font-normal ml-2">({series.weight}kg x {series.reps} reps)</span>}
                        {series.note && <p className="text-xs text-cyan-300 italic mt-1">"{series.note}"</p>}
                    </div>
                </div>
                {!series.completed && ( <button onClick={handleOpenLogModal} className="text-sm bg-violet-600 hover:bg-violet-500 px-3 py-2 rounded-lg text-white font-bold transition-transform hover:scale-105">Registrar</button> )}
            </div>
        </div>
    );
};

// --- Modals ---

const SeriesLogModal = ({ modalData, onClose, onSeriesUpdate }) => {
    const { day, exercise, series, seriesIndex, activeRoutineId } = modalData;
    const { userId, db, appId, exercises: allExercises } = useContext(AppContext);
    
    const [weight, setWeight] = useState(series.weight || '');
    const [reps, setReps] = useState(series.reps || '');
    const [note, setNote] = useState('');

    const handleSave = async () => {
        const isWeightEmpty = weight === '' || weight === null;
        const isRepsEmpty = reps === '' || reps === null;
        const isNoteEmpty = note.trim() === '';

        const dayRef = doc(db, `/artifacts/${appId}/users/${userId}/routines/${activeRoutineId}/days`, day.id);
        
        // Lógica 1: Todo vacío, solo marcar como completado
        if (isWeightEmpty && isRepsEmpty && isNoteEmpty) {
            const daySnapshot = await getDoc(dayRef);
            const currentDayData = daySnapshot.data();
            const updatedSeries = [...(currentDayData.exercises.find(e => e.id === exercise.id).series || Array(exercise.sets).fill({}))];
            updatedSeries[seriesIndex] = { ...updatedSeries[seriesIndex], completed: true };
            const updatedExercises = currentDayData.exercises.map(ex => ex.id === exercise.id ? { ...ex, series: updatedSeries } : ex);
            const allSeriesInDay = updatedExercises.flatMap(ex => ex.series || Array(ex.sets).fill({}));
            const completedCount = allSeriesInDay.filter(s => s.completed).length;
            const newProgress = allSeriesInDay.length > 0 ? Math.round((completedCount / allSeriesInDay.length) * 100) : 0;
            onSeriesUpdate(day.id, updatedExercises, newProgress);
            await updateDoc(dayRef, { exercises: updatedExercises, progress: newProgress });
            onClose();
            return;
        }

        // Lógica 2: Algún campo lleno, pero peso o reps vacíos
        if (isWeightEmpty || isRepsEmpty) {
            alert("Debes rellenar tanto el peso como las repeticiones para guardar el récord.");
            return;
        }

        // Lógica 3: Campos principales llenos, guardar PR
        const weightNum = parseFloat(weight);
        const repsNum = parseInt(reps);
        if (isNaN(weightNum) || isNaN(repsNum)) {
             alert("El peso y las repeticiones deben ser números válidos.");
            return;
        }
        
        const exerciseDetails = allExercises.find(e => e.name === exercise.name);
        
        const e1rm = repsNum === 1 ? weightNum : weightNum * (1 + repsNum / 30);
        await addDoc(collection(db, `/artifacts/${appId}/users/${userId}/personalRecords`), {
            exerciseId: exerciseDetails?.id || '',
            weight: weightNum,
            reps: repsNum,
            e1rm: parseFloat(e1rm.toFixed(2)),
            volume: parseFloat((weightNum * repsNum).toFixed(2)),
            date: getLocalDate(),
            note: note || ""
        });

        const daySnapshot = await getDoc(dayRef);
        const currentDayData = daySnapshot.data();
        const updatedSeries = [...(currentDayData.exercises.find(e => e.id === exercise.id).series || Array(exercise.sets).fill({}))];
        updatedSeries[seriesIndex] = { ...updatedSeries[seriesIndex], weight: weightNum, reps: repsNum, completed: true };
        const updatedExercises = currentDayData.exercises.map(ex => ex.id === exercise.id ? { ...ex, series: updatedSeries } : ex);
        const allSeriesInDay = updatedExercises.flatMap(ex => ex.series || Array(ex.sets).fill({}));
        const completedCount = allSeriesInDay.filter(s => s.completed).length;
        const newProgress = allSeriesInDay.length > 0 ? Math.round((completedCount / allSeriesInDay.length) * 100) : 0;
        
        onSeriesUpdate(day.id, updatedExercises, newProgress);
        await updateDoc(dayRef, { exercises: updatedExercises, progress: newProgress });

        onClose();
    };

    return (
        <Modal isOpen={true} onClose={onClose} title={`Registrar Serie: ${exercise.name}`}>
            <div className="space-y-4">
                <div className="flex gap-4">
                    <input type="number" value={weight} onChange={e => setWeight(e.target.value)} placeholder="Peso (kg)" className="w-full bg-gray-700 text-white p-3 rounded-lg border border-gray-600" />
                    <input type="number" value={reps} onChange={e => setReps(e.target.value)} placeholder="Repeticiones" className="w-full bg-gray-700 text-white p-3 rounded-lg border border-gray-600" />
                </div>
                <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Nota del PR (opcional)" className="w-full bg-gray-700 text-white p-3 rounded-lg border border-gray-600 h-24" />
                <button onClick={handleSave} className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-4 rounded-lg transition-colors">Guardar y Completar</button>
            </div>
        </Modal>
    );
};


const RoutineSelectionModal = ({ isOpen, onClose, routines, activeRoutine }) => {
    const { userId, db, appId } = useContext(AppContext);
    const [selectedRoutineId, setSelectedRoutineId] = useState(activeRoutine?.id || '');
    const [searchTerm, setSearchTerm] = useState('');

    const filteredRoutines = useMemo(() => {
        return routines.filter(r => r.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [routines, searchTerm]);
    
    const handleSelectRoutine = async () => {
        if (!selectedRoutineId || selectedRoutineId === activeRoutine?.id) return;
        const batch = writeBatch(db);
        routines.forEach(r => {
            batch.update(doc(db, `/artifacts/${appId}/users/${userId}/routines`, r.id), { isActive: r.id === selectedRoutineId });
        });
        await batch.commit();
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Seleccionar Rutina">
            <div className="space-y-4 min-h-[400px] flex flex-col">
                <div className="relative flex-shrink-0">
                    <input
                        type="text"
                        placeholder="Buscar rutina por nombre..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full bg-gray-700 p-3 pl-10 rounded-lg border border-gray-600 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                    />
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                </div>

                <div className="space-y-2 flex-grow overflow-y-auto pr-2 -mr-2">
                    {filteredRoutines.map(r => {
                        const isActive = r.id === activeRoutine?.id;
                        const isSelected = r.id === selectedRoutineId;

                        return (
                            <div 
                                key={r.id} 
                                onClick={() => !isActive && setSelectedRoutineId(r.id)}
                                className={`p-4 rounded-lg border-2 flex items-center justify-between transition-all duration-200
                                    ${isActive ? 'bg-cyan-900/50 border-cyan-500 cursor-default' : 'bg-gray-700 border-gray-700 hover:border-cyan-600 cursor-pointer'}
                                    ${isSelected && !isActive ? 'border-cyan-500 ring-2 ring-cyan-500' : ''}
                                `}
                            >
                                <div>
                                    <p className="font-bold text-white">{r.name}</p>
                                    {r.notes && <p className="text-sm text-gray-400 italic">"{r.notes}"</p>}
                                </div>
                                {isActive && <span className="text-xs font-bold bg-cyan-500 text-white px-2 py-1 rounded-full">Activa</span>}
                                {isSelected && !isActive && <div className="w-6 h-6 rounded-full bg-cyan-500 flex items-center justify-center flex-shrink-0"><Check className="w-4 h-4 text-white" /></div>}
                            </div>
                        )
                    })}
                    {filteredRoutines.length === 0 && (
                        <div className="text-center py-10 text-gray-500">
                            <p>No se encontraron rutinas.</p>
                        </div>
                    )}
                </div>
                <button 
                    onClick={handleSelectRoutine} 
                    disabled={!selectedRoutineId || selectedRoutineId === activeRoutine?.id} 
                    className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 rounded-lg transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed mt-auto"
                >
                    Activar Rutina
                </button>
            </div>
        </Modal>
    );
};

const StatisticsModal = ({ isOpen, onClose, days, muscleGroups, allExercises, subcategories, activeRoutineName }) => {
    const [groupBy, setGroupBy] = useState('muscle');
    const [calcBy, setCalcBy] = useState('sets');

    const groupedChartData = useMemo(() => {
        const dataByMuscle = {};
        muscleGroups.forEach(mg => {
            dataByMuscle[mg.id] = { name: mg.name, color: mg.color, subcategories: [] };
        });

        subcategories.forEach(sc => {
            if (dataByMuscle[sc.muscleGroupId]) {
                const exercisesWithThisSubcat = allExercises.filter(ex => ex.subcategoryIds?.includes(sc.id));
                let count = 0;
                days.forEach(day => {
                    (day.exercises || []).forEach(dayEx => {
                        if (exercisesWithThisSubcat.some(ex => ex.name === dayEx.name)) {
                            count += (calcBy === 'sets' ? (dayEx.series?.length || dayEx.sets || 0) : 1);
                        }
                    });
                });
                if (count > 0) {
                    dataByMuscle[sc.muscleGroupId].subcategories.push({ name: sc.name, count });
                }
            }
        });
        return Object.values(dataByMuscle).filter(muscle => muscle.subcategories.length > 0);
    }, [days, muscleGroups, subcategories, allExercises, calcBy]);

    const muscleChartData = useMemo(() => {
        const data = {};
        muscleGroups.forEach(mg => { data[mg.name] = { count: 0, color: mg.color }; });
        days.forEach(day => {
            (day.exercises || []).forEach(ex => {
                if (data[ex.muscle]) {
                    data[ex.muscle].count += (calcBy === 'sets' ? (ex.series?.length || ex.sets || 0) : 1);
                }
            });
        });
        return Object.entries(data).map(([name, values]) => ({ name, ...values })).filter(d => d.count > 0).sort((a,b) => b.count - a.count);
    }, [days, muscleGroups, calcBy]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Estadísticas de ${activeRoutineName || 'la Rutina'}`} size="2xl">
            <div className="flex flex-col sm:flex-row gap-4 mb-4">
                <div className="flex-1">
                    <label className="text-sm font-medium text-gray-300 mb-1 block">Agrupar por</label>
                    <CustomSelect options={[{value: 'muscle', label: 'Músculo'}, {value: 'subcategory', label: 'Subcategoría'}]} value={groupBy} onChange={setGroupBy} />
                </div>
                <div className="flex-1">
                    <label className="text-sm font-medium text-gray-300 mb-1 block">Calcular usando</label>
                    <CustomSelect options={[{value: 'sets', label: 'Total de Series'}, {value: 'exercises', label: 'Total de Ejercicios'}]} value={calcBy} onChange={setCalcBy} />
                </div>
            </div>

            <h4 className="font-bold text-lg text-teal-400 mb-4 text-center">Volumen Semanal por {groupBy === 'muscle' ? 'Músculo' : 'Subcategoría'}</h4>
            
            <div className="w-full h-[50vh] overflow-y-auto pr-2">
            {groupBy === 'muscle' ? (
                <ResponsiveContainer width="100%" height={muscleChartData.length * 40 + 30}>
                    <ReBarChart data={muscleChartData} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#4a5568" />
                        <XAxis type="number" stroke="#a0aec0" allowDecimals={false} />
                        <YAxis type="category" dataKey="name" stroke="#a0aec0" width={80} fontSize={12} />
                        <Tooltip contentStyle={{ backgroundColor: '#2d3748', border: '1px solid #4a5568' }} cursor={{fill: 'rgba(148, 163, 184, 0.1)'}} />
                        <Bar dataKey="count" name={calcBy === 'sets' ? 'Series' : 'Ejercicios'}>
                            <LabelList dataKey="count" position="right" style={{ fill: 'white' }} />
                            {muscleChartData.map((entry, index) => ( <Cell key={`cell-${index}`} fill={entry.color} /> ))}
                        </Bar>
                    </ReBarChart>
                </ResponsiveContainer>
            ) : (
                <div className="space-y-6">
                    {groupedChartData.map(muscle => (
                        <div key={muscle.name}>
                            <h5 className="font-bold text-lg mb-2" style={{color: muscle.color}}>{muscle.name}</h5>
                            <ResponsiveContainer width="100%" height={muscle.subcategories.length * 40 + 30}>
                                <ReBarChart data={muscle.subcategories} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#4a5568" />
                                    <XAxis type="number" stroke="#a0aec0" allowDecimals={false} />
                                    <YAxis type="category" dataKey="name" stroke="#a0aec0" width={100} fontSize={12} />
                                    <Tooltip contentStyle={{ backgroundColor: '#2d3748', border: '1px solid #4a5568' }} cursor={{fill: 'rgba(148, 163, 184, 0.1)'}} />
                                    <Bar dataKey="count" name={calcBy === 'sets' ? 'Series' : 'Ejercicios'} fill={muscle.color}>
                                        <LabelList dataKey="count" position="right" style={{ fill: 'white' }} />
                                    </Bar>
                                </ReBarChart>
                            </ResponsiveContainer>
                        </div>
                    ))}
                </div>
            )}
            </div>
        </Modal>
    );
};

export default Training;