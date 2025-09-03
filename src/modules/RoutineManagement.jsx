import React, { useState, useEffect, useMemo, useContext } from 'react';
import { collection, doc, onSnapshot, query, updateDoc, addDoc, deleteDoc, writeBatch, getDocs, getDoc } from 'firebase/firestore';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { AppContext } from '../context/AppContext';
import Modal from '../components/Modal';
import ConfirmationModal from '../components/ConfirmationModal';
import CustomSelect from '../components/CustomSelect';
import MultiSelectPopover from '../components/MultiSelectPopover';
import { Pencil, Trash2, GripVertical, Search, Copy, ChevronDown, Dumbbell } from '../components/Icons';

const RoutineManagement = () => {
    const { exercises: allExercises, muscleGroups, userId, db, appId } = useContext(AppContext);
    const [routines, setRoutines] = useState([]);
    const [selectedRoutine, setSelectedRoutine] = useState(null);
    const [days, setDays] = useState([]);
    const [editingRoutine, setEditingRoutine] = useState(null);
    const [editingDay, setEditingDay] = useState(null);
    const [editingExercise, setEditingExercise] = useState(null);
    const [confirmAction, setConfirmAction] = useState(null);
    const [routineSearch, setRoutineSearch] = useState('');
    const [muscleFilter, setMuscleFilter] = useState([]);
    const [dayFilter, setDayFilter] = useState('all');
    const [openDayId, setOpenDayId] = useState(null);
    const [openExerciseId, setOpenExerciseId] = useState(null);

    const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

    useEffect(() => {
        if (!db || !userId) return;
        const q = query(collection(db, `/artifacts/${appId}/users/${userId}/routines`));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const routinesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setRoutines(routinesData);
        });
        return unsubscribe;
    }, [db, userId, appId]);

    useEffect(() => {
        if (selectedRoutine) {
            const q = query(collection(db, `/artifacts/${appId}/users/${userId}/routines/${selectedRoutine.id}/days`));
            const unsubscribe = onSnapshot(q, (snapshot) => {
                const daysData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                daysData.sort((a, b) => a.order - b.order);
                setDays(currentDays => {
                    if (currentDays.length === 0 || !currentDays.some(d => d.routineId === selectedRoutine.id)) {
                        return daysData.map(d => ({ ...d, routineId: selectedRoutine.id }));
                    }
                    return daysData.map(newDay => {
                        const existingDay = currentDays.find(d => d.id === newDay.id);
                        return existingDay ? { ...newDay, routineId: selectedRoutine.id } : newDay;
                    });
                });
            });
            return unsubscribe;
        } else {
            setDays([]);
        }
    }, [db, userId, selectedRoutine, appId]);

    useEffect(() => {
        setOpenDayId(null);
        setOpenExerciseId(null);
    }, [selectedRoutine]);

    const filteredRoutines = useMemo(() => routines.filter(r => r.name.toLowerCase().includes(routineSearch.toLowerCase())), [routines, routineSearch]);
    const filteredDays = useMemo(() => days.filter(day => dayFilter === 'all' || day.id === dayFilter), [days, dayFilter]);
    
    const toggleDayCollapse = (dayId) => {
        setOpenDayId(prev => (prev === dayId ? null : dayId));
        setOpenExerciseId(null);
    };

    const toggleExerciseCollapse = (exerciseId) => {
        setOpenExerciseId(prev => (prev === exerciseId ? null : exerciseId));
    };
    
    const reorderDays = async (routineId) => {
        const daysQuery = query(collection(db, `/artifacts/${appId}/users/${userId}/routines/${routineId}/days`));
        const daysSnapshot = await getDocs(daysQuery);
        if (daysSnapshot.empty) return;
        const daysData = daysSnapshot.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => a.order - b.order);
        const batch = writeBatch(db);
        daysData.forEach((day, index) => {
            if (day.order !== index + 1) {
                batch.update(doc(db, `/artifacts/${appId}/users/${userId}/routines/${routineId}/days`, day.id), { order: index + 1 });
            }
        });
        await batch.commit();
    };

    const handleSaveRoutine = async () => {
        const { id, name, notes } = editingRoutine;
        if (!name.trim()) return;
        const routinePath = `/artifacts/${appId}/users/${userId}/routines`;
        const data = { name, notes: notes || "" };
        if (id) await updateDoc(doc(db, routinePath, id), data);
        else await addDoc(collection(db, routinePath), { ...data, isActive: routines.length === 0 });
        setEditingRoutine(null);
    };

    const handleDuplicateRoutine = async (routineId) => {
        const routineRef = doc(db, `/artifacts/${appId}/users/${userId}/routines`, routineId);
        const routineSnap = await getDoc(routineRef);
        if (!routineSnap.exists()) return;
        const newRoutineRef = await addDoc(collection(db, `/artifacts/${appId}/users/${userId}/routines`), { ...routineSnap.data(), name: `${routineSnap.data().name} (Copia)`, isActive: false });
        const daysQuery = query(collection(db, `/artifacts/${appId}/users/${userId}/routines/${routineId}/days`));
        const daysSnapshot = await getDocs(daysQuery);
        if (daysSnapshot.empty) return;
        const batch = writeBatch(db);
        daysSnapshot.forEach(dayDoc => {
            const newDayRef = doc(collection(db, `/artifacts/${appId}/users/${userId}/routines/${newRoutineRef.id}/days`));
            batch.set(newDayRef, dayDoc.data());
        });
        await batch.commit();
        setConfirmAction(null);
    };
    
    const handleDeleteRoutine = async (routineId) => {
        const daysRef = collection(db, `/artifacts/${appId}/users/${userId}/routines/${routineId}/days`);
        const daysSnapshot = await getDocs(daysRef);
        const batch = writeBatch(db);
        daysSnapshot.forEach(dayDoc => batch.delete(dayDoc.ref));
        batch.delete(doc(db, `/artifacts/${appId}/users/${userId}/routines`, routineId));
        await batch.commit();
        setSelectedRoutine(null);
        setConfirmAction(null);
    };
    
    const handleSaveDay = async () => {
        const { id, name } = editingDay;
        if (!name.trim() || !selectedRoutine) return;
        const daysPath = `/artifacts/${appId}/users/${userId}/routines/${selectedRoutine.id}/days`;
        if (id) await updateDoc(doc(db, daysPath, id), { name });
        else {
            const newOrder = days.length > 0 ? Math.max(...days.map(d => d.order)) + 1 : 1;
            await addDoc(collection(db, daysPath), { name, order: newOrder, exercises: [], progress: 0 });
        }
        setEditingDay(null);
    };

    const handleDuplicateDay = async (dayId) => {
        const dayRef = doc(db, `/artifacts/${appId}/users/${userId}/routines/${selectedRoutine.id}/days`, dayId);
        const daySnap = await getDoc(dayRef);
        if (!daySnap.exists()) return;
        await addDoc(collection(db, `/artifacts/${appId}/users/${userId}/routines/${selectedRoutine.id}/days`), { ...daySnap.data(), name: `${daySnap.data().name} (Copia)`, order: 999 });
        await reorderDays(selectedRoutine.id);
        setConfirmAction(null);
    };

    const handleDeleteDay = async (dayId) => {
        await deleteDoc(doc(db, `/artifacts/${appId}/users/${userId}/routines/${selectedRoutine.id}/days`, dayId));
        await reorderDays(selectedRoutine.id);
        setConfirmAction(null);
    };

    const handleSaveExercise = async (dayId) => {
        const { id, exerciseId, series } = editingExercise;
        if (!exerciseId || !series || series.length === 0) return;
        const day = days.find(d => d.id === dayId);
        if (!day) return;
        
        const exerciseDetails = allExercises.find(ex => ex.id === exerciseId);
        if (!exerciseDetails) {
            console.error("No se pudieron encontrar los detalles del ejercicio.");
            return;
        }

        const muscleGroup = muscleGroups.find(mg => mg.id === exerciseDetails.muscleGroupId);
        
        const newExerciseData = {
            name: exerciseDetails.name,
            muscle: muscleGroup?.name || 'Desconocido',
            sets: series.length,
            series: series.map(s => ({ note: s.note || "" })) 
        };

        const updatedExercises = id 
            ? (day.exercises || []).map(ex => ex.id === id ? { ...ex, ...newExerciseData } : ex)
            : [...(day.exercises || []), { id: crypto.randomUUID(), ...newExerciseData }];
            
        await updateDoc(doc(db, `/artifacts/${appId}/users/${userId}/routines/${selectedRoutine.id}/days`, dayId), { exercises: updatedExercises });
        setEditingExercise(null);
    };
    
    const handleDuplicateExercise = async (dayId, exerciseId) => {
        const day = days.find(d => d.id === dayId);
        if (!day || !day.exercises) return;
        const exerciseToCopy = day.exercises.find(ex => ex.id === exerciseId);
        if (!exerciseToCopy) return;
        const newExercise = { ...exerciseToCopy, id: crypto.randomUUID() };
        const originalIndex = day.exercises.findIndex(ex => ex.id === exerciseId);
        const updatedExercises = [...day.exercises.slice(0, originalIndex + 1), newExercise, ...day.exercises.slice(originalIndex + 1)];
        await updateDoc(doc(db, `/artifacts/${appId}/users/${userId}/routines/${selectedRoutine.id}/days`, dayId), { exercises: updatedExercises });
        setConfirmAction(null);
    };

    const handleDeleteExercise = async (dayId, exerciseId) => {
        const day = days.find(d => d.id === dayId);
        if (!day || !day.exercises) return;
        const updatedExercises = day.exercises.filter(ex => ex.id !== exerciseId);
        await updateDoc(doc(db, `/artifacts/${appId}/users/${userId}/routines/${selectedRoutine.id}/days`, dayId), { exercises: updatedExercises });
        setConfirmAction(null);
    };

    const handleDragEnd = async (event, dayId) => {
        const { active, over } = event;
        if (active && over && active.id !== over.id) {
            const day = days.find(d => d.id === dayId);
            if (!day) return;
            const oldIndex = day.exercises.findIndex(ex => ex.id === active.id);
            const newIndex = day.exercises.findIndex(ex => ex.id === over.id);
            const updatedExercises = arrayMove(day.exercises, oldIndex, newIndex);
            setDays(prevDays => prevDays.map(d => d.id === dayId ? { ...d, exercises: updatedExercises } : d));
            await updateDoc(doc(db, `/artifacts/${appId}/users/${userId}/routines/${selectedRoutine.id}/days`, dayId), { exercises: updatedExercises });
        }
    };

    if (!allExercises || allExercises.length === 0 || !muscleGroups || muscleGroups.length === 0) {
        return (
            <div className="flex items-center justify-center h-full text-gray-400">
                <Dumbbell className="animate-spin h-8 w-8 mr-4" />
                <span>Cargando datos maestros...</span>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-10rem)]">
            <div className="lg:col-span-1 bg-gray-800 p-4 rounded-xl flex flex-col">
                <div className="flex justify-between items-center mb-2">
                    <h3 className="text-xl font-bold text-white">Mis Rutinas</h3>
                    <button onClick={() => setEditingRoutine({ name: '', notes: '' })} className="bg-green-600 hover:bg-green-500 text-white font-bold py-1 px-3 rounded-lg text-sm">Añadir</button>
                </div>
                <div className="relative mb-4">
                    <input type="text" value={routineSearch} onChange={e => setRoutineSearch(e.target.value)} placeholder="Buscar rutina..." className="w-full bg-gray-700 p-2 pl-10 rounded-lg" />
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                </div>
                <div className="space-y-2 overflow-y-auto">
                    {filteredRoutines.map(r => (
                        <div key={r.id} onClick={() => setSelectedRoutine(r)} className={`p-3 rounded-lg cursor-pointer transition-colors ${selectedRoutine?.id === r.id ? 'bg-green-800' : 'bg-gray-700 hover:bg-gray-600'}`}>
                            <div className="flex justify-between items-center">
                                <span className="font-semibold">{r.name}</span>
                                <div className="flex items-center">
                                    <button onClick={(e) => { e.stopPropagation(); setConfirmAction(() => () => handleDuplicateRoutine(r.id)); }} className="p-1 text-gray-400 hover:text-white"><Copy className="w-4 h-4" /></button>
                                    <button onClick={(e) => { e.stopPropagation(); setEditingRoutine(r); }} className="p-1 text-gray-400 hover:text-white"><Pencil className="w-4 h-4" /></button>
                                    <button onClick={(e) => { e.stopPropagation(); setConfirmAction(() => () => handleDeleteRoutine(r.id)); }} className="p-1 text-red-500 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                                </div>
                            </div>
                            {r.notes && <p className="text-xs text-gray-400 mt-1 italic">"{r.notes}"</p>}
                        </div>
                    ))}
                </div>
            </div>

            <div className="lg:col-span-2 bg-gray-800 p-4 rounded-xl flex flex-col overflow-y-auto">
                {selectedRoutine ? (
                    <>
                        <div className="flex flex-col md:flex-row justify-between md:items-center mb-2 gap-2">
                            <div>
                                <h3 className="text-xl font-bold text-white">{selectedRoutine.name}</h3>
                                {selectedRoutine.notes && <p className="text-sm text-gray-400 italic">"{selectedRoutine.notes}"</p>}
                            </div>
                            <button onClick={() => setEditingDay({ name: '' })} className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-1 px-3 rounded-lg text-sm flex-shrink-0 self-start md:self-center">Añadir Día</button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <CustomSelect options={[{ value: 'all', label: 'Todos los días' }, ...days.map(d => ({ value: d.id, label: `${d.order}: ${d.name}` }))]} value={dayFilter} onChange={setDayFilter} placeholder="Filtrar por día..." />
                            <MultiSelectPopover options={muscleGroups.map(mg => ({value: mg.name, label: mg.name}))} selected={muscleFilter} onChange={setMuscleFilter} title="Filtrar por músculo..." />
                        </div>
                        <div className="space-y-4">
                            {filteredDays.map(day => {
                                const exercisesForDay = day.exercises || [];
                                const filteredExercises = muscleFilter.length > 0 ? exercisesForDay.filter(ex => muscleFilter.includes(ex.muscle)) : exercisesForDay;
                                if (filteredExercises.length === 0 && muscleFilter.length > 0 && dayFilter === 'all') return null;
                                return (
                                <div key={day.id} className="bg-gray-700 p-4 rounded-lg">
                                    <div className="flex justify-between items-center mb-3">
                                        <button onClick={() => toggleDayCollapse(day.id)} className="flex items-center text-left hover:opacity-80 transition-opacity flex-grow">
                                            <h4 className="font-bold text-cyan-400 text-lg">Día {day.order}: {day.name}</h4>
                                            <ChevronDown className={`w-5 h-5 ml-2 text-cyan-400 transition-transform ${openDayId !== day.id ? '-rotate-90' : ''}`} />
                                        </button>
                                        <div>
                                            <button onClick={() => setConfirmAction(() => () => handleDuplicateDay(day.id))} className="p-1 text-gray-400 hover:text-white"><Copy className="w-4 h-4" /></button>
                                            <button onClick={() => setEditingDay(day)} className="p-1 text-gray-400 hover:text-white"><Pencil className="w-4 h-4" /></button>
                                            <button onClick={() => setConfirmAction(() => () => handleDeleteDay(day.id))} className="p-1 text-red-500 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                                        </div>
                                    </div>
                                    {openDayId === day.id && (
                                    <div className="animate-fade-in">
                                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => handleDragEnd(e, day.id)}>
                                            <SortableContext items={filteredExercises.map(ex => ex.id)} strategy={verticalListSortingStrategy}>
                                                {filteredExercises.map(ex => 
                                                    <ExerciseAccordion key={ex.id} dayId={day.id} exercise={ex} isOpen={openExerciseId === ex.id}
                                                        allExercises={allExercises}
                                                        muscleGroups={muscleGroups}
                                                        onToggle={toggleExerciseCollapse}
                                                        setEditingExercise={setEditingExercise}
                                                        setConfirmAction={setConfirmAction}
                                                        onDuplicate={handleDuplicateExercise}
                                                        onDelete={handleDeleteExercise}
                                                    />
                                                )}
                                            </SortableContext>
                                        </DndContext>
                                        <button onClick={() => setEditingExercise({ dayId: day.id, exerciseId: '', series: [{note: ''}] })} className="mt-2 w-full bg-gray-600 hover:bg-gray-500 text-white font-semibold py-2 rounded-lg text-sm">Añadir Ejercicio</button>
                                    </div>
                                    )}
                                </div>
                            )})}
                        </div>
                    </>
                ) : ( <div className="flex items-center justify-center h-full"><p className="text-gray-500">Selecciona una rutina para ver sus detalles.</p></div> )}
            </div>

            <Modal isOpen={!!editingRoutine} onClose={() => setEditingRoutine(null)} title={editingRoutine?.id ? 'Editar Rutina' : 'Nueva Rutina'}>
                <div className="space-y-4"><input type="text" value={editingRoutine?.name || ''} onChange={e => setEditingRoutine({ ...editingRoutine, name: e.target.value })} placeholder="Nombre de la rutina" className="w-full bg-gray-700 p-3 rounded-lg" /><textarea value={editingRoutine?.notes || ''} onChange={e => setEditingRoutine({ ...editingRoutine, notes: e.target.value })} placeholder="Nota (ej: Énfasis en pecho)" className="w-full bg-gray-700 p-3 rounded-lg h-20" /><button onClick={handleSaveRoutine} className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg">Guardar</button></div>
            </Modal>
            <Modal isOpen={!!editingDay} onClose={() => setEditingDay(null)} title={editingDay?.id ? 'Editar Día' : 'Nuevo Día'}>
                <div className="space-y-4"><input type="text" value={editingDay?.name || ''} onChange={e => setEditingDay({ ...editingDay, name: e.target.value })} placeholder="Nombre del día (ej: Día de Empuje)" className="w-full bg-gray-700 p-3 rounded-lg" /><button onClick={handleSaveDay} className="w-full bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-2 px-4 rounded-lg">Guardar</button></div>
            </Modal>
            {editingExercise && <ExerciseEditorModal isOpen={!!editingExercise} onClose={() => setEditingExercise(null)} onSave={() => handleSaveExercise(editingExercise.dayId)} exerciseData={editingExercise} setExerciseData={setEditingExercise} allExercises={allExercises} />}
            <ConfirmationModal isOpen={!!confirmAction} onClose={() => setConfirmAction(null)} onConfirm={confirmAction} title="Confirmar Acción" message="¿Estás seguro? Esta acción no se puede deshacer." />
        </div>
    );
};

