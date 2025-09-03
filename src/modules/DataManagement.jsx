import React, { useState, useEffect, useMemo, useContext } from 'react';
import { collection, doc, onSnapshot, query, updateDoc, addDoc, deleteDoc } from 'firebase/firestore';
import { AppContext } from '../context/AppContext';
import Modal from '../components/Modal';
import ConfirmationModal from '../components/ConfirmationModal';
import CustomSelect from '../components/CustomSelect';
import MultiSelectPopover from '../components/MultiSelectPopover';
import { Pencil, Trash2, X, Search, Dumbbell, BookOpen, Database } from '../components/Icons';

const DataManagement = () => {
    const { exercises, muscleGroups, userId, db, appId, subcategories } = useContext(AppContext);
    const [view, setView] = useState('muscles'); // muscles, subcategories, exercises

    const [editingMuscle, setEditingMuscle] = useState(null);
    const [editingSubcategory, setEditingSubcategory] = useState(null);
    const [editingExercise, setEditingExercise] = useState(null);
    const [confirmAction, setConfirmAction] = useState(null);
    
    // Estados para filtros y búsquedas
    const [exerciseFilters, setExerciseFilters] = useState([]);
    const [exerciseSubcategoryFilters, setExerciseSubcategoryFilters] = useState([]);
    const [exerciseSort, setExerciseSort] = useState('name_asc');
    const [muscleSearch, setMuscleSearch] = useState('');
    const [exerciseSearch, setExerciseSearch] = useState('');
    const [subcategorySearch, setSubcategorySearch] = useState('');
    const [subcategoryFilters, setSubcategoryFilters] = useState([]);

    const filteredMuscleGroups = useMemo(() => {
        return muscleGroups.filter(mg => mg.name.toLowerCase().includes(muscleSearch.toLowerCase()));
    }, [muscleGroups, muscleSearch]);

    const filteredSubcategories = useMemo(() => {
        let results = subcategories;
        if (subcategorySearch) {
            results = results.filter(sc => sc.name.toLowerCase().includes(subcategorySearch.toLowerCase()));
        }
        if (subcategoryFilters.length > 0) {
            results = results.filter(sc => subcategoryFilters.includes(sc.muscleGroupId));
        }
        return results;
    }, [subcategories, subcategorySearch, subcategoryFilters]);

    const processedExercises = useMemo(() => {
        let filteredBySearch = exercises.filter(ex => ex.name.toLowerCase().includes(exerciseSearch.toLowerCase()));
        
        let filteredByGroup = exerciseFilters.length === 0 
            ? filteredBySearch 
            : filteredBySearch.filter(ex => exerciseFilters.includes(ex.muscleGroupId));

        let filteredBySubcategory = exerciseSubcategoryFilters.length === 0
            ? filteredByGroup
            : filteredByGroup.filter(ex => ex.subcategoryIds && ex.subcategoryIds.some(subId => exerciseSubcategoryFilters.includes(subId)));

        return [...filteredBySubcategory].sort((a, b) => {
            if (exerciseSort === 'name_asc') return a.name.localeCompare(b.name);
            if (exerciseSort === 'name_desc') return b.name.localeCompare(a.name);
            return 0;
        });
    }, [exercises, exerciseFilters, exerciseSubcategoryFilters, exerciseSort, exerciseSearch]);

    const handleAddOrUpdateMuscle = async () => {
        const muscleData = editingMuscle;
        if (!muscleData || muscleData.name.trim() === '') return;
        const collectionPath = `/artifacts/${appId}/users/${userId}/muscleGroups`;
        if (muscleData.id) { await updateDoc(doc(db, collectionPath, muscleData.id), muscleData); }
        else { await addDoc(collection(db, collectionPath), { name: muscleData.name, color: muscleData.color }); }
        setEditingMuscle(null);
    };

    const handleAddOrUpdateSubcategory = async () => {
        const subcatData = editingSubcategory;
        if (!subcatData || !subcatData.name.trim() || !subcatData.muscleGroupId) return;
        const collectionPath = `/artifacts/${appId}/users/${userId}/subcategories`;
        const data = { name: subcatData.name, muscleGroupId: subcatData.muscleGroupId };
        if (subcatData.id) { await updateDoc(doc(db, collectionPath, subcatData.id), data); }
        else { await addDoc(collection(db, collectionPath), data); }
        setEditingSubcategory(null);
    };

    const handleAddOrUpdateExercise = async () => {
        const exerciseData = editingExercise;
        if (!exerciseData || exerciseData.name.trim() === '' || !exerciseData.muscleGroupId) return;
        const collectionPath = `/artifacts/${appId}/users/${userId}/exercises`;
        const data = {
            name: exerciseData.name,
            muscleGroupId: exerciseData.muscleGroupId,
            subcategoryIds: exerciseData.subcategoryIds || [],
            goal: parseFloat(exerciseData.goal) || 0,
            goalReps: parseInt(exerciseData.goalReps) || 1,
            notes: exerciseData.notes || ''
        };
        if (exerciseData.id) { await updateDoc(doc(db, collectionPath, exerciseData.id), data); }
        else { await addDoc(collection(db, collectionPath), data); }
        setEditingExercise(null);
    };

    const handleDelete = (action) => setConfirmAction(() => action);

    const renderContent = () => {
        switch(view) {
            case 'muscles':
                return (
                    <div className="bg-gray-800 p-5 rounded-xl flex flex-col h-full">
                        <div className="flex justify-between items-center mb-2 flex-shrink-0">
                            <h3 className="text-xl font-bold text-white">Zonas Musculares</h3>
                            <button onClick={() => setEditingMuscle({ name: '', color: '#ffffff' })} className="bg-green-600 hover:bg-green-500 text-white font-bold py-1 px-3 rounded-lg text-sm">Añadir</button>
                        </div>
                        <div className="flex flex-col flex-grow min-h-0">
                            <div className="relative mb-4 flex-shrink-0">
                                <input type="text" value={muscleSearch} onChange={e => setMuscleSearch(e.target.value)} placeholder="Buscar músculo..." className="w-full bg-gray-700 p-2 pl-10 rounded-lg" />
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            </div>
                            <div className="space-y-2 overflow-y-auto flex-grow pr-2">
                                {filteredMuscleGroups.map(mg => (
                                    <div key={mg.id} className="flex justify-between items-center bg-gray-700 p-3 rounded-lg">
                                        <div className="flex items-center"><div className="w-5 h-5 rounded-full mr-3" style={{ backgroundColor: mg.color }}></div><span className="font-semibold">{mg.name}</span></div>
                                        <div className="flex items-center"><button onClick={() => setEditingMuscle(mg)} className="text-gray-400 hover:text-white p-1"><Pencil className="w-4 h-4" /></button><button onClick={() => handleDelete(async () => { await deleteDoc(doc(db, `/artifacts/${appId}/users/${userId}/muscleGroups`, mg.id)); setConfirmAction(null); })} className="text-red-500 hover:text-red-400 p-1"><Trash2 className="w-4 h-4" /></button></div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                );
            case 'subcategories':
                return (
                     <div className="bg-gray-800 p-5 rounded-xl flex flex-col h-full">
                        <div className="flex justify-between items-center mb-4 flex-shrink-0">
                            <h3 className="text-xl font-bold text-white">Subcategorías</h3>
                            <button onClick={() => setEditingSubcategory({ name: '', muscleGroupId: '' })} className="bg-green-600 hover:bg-green-500 text-white font-bold py-1 px-3 rounded-lg text-sm">Añadir</button>
                        </div>
                        <div className="flex flex-col flex-grow min-h-0">
                            <div className="flex-shrink-0">
                                <div className="relative mb-2">
                                    <input type="text" value={subcategorySearch} onChange={e => setSubcategorySearch(e.target.value)} placeholder="Buscar subcategoría..." className="w-full bg-gray-700 p-2 pl-10 rounded-lg" />
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                </div>
                                <div className="mb-4">
                                    <MultiSelectPopover
                                        options={muscleGroups.map(g => ({ value: g.id, label: g.name }))}
                                        selected={subcategoryFilters}
                                        onChange={setSubcategoryFilters}
                                        title="Filtrar por músculo..."
                                    />
                                </div>
                            </div>
                            <div className="space-y-4 overflow-y-auto flex-grow pr-2">
                                {muscleGroups.map(mg => {
                                    const relatedSubcategories = filteredSubcategories.filter(sc => sc.muscleGroupId === mg.id);
                                    if (relatedSubcategories.length === 0) return null;
                                    return (
                                        <div key={mg.id} className="bg-gray-900/50 p-3 rounded-lg border-l-4" style={{ borderColor: mg.color }}>
                                            <h4 className="font-bold text-md mb-2" style={{ color: mg.color }}>{mg.name}</h4>
                                            <div className="space-y-2">
                                                {relatedSubcategories.map(sc => (
                                                    <div key={sc.id} className="flex justify-between items-center bg-gray-700/80 p-2 rounded-md">
                                                        <span className="font-semibold text-sm">{sc.name}</span>
                                                        <div className="flex items-center">
                                                            <button onClick={() => setEditingSubcategory(sc)} className="text-gray-400 hover:text-white p-1"><Pencil className="w-4 h-4" /></button>
                                                            <button onClick={() => handleDelete(async () => { await deleteDoc(doc(db, `/artifacts/${appId}/users/${userId}/subcategories`, sc.id)); setConfirmAction(null); })} className="text-red-500 hover:text-red-400 p-1"><Trash2 className="w-4 h-4" /></button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                );
            case 'exercises':
                return (
                     <div className="bg-gray-800 p-5 rounded-xl flex flex-col h-full">
                        <div className="flex justify-between items-center mb-4 flex-shrink-0">
                            <h3 className="text-xl font-bold text-white">Ejercicios</h3>
                            <button onClick={() => setEditingExercise({ name: '', muscleGroupId: '', subcategoryIds: [], goal: '', goalReps: '', notes: '' })} className="bg-green-600 hover:bg-green-500 text-white font-bold py-1 px-3 rounded-lg text-sm">Añadir</button>
                        </div>
                        <div className="flex flex-col flex-grow min-h-0">
                            <div className="flex-shrink-0">
                                <div className="relative mb-4">
                                    <input type="text" value={exerciseSearch} onChange={e => setExerciseSearch(e.target.value)} placeholder="Buscar ejercicio..." className="w-full bg-gray-700 p-3 pl-10 rounded-lg" />
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                </div>
                                {/* CORREGIDO: Filtros ocultos en móvil (hidden md:grid) */}
                                <div className="hidden md:grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                    <MultiSelectPopover options={muscleGroups.map(g => ({ value: g.id, label: g.name }))} selected={exerciseFilters} onChange={setExerciseFilters} title="Filtrar por músculo..." />
                                    <MultiSelectPopover options={subcategories.map(s => ({ value: s.id, label: s.name }))} selected={exerciseSubcategoryFilters} onChange={setExerciseSubcategoryFilters} title="Filtrar por subcategoría..." />
                                    <CustomSelect options={[{ value: 'name_asc', label: 'Nombre (A-Z)' }, { value: 'name_desc', label: 'Nombre (Z-A)' }]} value={exerciseSort} onChange={setExerciseSort} placeholder="Ordenar..." />
                                </div>
                                
                                {/* CORREGIDO: Filtros activos ocultos en móvil (hidden md:flex) */}
                                {(exerciseFilters.length > 0 || exerciseSubcategoryFilters.length > 0) &&
                                    <div className="hidden md:flex flex-wrap gap-2 mb-4 items-center">
                                        <span className="text-sm text-gray-400">Filtros:</span>
                                        {exerciseFilters.map(f => <span key={f} className="bg-gray-600 text-white px-2 py-1 rounded-full text-xs flex items-center">{muscleGroups.find(mg => mg.id === f)?.name} <button onClick={() => setExerciseFilters(prev => prev.filter(i => i !== f))} className="ml-1 text-gray-400 hover:text-white"><X className="w-3 h-3" /></button></span>)}
                                        {exerciseSubcategoryFilters.map(f => <span key={f} className="bg-violet-800 text-white px-2 py-1 rounded-full text-xs flex items-center">{subcategories.find(sc => sc.id === f)?.name} <button onClick={() => setExerciseSubcategoryFilters(prev => prev.filter(i => i !== f))} className="ml-1 text-gray-400 hover:text-white"><X className="w-3 h-3" /></button></span>)}
                                        <button onClick={() => { setExerciseFilters([]); setExerciseSubcategoryFilters([]); }} className="text-xs text-cyan-400 hover:text-cyan-300">Limpiar</button>
                                    </div>
                                }
                            </div>
                            <div className="space-y-2 flex-grow overflow-y-auto pr-2">
                                {processedExercises.map(ex => {
                                    const muscle = muscleGroups.find(mg => mg.id === ex.muscleGroupId);
                                    const subcats = (ex.subcategoryIds || []).map(id => subcategories.find(sc => sc.id === id)?.name).filter(Boolean);
                                    return (
                                        <div key={ex.id} className="flex justify-between items-center bg-gray-700 p-3 rounded-lg">
                                            <div>
                                                <p className="font-semibold">{ex.name}</p>
                                                <p className="text-sm" style={{ color: muscle?.color || '#a0aec0' }}>{muscle?.name || 'Sin grupo'} {subcats.length > 0 && <span className="italic text-gray-400">({subcats.join(', ')})</span>}</p>
                                                {ex.goal > 0 && <p className="text-xs text-amber-400">Meta: {ex.goal}kg x {ex.goalReps || 1}</p>}
                                            </div>
                                            <div className="flex items-center">
                                                <button onClick={() => setEditingExercise(ex)} className="text-gray-400 hover:text-white p-1"><Pencil className="w-4 h-4" /></button>
                                                <button onClick={() => handleDelete(async () => { await deleteDoc(doc(db, `/artifacts/${appId}/users/${userId}/exercises`, ex.id)); setConfirmAction(null); })} className="text-red-500 hover:text-red-400 p-1"><Trash2 className="w-4 h-4" /></button>
                                            </div>
                                        </div>
                                    )
                                })}
                                {processedExercises.length === 0 && (
                                    <div className="text-center py-10 text-gray-500">
                                        <p>No se encontraron ejercicios con los filtros aplicados.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            default:
                return null;
        }
    }

    return (
        <div className="p-4 md:p-6 h-[calc(100vh-10rem)] flex flex-col">
            <div className="bg-gray-800 p-2 rounded-xl shadow-lg mb-6 flex-shrink-0">
                 <div className="flex space-x-1">
                    <button onClick={() => setView('muscles')} className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center transition-colors ${view === 'muscles' ? 'bg-green-500 text-white' : 'text-gray-300 hover:bg-gray-700'}`}>
                        <Dumbbell className="w-5 h-5 sm:mr-2" />
                        <span className="hidden sm:inline">Zonas Musculares</span>
                    </button>
                    <button onClick={() => setView('subcategories')} className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center transition-colors ${view === 'subcategories' ? 'bg-green-500 text-white' : 'text-gray-300 hover:bg-gray-700'}`}>
                        <BookOpen className="w-5 h-5 sm:mr-2" />
                        <span className="hidden sm:inline">Subcategorías</span>
                    </button>
                    <button onClick={() => setView('exercises')} className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center transition-colors ${view === 'exercises' ? 'bg-green-500 text-white' : 'text-gray-300 hover:bg-gray-700'}`}>
                        <Database className="w-5 h-5 sm:mr-2" />
                        <span className="hidden sm:inline">Ejercicios</span>
                    </button>
                </div>
            </div>
            
            <div className="flex-grow min-h-0">
                {renderContent()}
            </div>

            {/* Modals */}
            <Modal isOpen={!!editingMuscle} onClose={() => setEditingMuscle(null)} title={editingMuscle?.id ? "Editar Zona Muscular" : "Añadir Zona Muscular"}>
                <div className="space-y-4"><input type="text" value={editingMuscle?.name || ''} onChange={e => setEditingMuscle({ ...editingMuscle, name: e.target.value })} placeholder="Nombre del músculo" className="w-full bg-gray-700 p-3 rounded-lg" /><div className="flex items-center gap-4"><label>Color:</label><input type="color" value={editingMuscle?.color || '#ffffff'} onChange={e => setEditingMuscle({ ...editingMuscle, color: e.target.value })} className="w-16 h-10 p-1 bg-gray-700 rounded-lg" /></div><button onClick={handleAddOrUpdateMuscle} className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg">{editingMuscle?.id ? 'Guardar Cambios' : 'Añadir Músculo'}</button></div>
            </Modal>
            <Modal isOpen={!!editingSubcategory} onClose={() => setEditingSubcategory(null)} title={editingSubcategory?.id ? "Editar Subcategoría" : "Añadir Subcategoría"}>
                <div className="space-y-4 min-h-[250px] flex flex-col">
                    <input type="text" value={editingSubcategory?.name || ''} onChange={e => setEditingSubcategory({ ...editingSubcategory, name: e.target.value })} placeholder="Nombre de la subcategoría" className="w-full bg-gray-700 p-3 rounded-lg" />
                    <CustomSelect options={muscleGroups.map(mg => ({ value: mg.id, label: mg.name }))} value={editingSubcategory?.muscleGroupId || ''} onChange={val => setEditingSubcategory({ ...editingSubcategory, muscleGroupId: val })} placeholder="Seleccionar músculo principal..." />
                    <div className="flex-grow"></div>
                    <button onClick={handleAddOrUpdateSubcategory} className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg">{editingSubcategory?.id ? 'Guardar Cambios' : 'Añadir'}</button>
                </div>
            </Modal>
            <Modal isOpen={!!editingExercise} onClose={() => setEditingExercise(null)} title={editingExercise?.id ? "Editar Ejercicio" : "Añadir Ejercicio"}>
                <div className="space-y-4">
                    <input type="text" value={editingExercise?.name || ''} onChange={e => setEditingExercise({ ...editingExercise, name: e.target.value })} placeholder="Nombre del ejercicio" className="w-full bg-gray-700 p-3 rounded-lg" />
                    <CustomSelect options={muscleGroups.map(mg => ({ value: mg.id, label: mg.name }))} value={editingExercise?.muscleGroupId || ''} onChange={val => setEditingExercise({ ...editingExercise, muscleGroupId: val, subcategoryIds: [] })} placeholder="Seleccionar músculo principal..." />
                    {editingExercise?.muscleGroupId && (
                        <MultiSelectPopover
                            options={subcategories.filter(sc => sc.muscleGroupId === editingExercise.muscleGroupId).map(sc => ({ value: sc.id, label: sc.name }))}
                            selected={editingExercise?.subcategoryIds || []}
                            onChange={val => setEditingExercise({ ...editingExercise, subcategoryIds: val })}
                            title="Seleccionar subcategorías..." />
                    )}
                    <div className="flex gap-4">
                        <input type="number" value={editingExercise?.goal || ''} onChange={e => setEditingExercise({ ...editingExercise, goal: e.target.value })} placeholder="Meta de peso (kg)" className="w-full bg-gray-700 p-3 rounded-lg" />
                        <input type="number" value={editingExercise?.goalReps || ''} onChange={e => setEditingExercise({ ...editingExercise, goalReps: e.target.value })} placeholder="Reps" className="w-full bg-gray-700 p-3 rounded-lg" />
                    </div>
                    <textarea value={editingExercise?.notes || ''} onChange={e => setEditingExercise({ ...editingExercise, notes: e.target.value })} placeholder="Notas del ejercicio..." className="w-full bg-gray-700 p-3 rounded-lg h-24" />
                    <button onClick={handleAddOrUpdateExercise} className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg">{editingExercise?.id ? 'Guardar Cambios' : 'Añadir Ejercicio'}</button>
                </div>
            </Modal>
            <ConfirmationModal isOpen={!!confirmAction} onClose={() => setConfirmAction(null)} onConfirm={confirmAction} title="Confirmar Eliminación" message="¿Estás seguro? Esta acción no se puede deshacer." />
        </div>
    );
};

export default DataManagement;