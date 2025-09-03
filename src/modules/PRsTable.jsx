import React, { useState, useEffect, useMemo, useContext } from 'react';
import { collection, onSnapshot, query, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { AppContext } from '../context/AppContext';
import MultiSelectPopover from '../components/MultiSelectPopover';
import CustomSelect from '../components/CustomSelect';
import Modal from '../components/Modal';
import { Pencil, Trash2, X, Search, Calendar, ChevronDown, ChevronUp, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from '../components/Icons';
import ConfirmationModal from '../components/ConfirmationModal';

// --- Componente de Edición en Modal ---
const EditRecordModal = ({ isOpen, onClose, record, onSave }) => {
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
        <Modal isOpen={isOpen} onClose={onClose} title="Editar Récord Personal">
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Ejercicio</label>
                    <input type="text" value={editingRecord.exerciseName} readOnly className="w-full bg-gray-600 p-3 rounded-lg border border-gray-500 text-gray-300 cursor-not-allowed"/>
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Fecha</label>
                    <input type="date" value={editingRecord.date} onChange={e => setEditingRecord({...editingRecord, date: e.target.value})} className="w-full bg-gray-700 p-3 rounded-lg border border-gray-600"/>
                </div>
                <div className="flex gap-4">
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-400 mb-1">Peso (kg)</label>
                        <input type="number" value={editingRecord.weight} onChange={e => setEditingRecord({...editingRecord, weight: e.target.value})} className="w-full bg-gray-700 p-3 rounded-lg border border-gray-600"/>
                    </div>
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-400 mb-1">Reps</label>
                        <input type="number" value={editingRecord.reps} onChange={e => setEditingRecord({...editingRecord, reps: e.target.value})} className="w-full bg-gray-700 p-3 rounded-lg border border-gray-600"/>
                    </div>
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Nota (Opcional)</label>
                    <textarea value={editingRecord.note || ''} onChange={e => setEditingRecord({...editingRecord, note: e.target.value})} className="w-full bg-gray-700 p-3 rounded-lg border border-gray-600 h-24"/>
                </div>
                <button onClick={handleSave} className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-lg transition-colors">Guardar Cambios</button>
            </div>
        </Modal>
    );
};

// --- Componente de Paginación ---
const Pagination = ({ currentPage, totalPages, onPageChange, itemsPerPage, setItemsPerPage, totalItems }) => {
    const pageNumbers = [];
    const maxPagesToShow = 3; // Muestra la página actual, una anterior y una siguiente
    
    if (totalPages <= maxPagesToShow + 2) { // Si no hay suficientes páginas para necesitar "..."
        for (let i = 1; i <= totalPages; i++) {
            pageNumbers.push(i);
        }
    } else {
        let startPage = Math.max(2, currentPage - 1);
        let endPage = Math.min(totalPages - 1, currentPage + 1);

        pageNumbers.push(1);
        if (startPage > 2) {
            pageNumbers.push('...');
        }
        
        for (let i = startPage; i <= endPage; i++) {
            pageNumbers.push(i);
        }
        
        if (endPage < totalPages - 1) {
            pageNumbers.push('...');
        }
        pageNumbers.push(totalPages);
    }
    
    if (totalPages === 0) return null;

    const startItem = Math.min((currentPage - 1) * itemsPerPage + 1, totalItems);
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);

    return (
        <div className="flex flex-col md:flex-row items-center justify-between p-4 bg-gray-900/50 border-t border-gray-700">
            <div className="flex items-center gap-2 text-sm text-gray-400 mb-4 md:mb-0">
                <span>Mostrar</span>
                <select value={itemsPerPage} onChange={(e) => setItemsPerPage(Number(e.target.value))} className="bg-gray-700 text-white rounded-md p-1 border border-gray-600 focus:ring-2 focus:ring-cyan-500 focus:outline-none">
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                </select>
                <span>de {totalItems} registros</span>
            </div>
            <div className="flex items-center gap-1">
                 <button onClick={() => onPageChange(1)} disabled={currentPage === 1} className="p-2 rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"><ChevronsLeft className="w-5 h-5"/></button>
                 <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1} className="p-2 rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"><ChevronLeft className="w-5 h-5"/></button>
                 {pageNumbers.map((num, index) => (
                    <React.Fragment key={index}>
                    {num === '...' ? (
                        <span className="px-2 py-2 text-gray-500">...</span>
                    ) : (
                        <button onClick={() => onPageChange(num)} className={`px-4 py-2 rounded-md text-sm font-bold ${currentPage === num ? 'bg-cyan-600 text-white' : 'hover:bg-gray-700'}`}>{num}</button>
                    )}
                    </React.Fragment>
                ))}
                 <button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages} className="p-2 rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"><ChevronRight className="w-5 h-5"/></button>
                 <button onClick={() => onPageChange(totalPages)} disabled={currentPage === totalPages} className="p-2 rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"><ChevronsRight className="w-5 h-5"/></button>
            </div>
        </div>
    );
};