const ExerciseAccordion = ({ dayId, exercise, isOpen, onToggle, setEditingExercise, setConfirmAction, onDuplicate, onDelete, allExercises, muscleGroups }) => {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: exercise.id });
    const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isOpen ? 10 : 1 };
    
    const muscleGroup = muscleGroups?.find(mg => mg.name === exercise.muscle);

    const handleEdit = (e) => {
        e.stopPropagation();
        
        const muscleGroupId = muscleGroups.find(mg => mg.name === exercise.muscle)?.id;
        const exerciseDetails = allExercises.find(ex => 
            ex.name === exercise.name && ex.muscleGroupId === muscleGroupId
        );
        const exerciseIdToEdit = exerciseDetails ? exerciseDetails.id : '';

        setEditingExercise({
            ...exercise,
            dayId,
            exerciseId: exerciseIdToEdit,
        });
    };

    const handleDuplicate = (e) => { e.stopPropagation(); setConfirmAction(() => () => onDuplicate(dayId, exercise.id)); };
    const handleDelete = (e) => { e.stopPropagation(); setConfirmAction(() => () => onDelete(dayId, exercise.id)); };

    return (
        <div ref={setNodeRef} style={style} className="bg-gray-600 rounded-lg mb-2 shadow-md">
            <div className="flex items-center justify-between p-3">
                <div className="flex items-center flex-grow cursor-pointer" onClick={() => onToggle(exercise.id)}>
                    <button {...attributes} {...listeners} onClick={(e) => e.stopPropagation()} className="cursor-grab p-2 text-gray-400 hover:text-white"><GripVertical className="w-5 h-5" /></button>
                    <div className="ml-2">
                        <p className="font-semibold">{exercise.name}</p>
                        <div className="flex items-center text-xs mt-1">
                            <span className="text-white px-2 py-1 font-bold rounded-full mr-2" style={{backgroundColor: muscleGroup?.color || '#6b7280'}}>{exercise.muscle}</span>
                            <span className="text-gray-400">{exercise.sets} series</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center">
                    <button onClick={handleDuplicate} className="p-1 text-gray-400 hover:text-white"><Copy className="w-4 h-4" /></button>
                    <button onClick={handleEdit} className="p-1 text-gray-400 hover:text-white"><Pencil className="w-4 h-4" /></button>
                    <button onClick={handleDelete} className="p-1 text-red-500 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                    <button onClick={() => onToggle(exercise.id)} className="p-1 text-gray-400 hover:text-white ml-2"><ChevronDown className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} /></button>
                </div>
            </div>
            {isOpen && (
                <div className="px-3 pb-3 space-y-2 animate-fade-in border-t border-gray-500/50">
                    {(exercise.series || []).map((serie, index) => (
                        <div key={index} className="bg-gray-800/50 p-2 rounded-md">
                            <p className="font-semibold text-sm">Serie {index + 1}</p>
                            {serie.note && <p className="text-xs text-cyan-300 italic">"{serie.note}"</p>}
                        </div>
                    ))}
                     {(exercise.series || []).length === 0 && <p className="text-xs text-gray-500 italic text-center">No hay notas para este ejercicio.</p>}
                </div>
            )}
        </div>
    );
};

