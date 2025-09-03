import React, { useState, useEffect, useRef } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, onSnapshot, query, getDocs, writeBatch, doc } from 'firebase/firestore';
import { auth, db, appId } from './firebase/config';
import { AppContext } from './context/AppContext';

// Importar Módulos
import Login from './modules/Login';
import Training from './modules/Training';
import PRTracker from './modules/PRTracker';
import MyBody from './modules/MyBody';
import RoutineManagement from './modules/RoutineManagement';
import DataManagement from './modules/DataManagement';
import PRsTable from './modules/PRsTable'; // Importación del nuevo módulo

// Importar Componentes de UI
import SidePanel from './components/SidePanel';
import { Dumbbell, BarChart, Body, BookOpen, Database, ChevronDown, LayoutDashboard, SlidersHorizontal, Menu, Table } from './components/Icons'; // Icono de tabla añadido

export default function App() {
  const [mainView, setMainView] = useState('dashboards');
  const [dashboardView, setDashboardView] = useState('training');
  const [dataView, setDataView] = useState('routines');
  const [tableView, setTableView] = useState('prs_table'); // Estado para la nueva vista de tabla
  const [user, setUser] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  
  const [exercises, setExercises] = useState([]);
  const [muscleGroups, setMuscleGroups] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [isMenuOpen, setMenuOpen] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const menuRef = useRef(null);

  // Efecto para escuchar cambios en la autenticación y crear datos para nuevos usuarios
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const routinesCollectionRef = collection(db, `/artifacts/${appId}/users/${user.uid}/routines`);
        const routinesSnapshot = await getDocs(routinesCollectionRef);

        if (routinesSnapshot.empty) {
          console.log("Usuario nuevo detectado. Creando datos de ejemplo...");
          await seedInitialData(user.uid);
        }
        setUser(user);
      } else {
        setUser(null);
      }
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Efecto para cargar los datos del usuario cuando inicie sesión
  useEffect(() => {
    if (!user) {
      setExercises([]);
      setMuscleGroups([]);
      setSubcategories([]);
      return;
    }

    const exercisesQuery = query(collection(db, `/artifacts/${appId}/users/${user.uid}/exercises`));
    const musclesQuery = query(collection(db, `/artifacts/${appId}/users/${user.uid}/muscleGroups`));
    const subcategoriesQuery = query(collection(db, `/artifacts/${appId}/users/${user.uid}/subcategories`));

    const unsubExercises = onSnapshot(exercisesQuery, (snap) => {
      setExercises(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubMuscles = onSnapshot(musclesQuery, (snap) => {
      setMuscleGroups(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubSubcategories = onSnapshot(subcategoriesQuery, (snap) => {
      setSubcategories(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubExercises();
      unsubMuscles();
      unsubSubcategories();
    };
  }, [user]);

  // Función para crear los datos iniciales para un nuevo usuario
  const seedInitialData = async (userId) => {
    const batch = writeBatch(db);

    const pechoRef = doc(collection(db, `/artifacts/${appId}/users/${userId}/muscleGroups`));
    batch.set(pechoRef, { name: "Pecho", color: "#ef4444" });
    const espaldaRef = doc(collection(db, `/artifacts/${appId}/users/${userId}/muscleGroups`));
    batch.set(espaldaRef, { name: "Espalda", color: "#3b82f6" });
    const piernasRef = doc(collection(db, `/artifacts/${appId}/users/${userId}/muscleGroups`));
    batch.set(piernasRef, { name: "Piernas", color: "#22c55e" });

    const pressBancaRef = doc(collection(db, `/artifacts/${appId}/users/${userId}/exercises`));
    batch.set(pressBancaRef, { name: "Press Banca", muscleGroupId: pechoRef.id, goal: 100, goalReps: 1, notes: "Barra olímpica (20kg)" });
    const sentadillaRef = doc(collection(db, `/artifacts/${appId}/users/${userId}/exercises`));
    batch.set(sentadillaRef, { name: "Sentadilla", muscleGroupId: piernasRef.id, goal: 120, goalReps: 1, notes: "Barra olímpica (20kg)" });

    const routineRef = doc(collection(db, `/artifacts/${appId}/users/${userId}/routines`));
    batch.set(routineRef, { name: "Rutina de Ejemplo", isActive: true, notes: "Rutina inicial de 3 días" });

    const day1Ref = doc(collection(db, `/artifacts/${appId}/users/${userId}/routines/${routineRef.id}/days`));
    batch.set(day1Ref, { name: "Día de Empuje", order: 1, progress: 0, exercises: [{ id: crypto.randomUUID(), name: "Press Banca", muscle: "Pecho", sets: 4, completed: false }] });
    const day2Ref = doc(collection(db, `/artifacts/${appId}/users/${userId}/routines/${routineRef.id}/days`));
    batch.set(day2Ref, { name: "Día de Pierna", order: 2, progress: 0, exercises: [{ id: crypto.randomUUID(), name: "Sentadilla", muscle: "Piernas", sets: 4, completed: false }] });

    try {
        await batch.commit();
        console.log("Datos de ejemplo creados exitosamente para el nuevo usuario.");
    } catch (error) {
        console.error("Error al crear datos de ejemplo:", error);
    }
  };
  
  // Efecto para cerrar el menú al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  if (!isAuthReady) {
    return (
      <div className="bg-gray-900 min-h-screen flex items-center justify-center text-white">
        <Dumbbell className="animate-spin h-10 w-10 text-cyan-500" />
        <p className="ml-4 text-lg">Verificando sesión...</p>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  const renderView = () => {
    if (mainView === 'dashboards') {
      switch (dashboardView) {
        case 'training': return <Training />;
        case 'prs': return <PRTracker />;
        case 'myBody': return <MyBody />;
        default: return <Training />;
      }
    }
    if (mainView === 'data') {
      switch (dataView) {
        case 'routines': return <RoutineManagement />;
        case 'exercises': return <DataManagement />;
        default: return <RoutineManagement />;
      }
    }
    if (mainView === 'tables') {
      switch (tableView) {
        case 'prs_table': return <PRsTable />;
        // Aquí se pueden añadir más vistas de tabla en el futuro
        default: return <PRsTable />;
      }
    }
  };

  const getTitle = () => {
    if (mainView === 'dashboards') return 'Dashboards';
    if (mainView === 'data') return 'Gestión de Datos';
    if (mainView === 'tables') return 'Tablas';
    return 'App';
  }

  return (
    <AppContext.Provider value={{ exercises, muscleGroups, subcategories, userId: user.uid, db, appId, auth, user }}>
      <div className="bg-gray-900 min-h-screen font-sans text-gray-300">
        <SidePanel 
            isOpen={isPanelOpen} 
            onClose={() => setIsPanelOpen(false)} 
            onLogout={handleLogout} 
            setMainView={setMainView}
            setTableView={setTableView}
        />
        <div className="container mx-auto max-w-7xl">
          <header className="p-4 flex justify-between items-center sticky top-0 bg-gray-900 bg-opacity-80 backdrop-blur-sm z-30 gap-4">
            <button onClick={() => setIsPanelOpen(true)} className="p-2 rounded-full hover:bg-gray-700">
                <Menu className="w-6 h-6 text-white" />
            </button>
            <div className="flex-grow max-w-lg bg-gray-800 p-2 rounded-xl shadow-lg">
              <div className="relative" ref={menuRef}>
                <button onClick={() => setMenuOpen(!isMenuOpen)} className="w-full bg-gray-700 p-2 rounded-lg flex justify-between items-center text-lg font-bold">
                  <span>{getTitle()}</span>
                  <ChevronDown className={`w-6 h-6 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} />
                </button>
                {isMenuOpen && (
                  <div className="absolute top-full mt-2 w-full bg-gray-700 border border-gray-600 rounded-lg z-20 shadow-lg">
                    <div onClick={() => { setMainView('dashboards'); setMenuOpen(false); }} className="p-3 hover:bg-gray-600 cursor-pointer flex items-center"><LayoutDashboard className="w-5 h-5 mr-3 text-cyan-400" />Dashboards</div>
                    <div onClick={() => { setMainView('data'); setMenuOpen(false); }} className="p-3 hover:bg-gray-600 cursor-pointer flex items-center"><SlidersHorizontal className="w-5 h-5 mr-3 text-green-400" />Gestión de Datos</div>
                    <div onClick={() => { setMainView('tables'); setMenuOpen(false); }} className="p-3 hover:bg-gray-600 cursor-pointer flex items-center"><Table className="w-5 h-5 mr-3 text-amber-400" />Tablas</div>
                  </div>
                )}
              </div>
              <div className="flex space-x-1 mt-2">
                {mainView === 'dashboards' && (
                  <>
                    <button onClick={() => setDashboardView('training')} className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center transition-colors ${dashboardView === 'training' ? 'bg-cyan-500 text-white' : 'text-gray-300 hover:bg-gray-700'}`}>
                        <Dumbbell className="w-5 h-5 sm:mr-2" />
                        <span className="hidden sm:inline">Entrenamiento</span>
                    </button>
                    <button onClick={() => setDashboardView('prs')} className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center transition-colors ${dashboardView === 'prs' ? 'bg-violet-500 text-white' : 'text-gray-300 hover:bg-gray-700'}`}>
                        <BarChart className="w-5 h-5 sm:mr-2" />
                        <span className="hidden sm:inline">Récords</span>
                    </button>
                    <button onClick={() => setDashboardView('myBody')} className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center transition-colors ${dashboardView === 'myBody' ? 'bg-emerald-500 text-white' : 'text-gray-300 hover:bg-gray-700'}`}>
                        <Body className="w-5 h-5 sm:mr-2" />
                        <span className="hidden sm:inline">Cuerpo</span>
                    </button>
                  </>
                )}
                {mainView === 'data' && (
                  <>
                    <button onClick={() => setDataView('routines')} className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center transition-colors ${dataView === 'routines' ? 'bg-green-500 text-white' : 'text-gray-300 hover:bg-gray-700'}`}>
                        <BookOpen className="w-5 h-5 sm:mr-2" />
                        <span className="hidden sm:inline">Mis Rutinas</span>
                    </button>
                    <button onClick={() => setDataView('exercises')} className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center transition-colors ${dataView === 'exercises' ? 'bg-green-500 text-white' : 'text-gray-300 hover:bg-gray-700'}`}>
                        <Database className="w-5 h-5 sm:mr-2" />
                        <span className="hidden sm:inline">Ejercicios</span>
                    </button>
                  </>
                )}
                 {mainView === 'tables' && (
                  <>
                    <button onClick={() => setTableView('prs_table')} className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center transition-colors ${tableView === 'prs_table' ? 'bg-amber-500 text-white' : 'text-gray-300 hover:bg-gray-700'}`}>
                        <BarChart className="w-5 h-5 sm:mr-2" />
                        <span className="hidden sm:inline">Tabla de PRs</span>
                    </button>
                    {/* Espacio para el botón de la segunda tabla */}
                  </>
                )}
              </div>
            </div>
            <div className="w-10 h-10"></div> {/* Espaciador invisible para centrar el menú principal */}
          </header>
          <main className="animate-fade-in">{renderView()}</main>
        </div>
        <style>{`
          .animate-fade-in { animation: fadeIn 0.5s ease-in-out; }
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
          .animate-scale-in { animation: scaleIn 0.3s ease-out; }
          @keyframes scaleIn { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        `}</style>
      </div>
    </AppContext.Provider>
  );
}