const PRsTable = () => {
    const { exercises, muscleGroups, subcategories, userId, db, appId } = useContext(AppContext);
    const [allPrs, setAllPrs] = useState([]);
    const [recordToEdit, setRecordToEdit] = useState(null);
    const [confirmAction, setConfirmAction] = useState(null);

    const [searchTerm, setSearchTerm] = useState('');
    const [muscleFilters, setMuscleFilters] = useState([]);
    const [subcategoryFilters, setSubcategoryFilters] = useState([]);
    const [dateFilters, setDateFilters] = useState({ start: '', end: '' });
    const [numericFilter, setNumericFilter] = useState({ metric: 'e1rm', comparator: 'gte', value: '' });
    const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });
    
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    useEffect(() => {
        if (!userId || !db) return;
        const prsQuery = query(collection(db, `/artifacts/${appId}/users/${userId}/personalRecords`));
        const unsubscribe = onSnapshot(prsQuery, (snapshot) => {
            const prsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setAllPrs(prsData);
        });
        return () => unsubscribe();
    }, [userId, db, appId]);

    const processedData = useMemo(() => {
        if (exercises.length === 0) return [];

        let filteredPrs = allPrs.map(pr => {
            const exercise = exercises.find(ex => ex.id === pr.exerciseId);
            if (!exercise) return null;
            const muscleGroup = muscleGroups.find(mg => mg.id === exercise.muscleGroupId);
            return { ...pr, exerciseName: exercise.name, muscleGroupId: exercise.muscleGroupId, muscleGroupName: muscleGroup?.name || 'N/A', subcategoryIds: exercise.subcategoryIds || [] };
        }).filter(Boolean);

        if (searchTerm) {
            filteredPrs = filteredPrs.filter(pr => pr.exerciseName.toLowerCase().includes(searchTerm.toLowerCase()));
        }
        if (muscleFilters.length > 0) {
            filteredPrs = filteredPrs.filter(pr => muscleFilters.includes(pr.muscleGroupId));
        }
        if (subcategoryFilters.length > 0) {
            filteredPrs = filteredPrs.filter(pr => pr.subcategoryIds.some(subId => subcategoryFilters.includes(subId)));
        }
        if (dateFilters.start) {
            filteredPrs = filteredPrs.filter(pr => pr.date >= dateFilters.start);
        }
        if (dateFilters.end) {
            filteredPrs = filteredPrs.filter(pr => pr.date <= dateFilters.end);
        }
        if (numericFilter.value) {
            const filterValue = parseFloat(numericFilter.value);
            if (!isNaN(filterValue)) {
                filteredPrs = filteredPrs.filter(pr => {
                    const metricValue = pr[numericFilter.metric];
                    if (numericFilter.comparator === 'gte') return metricValue >= filterValue;
                    if (numericFilter.comparator === 'lte') return metricValue <= filterValue;
                    return true;
                });
            }
        }

        filteredPrs.sort((a, b) => {
            let aValue = a[sortConfig.key];
            let bValue = b[sortConfig.key];
            if (sortConfig.key === 'date') {
                aValue = new Date(a.date).getTime();
                bValue = new Date(b.date).getTime();
            } else if (typeof aValue === 'string') {
                return aValue.localeCompare(bValue) * (sortConfig.direction === 'asc' ? 1 : -1);
            }
            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });

        return filteredPrs;
    }, [allPrs, exercises, muscleGroups, searchTerm, muscleFilters, subcategoryFilters, dateFilters, numericFilter, sortConfig]);

    const paginatedData = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return processedData.slice(startIndex, startIndex + itemsPerPage);
    }, [processedData, currentPage, itemsPerPage]);

    const totalPages = Math.ceil(processedData.length / itemsPerPage);

    // CORRECCIÓN: Resetear a la página 1 cuando cambian los filtros
    useEffect(() => {
        if (currentPage !== 1) {
            setCurrentPage(1);
        }
    }, [processedData.length, itemsPerPage]);


    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
        setSortConfig({ key, direction });
    };
    
    const handleUpdateRecord = async (updatedRecord) => {
        const { id, date, weight, reps, note } = updatedRecord;
        const weightNum = parseFloat(weight);
        const repsNum = parseInt(reps);
        if (isNaN(weightNum) || isNaN(repsNum)) return;
        const e1rm = repsNum === 1 ? weightNum : weightNum * (1 + repsNum / 30);
        const volume = weightNum * repsNum;
        const recordRef = doc(db, `/artifacts/${appId}/users/${userId}/personalRecords`, id);
        await updateDoc(recordRef, { date, weight: weightNum, reps: repsNum, e1rm: parseFloat(e1rm.toFixed(2)), volume: parseFloat(volume.toFixed(2)), note: note || "" });
        setRecordToEdit(null);
    };

    const handleDeleteRecord = async (recordId) => {
        await deleteDoc(doc(db, `/artifacts/${appId}/users/${userId}/personalRecords`, recordId));
        setConfirmAction(null);
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

    const activeFilterCount = [searchTerm, muscleFilters, subcategoryFilters, dateFilters.start, dateFilters.end, numericFilter.value]
        .filter(f => f && (!Array.isArray(f) || f.length > 0)).length;

    const clearAllFilters = () => {
        setSearchTerm('');
        setMuscleFilters([]);
        setSubcategoryFilters([]);
        setDateFilters({ start: '', end: '' });
        setNumericFilter({ metric: 'e1rm', comparator: 'gte', value: '' });
    };

    return (
        <div className="p-4 md:p-6">
            <h2 className="text-2xl font-bold text-white mb-6">Tabla Maestra de PRs</h2>
            <div className="bg-gray-800 p-4 rounded-xl mb-6 shadow-lg border border-gray-700">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    <div className="relative xl:col-span-2">
                         <label className="block text-sm font-medium text-gray-300 mb-1">Buscar Ejercicio</label>
                        <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Nombre del ejercicio..." className="w-full bg-gray-700 p-3 pl-10 rounded-lg border border-gray-600"/>
                        <Search className="absolute left-3 bottom-3 w-5 h-5 text-gray-400" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Músculo</label>
                        <MultiSelectPopover options={muscleGroups.map(g => ({value: g.id, label: g.name}))} selected={muscleFilters} onChange={setMuscleFilters} title="Seleccionar..."/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Subcategoría</label>
                        <MultiSelectPopover options={subcategories.map(s => ({value: s.id, label: s.name}))} selected={subcategoryFilters} onChange={setSubcategoryFilters} title="Seleccionar..."/>
                    </div>
                    <div className="flex flex-col md:col-span-2 xl:col-span-2">
                        <label className="block text-sm font-medium text-gray-300 mb-1">Rango de Fechas</label>
                        <div className="flex items-center gap-2 bg-gray-700 p-2 rounded-lg border border-gray-600">
                            <Calendar className="w-5 h-5 text-gray-400 flex-shrink-0 ml-1" />
                            <input type="date" value={dateFilters.start} onChange={e => setDateFilters({...dateFilters, start: e.target.value})} className="bg-transparent w-full text-sm outline-none"/>
                            <span className="text-gray-400">-</span>
                            <input type="date" value={dateFilters.end} onChange={e => setDateFilters({...dateFilters, end: e.target.value})} className="bg-transparent w-full text-sm outline-none"/>
                            {(dateFilters.start || dateFilters.end) && <button onClick={() => setDateFilters({start: '', end: ''})}><X className="w-4 h-4 text-gray-400 hover:text-white"/></button>}
                        </div>
                    </div>
                    <div className="md:col-span-2 xl:col-span-2">
                         <label className="block text-sm font-medium text-gray-300 mb-1">Filtro Numérico (kg)</label>
                         <div className="flex items-center gap-2">
                            <div className="w-32 flex-shrink-0"><CustomSelect options={[{value: 'e1rm', label: 'e1RM'}, {value: 'weight', label: 'Peso'}]} value={numericFilter.metric} onChange={val => setNumericFilter(prev => ({ ...prev, metric: val }))} /></div>
                            <div className="w-28 flex-shrink-0"><CustomSelect options={[{value: 'gte', label: '>='}, {value: 'lte', label: '<='}]} value={numericFilter.comparator} onChange={val => setNumericFilter(prev => ({ ...prev, comparator: val }))} /></div>
                            <input type="number" value={numericFilter.value} onChange={e => setNumericFilter(prev => ({ ...prev, value: e.target.value }))} placeholder="Valor" className="w-full bg-gray-700 p-3 rounded-lg border border-gray-600" />
                        </div>
                    </div>
                </div>
                {activeFilterCount > 0 && (
                    <div className="mt-4 text-center"><button onClick={clearAllFilters} className="text-sm text-cyan-400 hover:text-cyan-300">Limpiar {activeFilterCount} filtro(s)</button></div>
                )}
            </div>

            <div className="bg-gray-800 rounded-xl shadow-lg">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-700">
                        <thead className="bg-gray-900/50">
                            <tr>
                                <SortableHeader columnKey="date">Fecha</SortableHeader>
                                <SortableHeader columnKey="exerciseName">Ejercicio</SortableHeader>
                                <SortableHeader columnKey="muscleGroupName">Músculo</SortableHeader>
                                <SortableHeader columnKey="weight">Peso (kg)</SortableHeader>
                                <SortableHeader columnKey="reps">Reps</SortableHeader>
                                <SortableHeader columnKey="e1rm">e1RM (kg)</SortableHeader>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Notas</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="bg-gray-800 divide-y divide-gray-700">
                            {paginatedData.map(r => (
                                <tr key={r.id} className="hover:bg-gray-700/50">
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">{formatDate(r.date)}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-white font-semibold">{r.exerciseName}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-400">{r.muscleGroupName}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-white">{r.weight}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-white">{r.reps}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-cyan-400 font-bold">{r.e1rm.toFixed(1)}</td>
                                    <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate" title={r.note}>{r.note || '-'}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium flex gap-2">
                                        <button onClick={() => setRecordToEdit(r)} className="p-1 text-blue-400 hover:text-blue-300"><Pencil className="w-5 h-5" /></button>
                                        <button onClick={() => setConfirmAction(() => () => handleDeleteRecord(r.id))} className="p-1 text-red-500 hover:text-red-400"><Trash2 className="w-5 h-5" /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                 {processedData.length === 0 && <p className="text-center py-8 text-gray-500">No se encontraron récords con los filtros aplicados.</p>}
                 {totalPages > 0 && (
                    <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} itemsPerPage={itemsPerPage} setItemsPerPage={setItemsPerPage} totalItems={processedData.length}/>
                 )}
            </div>
            
            {recordToEdit && <EditRecordModal isOpen={!!recordToEdit} onClose={() => setRecordToEdit(null)} record={recordToEdit} onSave={handleUpdateRecord}/>}
            <ConfirmationModal isOpen={!!confirmAction} onClose={() => setConfirmAction(null)} onConfirm={confirmAction} title="Confirmar Eliminación" message="¿Estás seguro de que quieres eliminar este récord? Esta acción no se puede deshacer." />
        </div>
    );
};

export default PRsTable;