const ExerciseEditorModal = ({ isOpen, onClose, onSave, exerciseData, setExerciseData, allExercises }) => {
    
    const addSeries = () => {
        const currentSeries = exerciseData.series || [];
        if (currentSeries.length >= 15) return;
        setExerciseData({ ...exerciseData, series: [...currentSeries, { note: '' }] });
    };

    const removeSeries = () => {
        const currentSeries = exerciseData.series || [];
        if (currentSeries.length <= 1) return;
        setExerciseData({ ...exerciseData, series: currentSeries.slice(0, -1) });
    };

    const handleNoteChange = (index, note) => {
        const newSeries = [...exerciseData.series];
        newSeries[index].note = note;
        setExerciseData({ ...exerciseData, series: newSeries });
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={exerciseData?.id ? 'Editar Ejercicio' : 'Añadir Ejercicio'}>
            <div className="space-y-4 min-h-[400px] flex flex-col">
                <CustomSelect 
                    options={allExercises.map(ex => ({ value: ex.id, label: ex.name }))} 
                    value={exerciseData?.exerciseId || ''} 
                    onChange={val => setExerciseData({ ...exerciseData, exerciseId: val })} 
                    placeholder="Seleccionar ejercicio..." 
                />
                
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Número de Series</label>
                    <div className="flex items-center gap-4">
                        <button onClick={removeSeries} className="bg-gray-600 hover:bg-gray-500 rounded-lg p-3 font-bold text-xl">-</button>
                        <input 
                            type="text" 
                            value={`${exerciseData?.series?.length || 0} series`} 
                            readOnly 
                            className="w-full bg-gray-700 p-3 rounded-lg text-center" 
                        />
                        <button onClick={addSeries} className="bg-gray-600 hover:bg-gray-500 rounded-lg p-3 font-bold text-xl">+</button>
                    </div>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-2 flex-grow border-t border-gray-700 pt-4">
                    {(exerciseData.series || []).map((serie, index) => (
                        <div key={index}>
                             <label className="block text-xs font-medium text-gray-400 mb-1">Nota Serie {index + 1} (Opcional)</label>
                             <input 
                                 type="text" 
                                 value={serie.note} 
                                 onChange={(e) => handleNoteChange(index, e.target.value)} 
                                 placeholder="Ej: 80% PR, Dropset, al fallo..." 
                                 className="w-full bg-gray-600 p-2 rounded-md text-sm" 
                             />
                        </div>
                    ))}
                </div>

                <button onClick={onSave} className="w-full bg-violet-500 hover:bg-violet-600 text-white font-bold py-2 px-4 rounded-lg mt-auto">Guardar</button>
            </div>
        </Modal>
    );
};

export default RoutineManagement;