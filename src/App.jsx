import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
Mic,
MicOff,
Sparkles,
CheckSquare,
Square,
Plus,
Trash2,
Calendar,
ChevronLeft,
ChevronRight,
Building,
Users,
RefreshCw,
Volume2,
Check,
X,
AlertCircle,
FileText,
Edit,
Copy,
ArrowRightLeft,
Layers,
Printer,
MoreVertical,
GripVertical,
LayoutGrid,
Columns3,
Table,
Filter,
CalendarDays,
CheckCircle2,
Clock,
AlertTriangle,
FileSpreadsheet,
History,
CalendarRange,
ArrowRight,
Tag,
LogOut,
ShieldCheck,
Mail,
Send,
Share2,
ExternalLink,
CheckCheck,
Wifi,
WifiOff,
CloudUpload,
NotebookPen,
Maximize2,
PenTool
} from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import { migrateLocalDataToFirestore, setUserContext, getCurrentUserId, forceCloudSync, subscribeToSharedGremios, createSharedGremio, deleteSharedGremio, subscribeToOfflineStatus, flushOfflineQueue, firestore, getNotas, saveNota, updateNota, deleteNota } from './services/db.js';
import { onAuthUserChange, logout, CORPORATE_DOMAIN } from './services/auth.js';
import { AuthView } from './components/AuthView.jsx';
import { NotasView } from './components/NotasView.jsx';
// EMBEDDED DATABASES ID
const DB_ID = '6a548f958d05750f33c2b531';
const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];
const GREMIOS_PREDEFINIDOS = [
  'ENUE',
  'Albañilería', 'Estructura', 'Pintura', 'Fontanería', 'Electricidad',
  'Pladur / Yeso', 'Climatización', 'Carpintería', 'Instalaciones',
  'Limpieza', 'Cerramientos', 'Jardinería / Exteriores', 'Otros'
];
const getGremioTagClasses = (gremio, completada = false) => {
  if (completada) return 'bg-slate-100 text-slate-400';
  const clasesPorGremio = {
    'ENUE': 'bg-amber-100 text-amber-900 border border-amber-300 font-bold',
    'Albañilería': 'bg-blue-100 text-blue-800',
    'Estructura': 'bg-violet-100 text-violet-800',
    'Pintura': 'bg-pink-100 text-pink-800',
    'Fontanería': 'bg-cyan-100 text-cyan-800',
    'Electricidad': 'bg-yellow-100 text-yellow-800',
    'Pladur / Yeso': 'bg-fuchsia-100 text-fuchsia-800',
    'Climatización': 'bg-indigo-100 text-indigo-800',
    'Carpintería': 'bg-orange-100 text-orange-800',
    'Instalaciones': 'bg-teal-100 text-teal-800',
    'Limpieza': 'bg-green-100 text-green-800',
    'Cerramientos': 'bg-red-100 text-red-800',
    'Jardinería / Exteriores': 'bg-lime-100 text-lime-800',
    'Otros': 'bg-slate-100 text-slate-700'
  };
  return clasesPorGremio[gremio] || 'bg-teal-50 text-teal-800 border border-teal-200 font-semibold';
};
// Helper to format ISO dates
const getMonday = (d) => {
  let date;
  if (!d) {
    date = new Date();
  } else if (typeof d === 'string') {
    const parts = d.split('-');
    if (parts.length === 3) {
      date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 12, 0, 0);
    } else {
      date = new Date(d);
    }
  } else if (d instanceof Date) {
    date = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0);
  } else {
    date = new Date(d);
  }
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
  date.setDate(diff);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const dayOfMonth = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${dayOfMonth}`;
};
const isTaskCompleted = (value) => {
  if (value === true) return true;
  if (typeof value === 'number') return value === 1;
  if (value === null || value === undefined) return false;
  const normalized = String(value).trim().toLowerCase();
  return ['1', 'true', 'sí', 'si', 'yes', 'completada', 'completado', 'completed', 'finalizada', 'finalizado', 'done'].includes(normalized);
};
const formatFriendlyDate = (dateStr) => {
  if (!dateStr) return '';
  const parts = String(dateStr).split('-');
  if (parts.length === 3) {
    const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 12, 0, 0);
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
  }
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
};
const getWeekdayDateLabel = (weekMonday, dayName) => {
const dayIndex = { 'Lunes': 0, 'Martes': 1, 'Miércoles': 2, 'Jueves': 3, 'Viernes': 4, 'Sábado': 5 }[dayName];
if (!weekMonday || dayIndex === undefined) return '';
const date = new Date(`${weekMonday}T12:00:00`);
date.setDate(date.getDate() + dayIndex);
return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
};

// Paleta unificada de colores por obra
const OBRA_COLOR_PALETTE = [
  { text: '#1d4ed8', border: '#2563eb', background: '#eff6ff', badge: 'bg-blue-100 text-blue-800 border-blue-200' },
  { text: '#6d28d9', border: '#7c3aed', background: '#f5f3ff', badge: 'bg-purple-100 text-purple-800 border-purple-200' },
  { text: '#15803d', border: '#16a34a', background: '#f0fdf4', badge: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  { text: '#c2410c', border: '#ea580c', background: '#fff7ed', badge: 'bg-orange-100 text-orange-800 border-orange-200' },
  { text: '#b91c1c', border: '#dc2626', background: '#fef2f2', badge: 'bg-rose-100 text-rose-800 border-rose-200' },
  { text: '#0f766e', border: '#0d9488', background: '#f0fdfa', badge: 'bg-teal-100 text-teal-800 border-teal-200' },
  { text: '#a16207', border: '#ca8a04', background: '#fefce8', badge: 'bg-amber-100 text-amber-800 border-amber-200' },
  { text: '#be185d', border: '#db2777', background: '#fdf2f8', badge: 'bg-pink-100 text-pink-800 border-pink-200' }
];

const getObraColor = (obraId, obrasList = []) => {
  const index = obrasList.findIndex(o => o[0] === obraId);
  if (index === -1) return OBRA_COLOR_PALETTE[0];
  return OBRA_COLOR_PALETTE[index % OBRA_COLOR_PALETTE.length];
};

const DIAS_SEMANA_OFFSET = {
  'Lunes': 0,
  'Martes': 1,
  'Miércoles': 2,
  'Jueves': 3,
  'Viernes': 4,
  'Sábado': 5,
  'Domingo': 6
};

// Calcula la fecha exacta ISO YYYY-MM-DD de una tarea
const getTaskExactDate = (task) => {
  if (!task || !task.fecha_semana) return null;
  const offset = DIAS_SEMANA_OFFSET[task.dia_semana] ?? 0;
  const parts = String(task.fecha_semana).split('-').map(Number);
  if (parts.length !== 3) return task.fecha_semana;
  const d = new Date(parts[0], parts[1] - 1, parts[2] + offset, 12, 0, 0);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// Obtiene la semana (Lunes) y día de la semana para una fecha ISO YYYY-MM-DD
const getDateDetails = (dateStr) => {
  if (!dateStr) return { targetMonday: '', targetDay: 'Lunes' };
  const parts = dateStr.split('-').map(Number);
  const d = new Date(parts[0], parts[1] - 1, parts[2], 12);
  const dayOfWeek = d.getDay(); // 0 Dom, 1 Lun, 2 Mar, 3 Mie, 4 Jue, 5 Vie, 6 Sab
  const monday = getMonday(d);
  const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  let targetDay = dayNames[dayOfWeek];
  let targetMonday = monday;
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    targetDay = 'Lunes';
    const nextMonDate = new Date(d);
    nextMonDate.setDate(d.getDate() + (dayOfWeek === 6 ? 2 : 1));
    targetMonday = getMonday(nextMonDate);
  }
  return { targetMonday, targetDay, d };
};

const DEFAULT_INCIDENT_TAGS = [
  'Falta de material',
  'Subcontrata no comparece',
  'Lluvia / Clima adverso',
  'Retraso gremio predecesor',
  'Modificación de proyecto',
  'Incidencia de seguridad',
  'Falta de permisos',
  'Prioridad cambiada'
];
const MOTIVOS_NO_EJECUCION = DEFAULT_INCIDENT_TAGS;

// Parser y Serializador para el Historial de Incidencias / Aplazamientos dentro de task.notas
const parseTaskNotas = (rawNotas) => {
  if (!rawNotas || typeof rawNotas !== 'string') {
    return { userNotas: '', aplazamientos: [] };
  }
  const match = rawNotas.match(/\[HISTORIAL_APLAZAMIENTOS:\s*(\[[\s\S]*?\])\s*\]/);
  if (!match) {
    return { userNotas: rawNotas.trim(), aplazamientos: [] };
  }
  try {
    const aplazamientos = JSON.parse(match[1]);
    const userNotas = rawNotas.replace(match[0], '').trim();
    return {
      userNotas,
      aplazamientos: Array.isArray(aplazamientos) ? aplazamientos : []
    };
  } catch (e) {
    return { userNotas: rawNotas.trim(), aplazamientos: [] };
  }
};

const serializeTaskNotas = (userNotas, aplazamientos = []) => {
  const cleanUserNotas = (userNotas || '').trim();
  if (!aplazamientos || aplazamientos.length === 0) {
    return cleanUserNotas;
  }
  const serializedHistory = `[HISTORIAL_APLAZAMIENTOS: ${JSON.stringify(aplazamientos)}]`;
  return cleanUserNotas ? `${cleanUserNotas}\n\n${serializedHistory}` : serializedHistory;
};

// Variable síncrona en memoria para asegurar la persistencia del objeto arrastrado en HTML5 DnD
let currentDraggedTask = null;

function App() {
const [currentUser, setCurrentUser] = useState(null);
const [authLoading, setAuthLoading] = useState(true);
const [isLoggingOut, setIsLoggingOut] = useState(false);
const [db] = useState(() => AiKit.db(DB_ID, { live: true }));
// State
const [obras, setObras] = useState([]);
const [tareas, setTareas] = useState([]);
const [todasLasTareas, setTodasLasTareas] = useState([]);
const [selectedObraId, setSelectedObraId] = useState('all');
const [currentWeekMonday, setCurrentWeekMonday] = useState(() => getMonday(new Date()));
// Vistas principales: 'semanal', 'mensual' o 'notas'
const [activeView, setActiveView] = useState('semanal');
const [notasList, setNotasList] = useState([]);
const pendingNotasCount = useMemo(() => {
  return notasList.filter(n => !n.completada).length;
}, [notasList]);
const [mobileSelectedDay, setMobileSelectedDay] = useState('all'); // 'all' o día específico en móvil/tablet
const [mobileReportTab, setMobileReportTab] = useState('preview'); // 'preview' | 'filters' en móvil
// Cuadrante Mensual: submodo 'matriz' o 'calendario'
const [monthlyQuadrantMode, setMonthlyQuadrantMode] = useState('matriz');
const [monthViewDate, setMonthViewDate] = useState(() => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1, 12);
});
const [monthlyFilterStatus, setMonthlyFilterStatus] = useState('all'); // 'all', 'pending', 'completed'
const [monthlyFilterGremio, setMonthlyFilterGremio] = useState('all');
// UI Helpers
const [error, setError] = useState(null);
const [successMessage, setSuccessMessage] = useState(null);
const [syncing, setSyncing] = useState(false);
const [taskLightboxImage, setTaskLightboxImage] = useState(null);
const [offlineStatus, setOfflineStatus] = useState({
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine !== false : true,
  pendingOfflineCount: 0,
  isFlushing: false
});
const [isDictatingModalOpen, setIsDictatingModalOpen] = useState(false);
const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
const [isNewObraModalOpen, setIsNewObraModalOpen] = useState(false);
const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
const [calendarViewDate, setCalendarViewDate] = useState(() => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1, 12);
});
// PDF printing state
const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
const [selectedPrintObraId, setSelectedPrintObraId] = useState('all');
const [printEncargado, setPrintEncargado] = useState('');
const [printInstructions, setPrintInstructions] = useState('');
const [printIncludeCompleted, setPrintIncludeCompleted] = useState('pending'); // 'all', 'pending', 'completed'
const [printHideEmptyDays, setPrintHideEmptyDays] = useState(true);
// Manual task form state
const [manualTask, setManualTask] = useState({
dia_semana: 'Lunes',
fecha_semana: '',
actividad: '',
gremio: 'ENUE',
obra_id: '',
notas: ''
});
const [customGremios, setCustomGremios] = useState([]);
const [isManageGremiosModalOpen, setIsManageGremiosModalOpen] = useState(false);
const [newGremioName, setNewGremioName] = useState('');
const [gremioTargetContext, setGremioTargetContext] = useState(null); // 'manual' | 'edit'

const allGremios = useMemo(() => {
  const customNames = (customGremios || []).map(cg => typeof cg === 'string' ? cg : cg.nombre).filter(Boolean);
  const set = new Set([...GREMIOS_PREDEFINIDOS, ...customNames]);
  return Array.from(set);
}, [customGremios]);
const [editingTask, setEditingTask] = useState(null);
const [moveTask, setMoveTask] = useState(null);
const [moveTargetWeek, setMoveTargetWeek] = useState(currentWeekMonday);
const [moveTargetDay, setMoveTargetDay] = useState('Lunes');
const [copyingTask, setCopyingTask] = useState(null);
const [copyTargetWeek, setCopyTargetWeek] = useState(currentWeekMonday);
const [targetCopyDay, setTargetCopyDay] = useState('Lunes');
const [draggedTask, setDraggedTask] = useState(null);
const [dragOverDay, setDragOverDay] = useState(null);
const [dragOverCell, setDragOverCell] = useState(null);
const [dragOverCalendarDate, setDragOverCalendarDate] = useState(null);
const [openTaskMenuId, setOpenTaskMenuId] = useState(null);
// State for Postponing / Incident Registration (No ejecutada)
const [isPostponeModalOpen, setIsPostponeModalOpen] = useState(false);
const [postponeTask, setPostponeTask] = useState(null);
const [postponeObservaciones, setPostponeObservaciones] = useState('');
const [postponeSelectedTags, setPostponeSelectedTags] = useState([]);
const [postponeCustomTagInput, setPostponeCustomTagInput] = useState('');
const [customTagsPool, setCustomTagsPool] = useState(() => {
  try {
    const saved = localStorage.getItem('planificador_custom_tags');
    if (saved) return JSON.parse(saved);
  } catch (e) {}
  return [];
});
const [postponeTargetWeek, setPostponeTargetWeek] = useState(currentWeekMonday);
const [postponeTargetDay, setPostponeTargetDay] = useState('Lunes');
const [postponeTargetObraId, setPostponeTargetObraId] = useState(null);
// State for viewing detailed postponement history of a task
const [selectedTaskHistory, setSelectedTaskHistory] = useState(null);
const [incidentToDelete, setIncidentToDelete] = useState(null);
// State for Incident / Postponement Report Modal
const [isReportModalOpen, setIsReportModalOpen] = useState(false);
const [reportPeriodType, setReportPeriodType] = useState('mensual'); // 'semanal', 'quincenal', 'mensual', 'personalizado', 'total'
const [reportViewFilter, setReportViewFilter] = useState('all'); // 'all', 'ejecutadas', 'no_ejecutadas'
const [reportWeek, setReportWeek] = useState(() => currentWeekMonday);
const [reportMonth, setReportMonth] = useState(() => new Date().getMonth());
const [reportYear, setReportYear] = useState(() => new Date().getFullYear());
const [reportQuincena, setReportQuincena] = useState(1); // 1 (1-15) or 2 (16-fin)
const [reportCustomStart, setReportCustomStart] = useState(() => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
});
const [reportCustomEnd, setReportCustomEnd] = useState(() => {
  const d = new Date();
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
});
const [reportObraId, setReportObraId] = useState('all');
const [reportGremio, setReportGremio] = useState('all');
const [reportPrintMode, setReportPrintMode] = useState('consolidado'); // 'consolidado' | 'separado'
const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
const [emailRecipient, setEmailRecipient] = useState('');
const [emailSubject, setEmailSubject] = useState('');
const [emailMessage, setEmailMessage] = useState('');
const [emailScope, setEmailScope] = useState('all'); // 'all' or obra_id
const [emailSendStatus, setEmailSendStatus] = useState('idle'); // 'idle' | 'sending' | 'sent'
const [emailCopiedFeedback, setEmailCopiedFeedback] = useState(false);
// New Construction site state
const [newObraNombre, setNewObraNombre] = useState('');
const [isManageObrasModalOpen, setIsManageObrasModalOpen] = useState(false);
const [editingObraId, setEditingObraId] = useState(null);
const [editingObraNombre, setEditingObraNombre] = useState('');
// Mic / Audio Dictation state
const [isListening, setIsListening] = useState(false);
const [transcript, setTranscript] = useState('');
const [isParsingSpeech, setIsParsingSpeech] = useState(false);
const [parsedTasks, setParsedTasks] = useState([]); // Preview of parsed tasks before inserting
const recognitionRef = useRef(null);
const hasAutoJumpedWeekRef = useRef(false);

// Fetch list of works and tasks
const loadData = useCallback(async () => {
  if (!db || !getCurrentUserId()) return;
  try {
    // Load construction sites
    const obrasRes = await db.query('SELECT * FROM obras ORDER BY nombre ASC');
    const loadedObras = obrasRes.rows || [];
    setObras(loadedObras);
    if (loadedObras.length > 0) {
      setManualTask(prev => prev.obra_id ? prev : { ...prev, obra_id: loadedObras[0][0] });
    }
    // Load all tasks for printing and filter the current week for the weekly grid
    const query = `
      SELECT t.id, t.obra_id, t.fecha_semana, t.dia_semana, t.actividad, t.gremio, t.completada, t.notas, o.nombre as obra_nombre, t.trazo_data FROM tareas t LEFT JOIN obras o ON t.obra_id = o.id ORDER BY t.fecha_semana ASC, t.fecha_creado ASC
    `;
    const tareasRes = await db.query(query);
    // Map rows into objects
    const mappedTareas = (tareasRes.rows || []).map(row => ({
      id: row[0],
      obra_id: row[1],
      fecha_semana: row[2],
      dia_semana: row[3],
      actividad: row[4],
      gremio: row[5],
      completada: isTaskCompleted(row[6]),
      notas: row[7],
      obra_nombre: row[8] || 'Obra Desconocida',
      trazo_data: row[9] || null
    }));
    setTodasLasTareas(mappedTareas);

    const tasksInCurrentWeek = mappedTareas.filter(task => task.fecha_semana === currentWeekMonday);
    setTareas(tasksInCurrentWeek);

    // Cargar notas y apuntes del bloc
    setNotasList(getNotas());

    // Si el dispositivo entra en una semana vacía pero el usuario sí tiene tareas en otras semanas, saltar automáticamente a la semana con tareas más cercana
    if (!hasAutoJumpedWeekRef.current && mappedTareas.length > 0) {
      hasAutoJumpedWeekRef.current = true;
      if (tasksInCurrentWeek.length === 0) {
        const availableWeeks = Array.from(new Set(mappedTareas.map(t => t.fecha_semana).filter(Boolean))).sort();
        if (availableWeeks.length > 0) {
          // Buscar la semana más cercana a hoy o la primera con tareas pendientes
          const targetWeek = availableWeeks.find(w => w >= currentWeekMonday) || availableWeeks[availableWeeks.length - 1];
          if (targetWeek && targetWeek !== currentWeekMonday) {
            setCurrentWeekMonday(targetWeek);
          }
        }
      }
    }
  } catch (e) {
    setError('Error cargando datos de la base de datos: ' + e.message);
  }
}, [db, currentWeekMonday]);

// Escucha de estado de autenticación corporativa
useEffect(() => {
  const unsubAuth = onAuthUserChange(async (user) => {
    if (user) {
      hasAutoJumpedWeekRef.current = false;
      setCurrentUser(user);
      try {
        await setUserContext(user);
        await loadData();
        // Forzar comprobación activa contra Firestore para asegurar sincronización entre dispositivos
        await forceCloudSync();
        await loadData();
      } catch (err) {
        console.error('Error inicializando contexto de usuario:', err);
      }
    } else {
      hasAutoJumpedWeekRef.current = false;
      setCurrentUser(null);
      setUserContext(null);
      setObras([]);
      setTareas([]);
      setTodasLasTareas([]);
    }
    setAuthLoading(false);
  });

  return () => unsubAuth();
}, [loadData]);

// Actualizar tareas filtradas cuando cambia la semana activa o el usuario
useEffect(() => {
  if (currentUser && getCurrentUserId()) {
    loadData();
  }
}, [currentUser, currentWeekMonday, loadData]);

// Escucha en tiempo real de gremios y subcontratistas compartidos en Firestore
useEffect(() => {
  const unsubGremios = subscribeToSharedGremios((list) => {
    setCustomGremios(list);
  });
  return () => {
    if (unsubGremios) unsubGremios();
  };
}, []);

// Database Sync Event listeners (suscripción permanente para recibir cambios en tiempo real de otros dispositivos)
useEffect(() => {
  if (!db) return;
  const unsubscribe = db.onPendingChange((hasPending) => {
    setSyncing(hasPending);
    if (!hasPending && getCurrentUserId()) {
      loadData(); // Reload safely when synched
    }
  });
  return () => unsubscribe();
}, [db, loadData]);

// Suscripción al estado de Cobertura Móvil / Modo Obra Offline
useEffect(() => {
  const unsubOffline = subscribeToOfflineStatus((status) => {
    setOfflineStatus({
      isOnline: status.isOnline,
      pendingOfflineCount: status.pendingOfflineCount || 0,
      isFlushing: status.isFlushing || false
    });
    if (status.justSyncedCount && status.justSyncedCount > 0) {
      setSuccessMessage(`✅ Cobertura recuperada: Se han sincronizado automáticamente ${status.justSyncedCount} cambio(s) guardados en obra con la nube.`);
      setTimeout(() => setSuccessMessage(null), 5000);
      loadData();
    }
  });
  return () => unsubOffline();
}, [loadData]);

// Limpieza de base de datos SQLite local en IndexedDB para evitar que reaparezcan obras de prueba
useEffect(() => {
  if (typeof window !== 'undefined' && window.indexedDB) {
    try {
      window.indexedDB.deleteDatabase('planificador-obras');
    } catch (e) {}
  }
}, []);

const handleLogout = async () => {
  if (!confirm(`¿Deseas cerrar tu sesión corporativa (${currentUser?.email})?`)) return;
  try {
    setIsLoggingOut(true);
    await logout();
    setCurrentUser(null);
    setSuccessMessage('Sesión cerrada correctamente.');
  } catch (err) {
    setError('Error al cerrar sesión: ' + err.message);
  } finally {
    setIsLoggingOut(false);
  }
};
// Change week
const navigateWeek = (weeksToShift) => {
  const parts = (currentWeekMonday || '').split('-').map(Number);
  const current = parts.length === 3
    ? new Date(parts[0], parts[1] - 1, parts[2], 12)
    : new Date();
  current.setDate(current.getDate() + weeksToShift * 7);
  setCurrentWeekMonday(getMonday(current));
};
// Set to current week
const goToToday = () => {
  setCurrentWeekMonday(getMonday(new Date()));
};
// Calendar Modal navigation helpers
const openCalendarModal = () => {
  if (currentWeekMonday) {
    const parts = currentWeekMonday.split('-').map(Number);
    if (parts.length === 3) {
      setCalendarViewDate(new Date(parts[0], parts[1] - 1, 1, 12));
    } else {
      setCalendarViewDate(new Date());
    }
  } else {
    setCalendarViewDate(new Date());
  }
  setIsCalendarModalOpen(true);
};
const prevCalendarMonth = () => {
  setCalendarViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1, 12));
};
const nextCalendarMonth = () => {
  setCalendarViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1, 12));
};
const jumpCalendarToToday = () => {
  const today = new Date();
  setCalendarViewDate(new Date(today.getFullYear(), today.getMonth(), 1, 12));
  setCurrentWeekMonday(getMonday(today));
  setIsCalendarModalOpen(false);
};
const handleSelectCalendarDay = (cell) => {
  const monday = getMonday(cell.dateStr);
  setCurrentWeekMonday(monday);
  setIsCalendarModalOpen(false);
};

const calendarYearOptions = useMemo(() => {
  const currentY = new Date().getFullYear();
  const years = [];
  for (let y = currentY - 5; y <= currentY + 8; y++) {
    years.push(y);
  }
  const viewY = calendarViewDate.getFullYear();
  if (!years.includes(viewY)) {
    years.push(viewY);
    years.sort((a, b) => a - b);
  }
  return years;
}, [calendarViewDate]);

const taskCountByWeek = useMemo(() => {
  const map = {};
  todasLasTareas.forEach(t => {
    if (t.fecha_semana) {
      map[t.fecha_semana] = (map[t.fecha_semana] || 0) + 1;
    }
  });
  return map;
}, [todasLasTareas]);

const weeksWithTasksForObra = useMemo(() => {
  const map = {};
  todasLasTareas.forEach(t => {
    if (!t.fecha_semana) return;
    if (selectedObraId !== 'all' && String(t.obra_id) !== String(selectedObraId)) return;
    map[t.fecha_semana] = (map[t.fecha_semana] || 0) + 1;
  });
  return Object.entries(map)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([week, count]) => ({ week, count }));
}, [todasLasTareas, selectedObraId]);

const todayIsoString = useMemo(() => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}, []);

const calendarGridDays = useMemo(() => {
  const viewYear = calendarViewDate.getFullYear();
  const viewMonth = calendarViewDate.getMonth();

  const firstDayOfMonth = new Date(viewYear, viewMonth, 1, 12);
  const firstDayWeekday = (firstDayOfMonth.getDay() + 6) % 7; // 0 = Mon, 6 = Sun

  const daysInCurrentMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

  const cells = [];

  // Trailing days from previous month
  for (let i = firstDayWeekday - 1; i >= 0; i--) {
    const dayNum = daysInPrevMonth - i;
    const d = new Date(viewYear, viewMonth - 1, dayNum, 12);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    cells.push({
      dateStr: `${y}-${m}-${day}`,
      dayNum,
      isCurrentMonth: false,
      dateObj: d
    });
  }

  // Days of current month
  for (let dayNum = 1; dayNum <= daysInCurrentMonth; dayNum++) {
    const m = String(viewMonth + 1).padStart(2, '0');
    const day = String(dayNum).padStart(2, '0');
    cells.push({
      dateStr: `${viewYear}-${m}-${day}`,
      dayNum,
      isCurrentMonth: true,
      dateObj: new Date(viewYear, viewMonth, dayNum, 12)
    });
  }

  // Leading days of next month
  const totalCells = cells.length > 35 ? 42 : 35;
  const remaining = totalCells - cells.length;
  for (let dayNum = 1; dayNum <= remaining; dayNum++) {
    const d = new Date(viewYear, viewMonth + 1, dayNum, 12);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    cells.push({
      dateStr: `${y}-${m}-${day}`,
      dayNum,
      isCurrentMonth: false,
      dateObj: d
    });
  }

  return cells;
}, [calendarViewDate]);

// --- CUADRANTE MENSUAL: HELPERS Y MEMOS ---
const prevQuadrantMonth = () => {
  setMonthViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1, 12));
};

const nextQuadrantMonth = () => {
  setMonthViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1, 12));
};

const goToCurrentMonth = () => {
  const now = new Date();
  setMonthViewDate(new Date(now.getFullYear(), now.getMonth(), 1, 12));
};

const monthYearOptions = useMemo(() => {
  const currentY = new Date().getFullYear();
  const years = [];
  for (let y = currentY - 5; y <= currentY + 8; y++) {
    years.push(y);
  }
  const viewY = monthViewDate.getFullYear();
  if (!years.includes(viewY)) {
    years.push(viewY);
    years.sort((a, b) => a - b);
  }
  return years;
}, [monthViewDate]);

const todayExactDate = useMemo(() => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}, []);

// Lista de todos los días del mes para el cuadrante
const daysOfMonthList = useMemo(() => {
  const list = [];
  const y = monthViewDate.getFullYear();
  const m = monthViewDate.getMonth();
  const count = new Date(y, m + 1, 0).getDate();
  const diaCorto = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  for (let d = 1; d <= count; d++) {
    const dateObj = new Date(y, m, d, 12, 0, 0);
    const dayOfWeek = dateObj.getDay(); // 0=Dom, 1=Lun..
    const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    list.push({
      dayNum: d,
      dateStr,
      dayOfWeek,
      dayNameShort: diaCorto[dayOfWeek],
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
      dateObj
    });
  }
  return list;
}, [monthViewDate]);

// Tareas filtradas para el mes seleccionado
const monthTasks = useMemo(() => {
  const y = monthViewDate.getFullYear();
  const mStr = String(monthViewDate.getMonth() + 1).padStart(2, '0');
  const prefix = `${y}-${mStr}`;
  return todasLasTareas.filter(t => {
    const exactDate = getTaskExactDate(t);
    if (!exactDate || !exactDate.startsWith(prefix)) return false;
    if (selectedObraId !== 'all' && t.obra_id !== selectedObraId) return false;
    if (monthlyFilterStatus === 'pending' && t.completada) return false;
    if (monthlyFilterStatus === 'completed' && !t.completada) return false;
    if (monthlyFilterGremio !== 'all' && t.gremio !== monthlyFilterGremio) return false;
    return true;
  });
}, [todasLasTareas, monthViewDate, selectedObraId, monthlyFilterStatus, monthlyFilterGremio]);

// Mapa indexado [obra_id][dateStr] = [tareas]
const tasksByObraAndDate = useMemo(() => {
  const map = {};
  monthTasks.forEach(t => {
    const exactDate = getTaskExactDate(t);
    if (!exactDate) return;
    if (!map[t.obra_id]) map[t.obra_id] = {};
    if (!map[t.obra_id][exactDate]) map[t.obra_id][exactDate] = [];
    map[t.obra_id][exactDate].push(t);
  });
  return map;
}, [monthTasks]);

// Estadísticas del mes
const monthStats = useMemo(() => {
  const total = monthTasks.length;
  const completed = monthTasks.filter(t => t.completada).length;
  const pending = total - completed;
  const pct = total === 0 ? 0 : Math.round((completed / total) * 100);
  return { total, completed, pending, pct };
}, [monthTasks]);

// Obras que se mostrarán en el cuadrante
const displayedObras = useMemo(() => {
  if (selectedObraId !== 'all') {
    return obras.filter(o => o[0] === selectedObraId);
  }
  return obras;
}, [obras, selectedObraId]);

// Abrir modal de añadir tarea desde una celda de fecha y obra
const handleOpenNewTaskForDateAndObra = (dateStr, obraId = '') => {
  const targetMonday = getMonday(dateStr);
  const dateObj = new Date(dateStr + 'T12:00:00');
  const diaIndex = dateObj.getDay();
  const diaNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const diaName = diaNames[diaIndex] || 'Lunes';
  
  setManualTask({
    dia_semana: DIAS_SEMANA.includes(diaName) ? diaName : 'Lunes',
    fecha_semana: targetMonday,
    actividad: '',
    gremio: 'Albañilería',
    obra_id: obraId || (obras[0]?.[0] || ''),
    notas: ''
  });
  setIsNewTaskModalOpen(true);
};

// Saltar a la vista semanal centrada en una fecha concreta
const jumpToWeekFromDate = (dateStr) => {
  const targetMonday = getMonday(dateStr);
  setCurrentWeekMonday(targetMonday);
  setActiveView('semanal');
};

// Add new Construction site
const handleAddObra = async (e) => {
if (e) e.preventDefault();
if (!newObraNombre.trim()) return;
const id = 'o_' + Date.now();
const nombre = newObraNombre.trim();
try {
await db.exec('INSERT OR REPLACE INTO obras (id, nombre, activo) VALUES (?, ?, ?)', [id, nombre, '1']);
setObras(prev => {
const exists = prev.some(o => o[0] === id);
if (exists) return prev;
return [...prev, [id, nombre, 1]];
});
setManualTask(prev => ({ ...prev, obra_id: id }));
setError(null);
setSuccessMessage(`Obra "${nombre}" añadida correctamente.`);
setNewObraNombre('');
setIsNewObraModalOpen(false);
} catch (err) {
setError('Error creando obra: ' + err.message);
}
};
// Update Construction site name
const handleUpdateObra = async (id, nuevoNombre) => {
if (!nuevoNombre.trim()) return;
try {
await db.exec('UPDATE obras SET nombre = ? WHERE id = ?', [nuevoNombre.trim(), id]);
setObras(prev => prev.map(o => o[0] === id ? [id, nuevoNombre.trim(), o[2]] : o));
setEditingObraId(null);
setEditingObraNombre('');
setError(null);
} catch (err) {
setError('Error al renombrar la obra: ' + err.message);
}
};
// Delete Construction site and all associated tasks
const handleDeleteObra = async (id) => {
const obraNombre = obras.find(o => o[0] === id)?.[1] || 'esta obra';
try {
const checkRes = await db.query('SELECT COUNT(*) FROM tareas WHERE obra_id = ?', [id]);
const count = checkRes.rows && checkRes.rows[0] ? parseInt(checkRes.rows[0][0]) : 0;
if (!confirm(`Esta obra tiene ${count} tareas asociadas. Si la eliminas, se borrarán todas sus tareas del planificador semanal. ¿Deseas eliminar permanentemente la obra "${obraNombre}" y sus tareas?`)) {
return;
}
// Eliminar siempre primero todas las tareas, pendientes o finalizadas.
await db.exec('DELETE FROM tareas WHERE obra_id = ?', [id]);
await db.exec('DELETE FROM obras WHERE id = ?', [id]);
if (selectedObraId === id) {
setSelectedObraId('all');
}
await loadData();
setError(null);
setSuccessMessage('Obra y todas sus tareas asociadas eliminadas correctamente.');
} catch (err) {
await loadData();
setError('Error al eliminar la obra: ' + err.message);
}
};

// Crear Gremio / Subcontratista compartido globalmente para todos los usuarios
const handleCreateGremio = async (e) => {
  if (e) e.preventDefault();
  const trimmed = newGremioName.trim();
  if (!trimmed) return;
  try {
    await createSharedGremio(trimmed, currentUser?.displayName || currentUser?.email);
    if (gremioTargetContext === 'manual') {
      setManualTask(prev => ({ ...prev, gremio: trimmed }));
    } else if (gremioTargetContext === 'edit') {
      setEditingTask(prev => ({ ...prev, gremio: trimmed }));
    }
    setNewGremioName('');
    setIsManageGremiosModalOpen(false);
    setGremioTargetContext(null);
    setSuccessMessage(`Gremio / Subcontratista "${trimmed}" creado correctamente y disponible para todos los usuarios.`);
  } catch (err) {
    setError('Error al crear el gremio: ' + err.message);
  }
};

// Eliminar Gremio compartido del catálogo corporativo
const handleDeleteGremio = async (id, nombre) => {
  if (!confirm(`¿Deseas eliminar permanentemente el gremio "${nombre}" del catálogo compartido de la empresa?`)) return;
  try {
    await deleteSharedGremio(id);
    setSuccessMessage(`Gremio "${nombre}" eliminado del catálogo corporativo.`);
  } catch (err) {
    setError('Error al eliminar el gremio: ' + err.message);
  }
};
// Add single manual task
const handleAddManualTask = async (e) => {
if (e) e.preventDefault();
if (obras.length === 0) {
  setError('Debes registrar al menos una obra antes de crear actividades.');
  setIsManageObrasModalOpen(true);
  return;
}
const assignedObraId = manualTask.obra_id || (obras[0] ? obras[0][0] : '');
if (!assignedObraId) {
  setError('Selecciona o registra la obra a la que pertenece esta actividad.');
  return;
}
if (!manualTask.actividad.trim()) return;
const taskId = 't_' + Date.now();
const nowIso = new Date().toISOString();
const targetWeek = manualTask.fecha_semana || currentWeekMonday;
try {
await db.exec(
`INSERT OR REPLACE INTO tareas
(id, obra_id, fecha_semana, dia_semana, actividad, gremio, completada, notas, fecha_creado)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
[
taskId,
assignedObraId,
targetWeek,
manualTask.dia_semana,
manualTask.actividad.trim(),
manualTask.gremio,
'0',
manualTask.notas || '',
nowIso
]
);
// Optimistic UI update
const matchedObra = obras.find(o => o[0] === assignedObraId);
const newLocalTask = {
id: taskId,
obra_id: assignedObraId,
fecha_semana: targetWeek,
dia_semana: manualTask.dia_semana,
actividad: manualTask.actividad.trim(),
gremio: manualTask.gremio,
completada: false,
notas: manualTask.notas.trim(),
obra_nombre: matchedObra ? matchedObra[1] : 'Obra Desconocida'
};
if (targetWeek === currentWeekMonday) {
  setTareas(prev => [...prev, newLocalTask]);
}
setTodasLasTareas(prev => [...prev, newLocalTask]);
setManualTask(prev => ({
...prev,
fecha_semana: '',
actividad: '',
notas: ''
}));
setIsNewTaskModalOpen(false);
setError(null);
} catch (err) {
setError('Error al guardar tarea: ' + err.message);
}
};
// Update an existing task
const handleUpdateTask = async (e) => {
e.preventDefault();
if (!editingTask || !editingTask.actividad.trim()) {
setError('La descripción de la actividad no puede estar vacía.');
return;
}
try {
const finalNotas = serializeTaskNotas(editingTask.notas, editingTask._aplazamientos || []);
await db.exec(
'UPDATE tareas SET obra_id = ?, dia_semana = ?, actividad = ?, gremio = ?, notas = ? WHERE id = ?',
[
editingTask.obra_id,
editingTask.dia_semana,
editingTask.actividad.trim(),
editingTask.gremio,
finalNotas,
editingTask.id
]
);
const matchedObra = obras.find(o => o[0] === editingTask.obra_id);
const updatedTask = {
...editingTask,
obra_id: editingTask.obra_id,
dia_semana: editingTask.dia_semana,
actividad: editingTask.actividad.trim(),
gremio: editingTask.gremio,
notas: finalNotas,
obra_nombre: matchedObra ? matchedObra[1] : 'Obra Desconocida'
};
setTareas(prev => prev.map(task => task.id === editingTask.id ? { ...task, ...updatedTask } : task));
setTodasLasTareas(prev => prev.map(task => task.id === editingTask.id ? { ...task, ...updatedTask } : task));
setEditingTask(null);
setError(null);
setSuccessMessage('Actividad actualizada correctamente.');
} catch (err) {
setError('Error al editar actividad: ' + err.message);
}
};
// Move an existing task to another week and/or day
const handleMoveTask = async (sourceTask, targetWeek, targetDay) => {
if (!sourceTask || !targetWeek || !targetDay) {
setError('No se pudo mover la actividad: faltan datos de destino.');
return;
}
const normalizedWeek = getMonday(targetWeek);
try {
await db.exec('UPDATE tareas SET fecha_semana = ?, dia_semana = ? WHERE id = ?', [normalizedWeek, targetDay, sourceTask.id]);
if (normalizedWeek === currentWeekMonday) {
setTareas(prev => prev.map(task => task.id === sourceTask.id ? { ...task, fecha_semana: normalizedWeek, dia_semana: targetDay } : task));
} else {
setTareas(prev => prev.filter(task => task.id !== sourceTask.id));
}
setMoveTask(null);
setError(null);
setSuccessMessage(`Actividad movida a la semana del ${formatFriendlyDate(normalizedWeek)}.`);
} catch (err) {
setError('Error al mover actividad: ' + err.message);
}
};
// Copy an existing task independently to another week and/or day
const handleCopyTask = async (sourceTask, targetWeek, targetDay) => {
if (!sourceTask || !targetWeek || !targetDay) {
setError('No se pudo copiar la actividad: faltan datos de origen o destino.');
return;
}
const normalizedWeek = getMonday(targetWeek);
const taskId = 't_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
const fechaCreado = new Date().toISOString();
try {
await db.exec(
`INSERT OR REPLACE INTO tareas
(id, obra_id, fecha_semana, dia_semana, actividad, gremio, completada, notas, fecha_creado, trazo_data)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
[
taskId,
sourceTask.obra_id,
normalizedWeek,
targetDay,
sourceTask.actividad,
sourceTask.gremio,
'0',
sourceTask.notas || '',
fechaCreado,
sourceTask.trazo_data || null
]
);
if (normalizedWeek === currentWeekMonday) {
setTareas(prev => [...prev, {
...sourceTask,
id: taskId,
fecha_semana: normalizedWeek,
dia_semana: targetDay,
completada: false,
fecha_creado: fechaCreado,
obra_nombre: sourceTask.obra_nombre,
trazo_data: sourceTask.trazo_data || null
}]);
}
setTodasLasTareas(prev => [...prev, {
...sourceTask,
id: taskId,
fecha_semana: normalizedWeek,
dia_semana: targetDay,
completada: false,
fecha_creado: fechaCreado,
obra_nombre: sourceTask.obra_nombre,
trazo_data: sourceTask.trazo_data || null
}]);
setCopyingTask(null);
setError(null);
setSuccessMessage(`Copia creada para la semana del ${formatFriendlyDate(normalizedWeek)}.`);
} catch (err) {
setError('Error al copiar actividad: ' + err.message);
}
};

// Todas las etiquetas disponibles (predefinidas + añadidas por el usuario + existentes en tareas)
const allAvailableTags = useMemo(() => {
  const set = new Set(DEFAULT_INCIDENT_TAGS);
  customTagsPool.forEach(t => {
    if (t && typeof t === 'string' && t.trim()) set.add(t.trim());
  });
  todasLasTareas.forEach(task => {
    const { aplazamientos } = parseTaskNotas(task.notas);
    aplazamientos.forEach(apl => {
      if (Array.isArray(apl.tags)) {
        apl.tags.forEach(t => { if (t && typeof t === 'string' && t.trim()) set.add(t.trim()); });
      } else if (apl.motivo && typeof apl.motivo === 'string') {
        apl.motivo.split(',').forEach(part => {
          const trimmed = part.trim();
          if (trimmed) set.add(trimmed);
        });
      }
    });
  });
  return Array.from(set);
}, [customTagsPool, todasLasTareas]);

const handleToggleTag = (tag) => {
  setPostponeSelectedTags(prev => {
    if (prev.includes(tag)) {
      return prev.filter(t => t !== tag);
    } else {
      return [...prev, tag];
    }
  });
};

const handleAddNewTag = (e) => {
  if (e) e.preventDefault();
  const trimmed = postponeCustomTagInput.trim();
  if (!trimmed) return;
  if (!postponeSelectedTags.includes(trimmed)) {
    setPostponeSelectedTags(prev => [...prev, trimmed]);
  }
  if (!customTagsPool.includes(trimmed)) {
    const updated = [...customTagsPool, trimmed];
    setCustomTagsPool(updated);
    try {
      localStorage.setItem('planificador_custom_tags', JSON.stringify(updated));
    } catch (err) {}
  }
  setPostponeCustomTagInput('');
};

// Open Postpone / Non-execution Modal for a task
const handleOpenPostponeModal = (task, targetWeek = null, targetDay = null, targetObraId = null) => {
  setPostponeTask(task);
  setPostponeSelectedTags([]);
  setPostponeCustomTagInput('');
  setPostponeObservaciones('');
  if (targetWeek && targetDay) {
    setPostponeTargetWeek(targetWeek);
    setPostponeTargetDay(targetDay);
  } else {
    const taskWeek = task.fecha_semana || currentWeekMonday;
    const parts = (taskWeek || '').split('-').map(Number);
    const baseDate = parts.length === 3 ? new Date(parts[0], parts[1] - 1, parts[2], 12) : new Date();
    const nextWeekDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() + 7, 12);
    const nextMonday = getMonday(nextWeekDate);
    setPostponeTargetWeek(nextMonday);
    setPostponeTargetDay(task.dia_semana || 'Lunes');
  }
  setPostponeTargetObraId(targetObraId || task.obra_id);
  setIsPostponeModalOpen(true);
};

// Confirm Postpone and Register Incident
const handleConfirmPostpone = async (e) => {
  if (e) e.preventDefault();
  if (!postponeTask) return;

  const obsTrimmed = postponeObservaciones.trim();
  if (!obsTrimmed && postponeSelectedTags.length === 0) {
    setError('Por favor, escribe una breve observación o selecciona al menos una etiqueta para clasificar la incidencia.');
    return;
  }

  const { userNotas, aplazamientos } = parseTaskNotas(postponeTask.notas);
  const currentExactDate = getTaskExactDate(postponeTask);
  
  const targetMonday = getMonday(postponeTargetWeek);
  const dayOffset = DIAS_SEMANA_OFFSET[postponeTargetDay] ?? 0;
  const mParts = targetMonday.split('-').map(Number);
  const targetDateObj = new Date(mParts[0], mParts[1] - 1, mParts[2] + dayOffset, 12);
  const targetExactDate = `${targetDateObj.getFullYear()}-${String(targetDateObj.getMonth() + 1).padStart(2, '0')}-${String(targetDateObj.getDate()).padStart(2, '0')}`;

  const finalTags = postponeSelectedTags.length > 0
    ? postponeSelectedTags
    : (obsTrimmed ? [obsTrimmed.slice(0, 30)] : ['General']);

  const primaryMotivo = finalTags.join(', ');

  const newIncident = {
    id: 'apl_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
    fecha_anterior: currentExactDate,
    dia_anterior: postponeTask.dia_semana,
    fecha_nueva: targetExactDate,
    dia_nuevo: postponeTargetDay,
    tags: finalTags,
    motivo: primaryMotivo,
    detalle: obsTrimmed,
    fecha_registro: new Date().toISOString()
  };

  const updatedAplazamientos = [...aplazamientos, newIncident];
  const newRawNotas = serializeTaskNotas(userNotas, updatedAplazamientos);

  const finalObraId = postponeTargetObraId || postponeTask.obra_id;
  const matchedObra = obras.find(o => o[0] === finalObraId);
  const finalObraNombre = matchedObra ? matchedObra[1] : (postponeTask.obra_nombre || 'Obra');

  try {
    if (finalObraId !== postponeTask.obra_id) {
      await db.exec(
        'UPDATE tareas SET obra_id = ?, fecha_semana = ?, dia_semana = ?, notas = ? WHERE id = ?',
        [finalObraId, targetMonday, postponeTargetDay, newRawNotas, postponeTask.id]
      );
    } else {
      await db.exec(
        'UPDATE tareas SET fecha_semana = ?, dia_semana = ?, notas = ? WHERE id = ?',
        [targetMonday, postponeTargetDay, newRawNotas, postponeTask.id]
      );
    }

    const updatedTask = {
      ...postponeTask,
      obra_id: finalObraId,
      obra_nombre: finalObraNombre,
      fecha_semana: targetMonday,
      dia_semana: postponeTargetDay,
      notas: newRawNotas
    };

    if (targetMonday === currentWeekMonday) {
      setTareas(prev => prev.map(t => t.id === postponeTask.id ? updatedTask : t));
    } else {
      setTareas(prev => prev.filter(t => t.id !== postponeTask.id));
    }
    setTodasLasTareas(prev => prev.map(t => t.id === postponeTask.id ? updatedTask : t));

    setIsPostponeModalOpen(false);
    setPostponeTask(null);
    setPostponeTargetObraId(null);
    setPostponeSelectedTags([]);
    setPostponeCustomTagInput('');
    setPostponeObservaciones('');
    setError(null);
    setSuccessMessage(`Incidencia registrada: Actividad trasladada al ${postponeTargetDay} ${formatFriendlyDate(targetExactDate)}.`);
  } catch (err) {
    setError('Error al registrar el aplazamiento: ' + err.message);
  }
};

// Eliminar un registro de incidencia del historial (con opción de revertir la fecha si fue un error)
const handleConfirmDeleteIncident = async (revertDate = false) => {
  if (!incidentToDelete) return;
  const { task, incident, index } = incidentToDelete;
  const { userNotas, aplazamientos } = parseTaskNotas(task.notas);

  // Filtrar la incidencia eliminada
  const updatedAplazamientos = aplazamientos.filter((a, idx) => {
    if (incident.id && a.id) return a.id !== incident.id;
    return idx !== index;
  });

  const newRawNotas = serializeTaskNotas(userNotas, updatedAplazamientos);

  try {
    if (revertDate && incident.fecha_anterior && incident.dia_anterior) {
      const prevMonday = getMonday(incident.fecha_anterior);
      const prevDay = incident.dia_anterior;

      await db.exec(
        'UPDATE tareas SET fecha_semana = ?, dia_semana = ?, notas = ? WHERE id = ?',
        [prevMonday, prevDay, newRawNotas, task.id]
      );

      const updatedTask = {
        ...task,
        fecha_semana: prevMonday,
        dia_semana: prevDay,
        notas: newRawNotas
      };

      if (prevMonday === currentWeekMonday) {
        setTareas(prev => prev.map(t => t.id === task.id ? updatedTask : t));
      } else {
        setTareas(prev => prev.filter(t => t.id !== task.id));
      }
      setTodasLasTareas(prev => prev.map(t => t.id === task.id ? updatedTask : t));

      if (selectedTaskHistory && selectedTaskHistory.task.id === task.id) {
        setSelectedTaskHistory(updatedAplazamientos.length > 0 ? { task: updatedTask, aplazamientos: updatedAplazamientos } : null);
      }

      setSuccessMessage(`Incidencia eliminada y actividad restaurada a su fecha original: ${prevDay} (${formatFriendlyDate(incident.fecha_anterior)}).`);
    } else {
      await db.exec(
        'UPDATE tareas SET notas = ? WHERE id = ?',
        [newRawNotas, task.id]
      );

      const updatedTask = {
        ...task,
        notas: newRawNotas
      };

      setTareas(prev => prev.map(t => t.id === task.id ? updatedTask : t));
      setTodasLasTareas(prev => prev.map(t => t.id === task.id ? updatedTask : t));

      if (selectedTaskHistory && selectedTaskHistory.task.id === task.id) {
        setSelectedTaskHistory(updatedAplazamientos.length > 0 ? { task: updatedTask, aplazamientos: updatedAplazamientos } : null);
      }

      setSuccessMessage('Incidencia eliminada del historial correctamente.');
    }

    setIncidentToDelete(null);
    setError(null);
  } catch (err) {
    setError('Error al eliminar la incidencia: ' + err.message);
  }
};

// Manejadores para el Bloc de Notas & Checklist
const handleAddNota = useCallback(async (notaData) => {
  try {
    await saveNota(notaData);
    setNotasList(getNotas());
  } catch (err) {
    setError('Error al guardar apunte en el bloc: ' + err.message);
  }
}, []);

const handleUpdateNota = useCallback(async (id, updates) => {
  try {
    await updateNota(id, updates);
    setNotasList(getNotas());
  } catch (err) {
    setError('Error al actualizar apunte: ' + err.message);
  }
}, []);

const handleDeleteNota = useCallback(async (id) => {
  try {
    await deleteNota(id);
    setNotasList(getNotas());
  } catch (err) {
    setError('Error al eliminar apunte: ' + err.message);
  }
}, []);

const handleConvertNotaToTask = useCallback(async ({ obraId, diaSemana, actividad, gremio, notas, trazo_data }) => {
  try {
    const taskId = 't_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
    const nowIso = new Date().toISOString();
    const finalTrazo = trazo_data ? String(trazo_data).slice(0, 600000) : null;

    // 1. Guardar en base de datos local y sincronización con Firestore
    await db.exec(
      `INSERT OR REPLACE INTO tareas
      (id, obra_id, fecha_semana, dia_semana, actividad, gremio, completada, notas, fecha_creado, trazo_data)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        taskId,
        obraId,
        currentWeekMonday,
        diaSemana || 'Lunes',
        actividad,
        gremio || 'ENUE',
        '0',
        notas || '',
        nowIso,
        finalTrazo
      ]
    );

    // 2. Actualización optimista inmediata en estado React para visualización instantánea (0ms)
    const matchedObra = obras.find(o => o[0] === obraId);
    const newLocalTask = {
      id: taskId,
      obra_id: obraId,
      fecha_semana: currentWeekMonday,
      dia_semana: diaSemana || 'Lunes',
      actividad,
      gremio: gremio || 'ENUE',
      completada: false,
      notas: notas || '',
      obra_nombre: matchedObra ? matchedObra[1] : 'Obra Desconocida',
      trazo_data: finalTrazo
    };
    setTareas(prev => [...prev.filter(t => t.id !== taskId), newLocalTask]);
    setTodasLasTareas(prev => [...prev.filter(t => t.id !== taskId), newLocalTask]);

    await loadData();
    setSuccessMessage('¡Apunte y croquis transferidos con éxito a la planificación semanal!');
    setTimeout(() => setSuccessMessage(null), 3500);
  } catch (err) {
    setError('Error al crear tarea desde apunte: ' + err.message);
  }
}, [db, currentWeekMonday, obras, loadData]);

// Calculate Start Date and End Date for the Report
const getReportDateRange = useCallback(() => {
  if (reportPeriodType === 'total') {
    const obraObj = obras.find(o => o[0] === reportObraId);
    const obraLabel = obraObj ? obraObj[1] : (reportObraId === 'all' ? 'Todas las obras activas' : 'Obra');
    return {
      label: `Histórico acumulado hasta fin de obra (${obraLabel})`,
      startDate: '1970-01-01',
      endDate: '2099-12-31'
    };
  }

  if (reportPeriodType === 'semanal') {
    const monday = reportWeek || currentWeekMonday;
    const parts = monday.split('-').map(Number);
    const startObj = new Date(parts[0], parts[1] - 1, parts[2], 12);
    const endObj = new Date(parts[0], parts[1] - 1, parts[2] + 6, 12); // Lunes a Domingo
    const startDate = `${startObj.getFullYear()}-${String(startObj.getMonth() + 1).padStart(2, '0')}-${String(startObj.getDate()).padStart(2, '0')}`;
    const endDate = `${endObj.getFullYear()}-${String(endObj.getMonth() + 1).padStart(2, '0')}-${String(endObj.getDate()).padStart(2, '0')}`;
    return {
      label: `Semana del ${formatFriendlyDate(startDate)} al ${formatFriendlyDate(endDate)}`,
      startDate,
      endDate
    };
  }

  if (reportPeriodType === 'quincenal') {
    const y = reportYear;
    const m = reportMonth;
    if (reportQuincena === 1) {
      const startDate = `${y}-${String(m + 1).padStart(2, '0')}-01`;
      const endDate = `${y}-${String(m + 1).padStart(2, '0')}-15`;
      return {
        label: `1ª Quincena de ${MESES[m]} ${y} (1 al 15)`,
        startDate,
        endDate
      };
    } else {
      const daysCount = new Date(y, m + 1, 0).getDate();
      const startDate = `${y}-${String(m + 1).padStart(2, '0')}-16`;
      const endDate = `${y}-${String(m + 1).padStart(2, '0')}-${String(daysCount).padStart(2, '0')}`;
      return {
        label: `2ª Quincena de ${MESES[m]} ${y} (16 al ${daysCount})`,
        startDate,
        endDate
      };
    }
  }

  if (reportPeriodType === 'mensual') {
    const y = reportYear;
    const m = reportMonth;
    const daysCount = new Date(y, m + 1, 0).getDate();
    const startDate = `${y}-${String(m + 1).padStart(2, '0')}-01`;
    const endDate = `${y}-${String(m + 1).padStart(2, '0')}-${String(daysCount).padStart(2, '0')}`;
    return {
      label: `Mes de ${MESES[m]} ${y}`,
      startDate,
      endDate
    };
  }

  // Personalizado
  return {
    label: `Del ${formatFriendlyDate(reportCustomStart)} al ${formatFriendlyDate(reportCustomEnd)}`,
    startDate: reportCustomStart,
    endDate: reportCustomEnd
  };
}, [reportPeriodType, reportWeek, currentWeekMonday, reportYear, reportMonth, reportQuincena, reportCustomStart, reportCustomEnd, reportObraId, obras]);

// Compute report metrics, list of unexecuted / postponed tasks, and successfully executed tasks / repasos
const reportData = useMemo(() => {
  const { startDate, endDate } = getReportDateRange();
  if (!startDate || !endDate) {
    return {
      items: [],
      completedItems: [],
      totalTasksInPeriod: 0,
      completedInPeriod: 0,
      pendingInPeriod: 0,
      motivesCount: {}
    };
  }

  const scopedTasks = todasLasTareas.filter(t => {
    if (reportObraId !== 'all' && t.obra_id !== reportObraId) return false;
    if (reportGremio !== 'all' && t.gremio !== reportGremio) return false;
    return true;
  });

  const incidentItems = [];
  const motivesCount = {};

  scopedTasks.forEach(task => {
    const { aplazamientos } = parseTaskNotas(task.notas);

    aplazamientos.forEach((apl, idx) => {
      const inPeriod = (reportPeriodType === 'total')
        || (apl.fecha_anterior >= startDate && apl.fecha_anterior <= endDate)
        || (apl.fecha_nueva >= startDate && apl.fecha_nueva <= endDate);

      if (inPeriod) {
        const itemTags = Array.isArray(apl.tags) && apl.tags.length > 0
          ? apl.tags
          : (apl.motivo ? apl.motivo.split(',').map(s => s.trim()).filter(Boolean) : ['General']);

        incidentItems.push({
          taskId: task.id,
          task,
          obra_id: task.obra_id,
          obra_nombre: task.obra_nombre,
          actividad: task.actividad,
          gremio: task.gremio,
          completada: task.completada,
          fecha_anterior: apl.fecha_anterior,
          dia_anterior: apl.dia_anterior,
          fecha_nueva: apl.fecha_nueva,
          dia_nuevo: apl.dia_nuevo,
          tags: itemTags,
          motivo: apl.motivo || itemTags.join(', '),
          detalle: apl.detalle,
          fecha_registro: apl.fecha_registro,
          total_aplazamientos: aplazamientos.length,
          numero_intento: idx + 1
        });

        itemTags.forEach(tag => {
          motivesCount[tag] = (motivesCount[tag] || 0) + 1;
        });
      }
    });
  });

  // Tareas planificadas para este período (o todas si es hasta fin de obra)
  const tasksInPeriod = scopedTasks.filter(t => {
    if (reportPeriodType === 'total') return true;
    const d = getTaskExactDate(t);
    return d && d >= startDate && d <= endDate;
  });

  // Actividades y repasos ejecutados satisfactoriamente
  const completedItems = [];
  tasksInPeriod.forEach(task => {
    if (task.completada) {
      const { userNotas, aplazamientos } = parseTaskNotas(task.notas);
      const exactDate = getTaskExactDate(task);
      completedItems.push({
        taskId: task.id,
        task,
        obra_id: task.obra_id,
        obra_nombre: task.obra_nombre,
        actividad: task.actividad,
        gremio: task.gremio,
        fecha_ejecucion: exactDate,
        dia_semana: task.dia_semana,
        notas: userNotas,
        total_aplazamientos: aplazamientos.length,
        es_repaso_subsanado: aplazamientos.length > 0,
        aplazamientos
      });
    }
  });

  // Ordenar por fecha de ejecución (o fecha_semana) ascendente
  completedItems.sort((a, b) => {
    const dComp = (a.fecha_ejecucion || '').localeCompare(b.fecha_ejecucion || '');
    if (dComp !== 0) return dComp;
    return a.actividad.localeCompare(b.actividad, 'es');
  });

  const pendingItems = tasksInPeriod.filter(t => !t.completada);

  // El total de actividades programadas / hitos en el período comprende:
  // 1) Las actividades ejecutadas satisfactoriamente (completedItems)
  // 2) Las actividades no ejecutadas / traslados e incidencias producidos en el período (incidentItems)
  // 3) Las actividades actualmente planificadas en el período que siguen pendientes de ejecución (pendingItems)
  const totalTasksInPeriod = completedItems.length + incidentItems.length + pendingItems.length;

  return {
    items: incidentItems,
    completedItems,
    pendingItems,
    totalTasksInPeriod,
    completedInPeriod: completedItems.length,
    pendingInPeriod: pendingItems.length,
    motivesCount,
    startDate,
    endDate,
    label: getReportDateRange().label
  };
}, [getReportDateRange, todasLasTareas, reportObraId, reportGremio, reportPeriodType]);

// HTML5 drag-and-drop entre días
const handleDragStart = (e, task) => {
  e.stopPropagation();
  currentDraggedTask = task;
  try {
    if (typeof window !== 'undefined') {
      window.__currentDraggedTask = task;
    }
  } catch (err) {}
  try {
    e.dataTransfer.setData('text/plain', String(task.id));
    e.dataTransfer.setData('application/json', JSON.stringify({ id: task.id, actividad: task.actividad }));
    e.dataTransfer.effectAllowed = 'move';
  } catch (err) {
    console.warn('No se pudo establecer el dato de arrastre', err);
  }
  setDraggedTask(task);
};

const handleDragOverDay = (e, day) => {
  e.preventDefault();
  e.stopPropagation();
  try { e.dataTransfer.dropEffect = 'move'; } catch (err) {}
  if (dragOverDay !== day) {
    setDragOverDay(day);
  }
};

const handleDragLeaveDay = (e, day) => {
  if (!e.currentTarget.contains(e.relatedTarget)) {
    setDragOverDay(null);
  }
};

const handleDropOnDay = (e, targetDay) => {
  e.preventDefault();
  e.stopPropagation();
  setDragOverDay(null);
  const draggedTaskId = currentDraggedTask?.id || (typeof window !== 'undefined' && window.__currentDraggedTask?.id) || draggedTask?.id || e.dataTransfer.getData('text/plain');
  const sourceTask = currentDraggedTask || (typeof window !== 'undefined' && window.__currentDraggedTask) || draggedTask || todasLasTareas.find(task => String(task.id) === String(draggedTaskId));

  currentDraggedTask = null;
  try { if (typeof window !== 'undefined') window.__currentDraggedTask = null; } catch (err) {}
  setDraggedTask(null);

  if (!sourceTask) return;
  if (sourceTask.dia_semana === targetDay && sourceTask.fecha_semana === currentWeekMonday) {
    return;
  }
  // Al mover de día, se pregunta el motivo para registrar la no ejecución / reprogramación
  handleOpenPostponeModal(sourceTask, currentWeekMonday, targetDay, sourceTask.obra_id);
};

// Drag & drop para Cuadrante Mensual: Matriz por Obras
const handleDragOverMonthlyCell = (e, cellKey) => {
  e.preventDefault();
  e.stopPropagation();
  try { e.dataTransfer.dropEffect = 'move'; } catch (err) {}
  if (dragOverCell !== cellKey) {
    setDragOverCell(cellKey);
  }
};

const handleDragLeaveMonthlyCell = (e) => {
  if (!e.currentTarget.contains(e.relatedTarget)) {
    setDragOverCell(null);
  }
};

const handleDropOnMonthlyMatrixCell = (e, targetObraId, targetDateStr) => {
  e.preventDefault();
  e.stopPropagation();
  setDragOverCell(null);
  const draggedTaskId = currentDraggedTask?.id || (typeof window !== 'undefined' && window.__currentDraggedTask?.id) || draggedTask?.id || e.dataTransfer.getData('text/plain');
  const sourceTask = currentDraggedTask || (typeof window !== 'undefined' && window.__currentDraggedTask) || draggedTask || todasLasTareas.find(task => String(task.id) === String(draggedTaskId));

  currentDraggedTask = null;
  try { if (typeof window !== 'undefined') window.__currentDraggedTask = null; } catch (err) {}
  setDraggedTask(null);

  if (!sourceTask) return;
  const sourceExactDate = getTaskExactDate(sourceTask);
  if (sourceExactDate === targetDateStr && sourceTask.obra_id === targetObraId) {
    return;
  }
  const { targetMonday, targetDay } = getDateDetails(targetDateStr);
  // Preguntar motivo y abrir modal preconfigurado
  handleOpenPostponeModal(sourceTask, targetMonday, targetDay, targetObraId);
};

// Drag & drop para Cuadrícula Calendario Mensual
const handleDragOverCalendarDate = (e, dateStr) => {
  e.preventDefault();
  e.stopPropagation();
  try { e.dataTransfer.dropEffect = 'move'; } catch (err) {}
  if (dragOverCalendarDate !== dateStr) {
    setDragOverCalendarDate(dateStr);
  }
};

const handleDragLeaveCalendarDate = (e) => {
  if (!e.currentTarget.contains(e.relatedTarget)) {
    setDragOverCalendarDate(null);
  }
};

const handleDropOnCalendarDate = (e, targetDateStr) => {
  e.preventDefault();
  e.stopPropagation();
  setDragOverCalendarDate(null);
  const draggedTaskId = currentDraggedTask?.id || (typeof window !== 'undefined' && window.__currentDraggedTask?.id) || draggedTask?.id || e.dataTransfer.getData('text/plain');
  const sourceTask = currentDraggedTask || (typeof window !== 'undefined' && window.__currentDraggedTask) || draggedTask || todasLasTareas.find(task => String(task.id) === String(draggedTaskId));

  currentDraggedTask = null;
  try { if (typeof window !== 'undefined') window.__currentDraggedTask = null; } catch (err) {}
  setDraggedTask(null);

  if (!sourceTask) return;
  const sourceExactDate = getTaskExactDate(sourceTask);
  if (sourceExactDate === targetDateStr) {
    return;
  }
  const { targetMonday, targetDay } = getDateDetails(targetDateStr);
  // Preguntar motivo y abrir modal preconfigurado
  handleOpenPostponeModal(sourceTask, targetMonday, targetDay, sourceTask.obra_id);
};
// Toggle task completion
const handleToggleComplete = async (task) => {
const newStatus = task.completada ? 0 : 1;
try {
// Update state optimistically
setTareas(prev => prev.map(t => t.id === task.id ? { ...t, completada: !task.completada } : t));
setTodasLasTareas(prev => prev.map(t => t.id === task.id ? { ...t, completada: !task.completada } : t));
await db.exec('UPDATE tareas SET completada = ? WHERE id = ?', [String(newStatus), task.id]);
} catch (err) {
setError('Error al actualizar tarea: ' + err.message);
// Rollback
setTareas(prev => prev.map(t => t.id === task.id ? { ...t, completada: task.completada } : t));
setTodasLasTareas(prev => prev.map(t => t.id === task.id ? { ...t, completada: task.completada } : t));
}
};
// Delete task
const handleDeleteTask = async (taskId) => {
if (!confirm('¿Estás seguro de que quieres eliminar esta actividad?')) return;
try {
setTareas(prev => prev.filter(t => t.id !== taskId));
setTodasLasTareas(prev => prev.filter(t => t.id !== taskId));
await db.exec('DELETE FROM tareas WHERE id = ?', [taskId]);
} catch (err) {
setError('Error al borrar actividad: ' + err.message);
loadData(); // refresh
}
};
// Web Speech API Initialization
const initSpeech = () => {
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (!SpeechRecognition) {
alert('La API de reconocimiento de voz no está soportada en este navegador. Puedes escribir el texto directamente en el panel.');
return;
}
const rec = new SpeechRecognition();
rec.continuous = true;
rec.lang = 'es-ES';
rec.interimResults = true;
rec.onstart = () => {
setIsListening(true);
};
rec.onresult = (event) => {
let finalT = '';
for (let i = event.resultIndex; i < event.results.length; ++i) {
if (event.results[i].isFinal) {
finalT += event.results[i][0].transcript + ' ';
}
}
if (finalT) {
setTranscript(prev => (prev + finalT).trim());
}
};
rec.onerror = (event) => {
console.error('Speech error', event.error);
};
rec.onend = () => {
setIsListening(false);
};
recognitionRef.current = rec;
};
useEffect(() => {
initSpeech();
return () => {
if (recognitionRef.current) {
recognitionRef.current.abort();
}
};
}, []);
// Toggle micro dictation
const toggleListening = () => {
const rec = recognitionRef.current;
if (!rec) {
initSpeech();
return;
}
if (isListening) {
rec.stop();
} else {
rec.start();
}
};
// Local Offline Smart Parser (Modo Obra Sin Cobertura)
const parseDictationLocally = (rawText) => {
  const defaultObraId = (selectedObraId && selectedObraId !== 'all')
    ? selectedObraId
    : (obras[0]?.[0] || '');
  const segments = rawText
    .split(/(?:[\.\n;]+|\b(?:luego|después|además|también|por otro lado)\b)/i)
    .map(s => s.trim())
    .filter(Boolean);

  const dayPatterns = [
    { name: 'Lunes', regex: /\blunes\b/i },
    { name: 'Martes', regex: /\bmartes\b/i },
    { name: 'Miércoles', regex: /\bmi[eé]rcoles\b/i },
    { name: 'Jueves', regex: /\bjueves\b/i },
    { name: 'Viernes', regex: /\bviernes\b/i }
  ];

  const gremioKeywords = [
    { gremio: 'Electricidad', regex: /\b(electric\w*|luz|cuadro|cable\w*|enchufe\w*|iluminaci\w*|luminaria\w*)\b/i },
    { gremio: 'Fontanería', regex: /\b(fontaner\w*|agua|tuber\w*|desag[uü]e\w*|sanitario\w*|grif\w*|bajante\w*)\b/i },
    { gremio: 'Pintura', regex: /\b(pintur\w*|pintar|esmalte|repaso de pintura|lijar|plastecer)\b/i },
    { gremio: 'Pladur / Yeso', regex: /\b(pladur|yeso|tabique\w*|trasdosado\w*|falso techo|escayola)\b/i },
    { gremio: 'Albañilería', regex: /\b(albañil\w*|alicat\w*|solad\w*|mortero|roza\w*|enfosc\w*|ladrillo\w*|baldosa\w*)\b/i },
    { gremio: 'Carpintería', regex: /\b(carpinter\w*|puerta\w*|armario\w*|rodapi[eé]\w*|madera|tarima)\b/i },
    { gremio: 'Climatización', regex: /\b(clima\w*|aire acondicionado|aerotermia|conducto\w*|fancoil|calefacci\w*|suelo radiante)\b/i },
    { gremio: 'Cerramientos', regex: /\b(ventana\w*|cristal\w*|vidrio\w*|aluminio|pvc|cerrajer\w*|barandilla\w*)\b/i },
    { gremio: 'Estructura', regex: /\b(estructur\w*|hormig[oó]n|forjado|pilar\w*|viga\w*|cimentaci\w*|ferralla)\b/i },
    { gremio: 'Limpieza', regex: /\b(limpiez\w*|limpiar|escombro\w*|retirada)\b/i },
    { gremio: 'Jardinería / Exteriores', regex: /\b(jard[ií]n\w*|exterior\w*|piscina|vallado|terraza)\b/i }
  ];

  let currentDay = 'Lunes';
  let currentObra = defaultObraId;

  return segments.map((seg) => {
    for (const dp of dayPatterns) {
      if (dp.regex.test(seg)) {
        currentDay = dp.name;
        break;
      }
    }
    for (const o of obras) {
      const obraName = (o[1] || '').trim();
      if (obraName && seg.toLowerCase().includes(obraName.toLowerCase())) {
        currentObra = o[0];
        break;
      }
    }
    let detectedGremio = 'ENUE';
    for (const gk of gremioKeywords) {
      if (gk.regex.test(seg)) {
        detectedGremio = gk.gremio;
        break;
      }
    }
    let cleanAct = seg
      .replace(/^(el|para el|en el)?\s*(lunes|martes|mi[eé]rcoles|jueves|viernes)\s*(hay que|toca|hacer|realizar)?\s*/i, '')
      .trim();
    if (!cleanAct) cleanAct = seg;
    cleanAct = cleanAct.charAt(0).toUpperCase() + cleanAct.slice(1);

    return {
      obra_id: currentObra,
      dia_semana: currentDay,
      actividad: cleanAct,
      gremio: detectedGremio,
      notas: ''
    };
  });
};

// AI Smart Parsing of dictation (with automatic Offline Fallback at the construction site)
const parseDictationWithAI = async () => {
if (!transcript.trim()) return;
setIsParsingSpeech(true);
setError(null);

if (typeof navigator !== 'undefined' && navigator.onLine === false) {
  const localTasks = parseDictationLocally(transcript);
  setParsedTasks(localTasks);
  setSuccessMessage('📡 Modo Obra Sin Cobertura: Dictado estructurado localmente en el dispositivo sin necesidad de internet.');
  setIsParsingSpeech(false);
  return;
}

try {
const client = AiKit.createClient();
const obrasTextList = obras.length > 0
  ? obras.map(o => `ID "${o[0]}": "${o[1]}"`).join('\n')
  : 'Sin obras registradas todavía';
const defaultObraDirective = obras.length > 0
  ? `Si no se puede deducir la obra, usa por defecto el ID "${obras[0][0]}" (${obras[0][1]}).`
  : 'Usa una obra general o vacía si no existe.';
const systemPrompt = `
Eres un experto planificador y estructurador de agendas de obra en España.
Tu misión es analizar una transcripción de voz (dictado) de obra y extraer actividades y organizarlas por días de la semana y obras.
Estas son las obras registradas del usuario actualmente en el sistema (usa exactamente sus IDs):
${obrasTextList}
${defaultObraDirective}
Organiza cada tarea según los días laborables de la semana en España de Lunes a Viernes: "Lunes", "Martes", "Miércoles", "Jueves", "Viernes".
Intenta clasificar el gremio / subcontratista o gremio que ejecuta de entre estos valores predefinidos si es claro:
- Albañilería
- Estructura
- Pintura
- Fontanería
- Electricidad
- Pladur / Yeso
- Climatización
- Carpintería
- Instalaciones
- Limpieza
- Cerramientos
- Jardinería / Exteriores
- Otros
Devuelve un array JSON limpio que contenga los campos:
- "obra_id" (string literal coincidente con la lista de obras)
- "dia_semana" (string exacto: Lunes, Martes, Miércoles, Jueves o Viernes)
- "actividad" (string de la tarea dictada, haz que el nombre sea profesional y conciso de 3 a 8 palabras)
- "gremio" (string de alguno de los predefinidos)
- "notas" (string con explicaciones adicionales si las hay, o string vacío "")
Devuelve ÚNICAMENTE el código JSON listo para procesar. No añadas introducciones, explicaciones, ni etiquetas de programación en tu respuesta. El JSON debe comenzar directamente con '['.
`;
const response = await client.chat.completions.create({
model: 'aikit/fast',
tool_choice: 'none',
messages: [
{ role: 'system', content: systemPrompt },
{ role: 'user', content: `Este es mi dictado de obra: "${transcript}"` }
]
});
const rawContent = response.choices[0]?.message?.content || '';
// Safe parse JSON
let cleaned = rawContent
.replace(/^[\s\S]*?```(?:json)?\s*\n?/i, '')
.replace(/\n?\s*```[\s\S]*$/, '')
.trim();
if (!cleaned) cleaned = rawContent.trim();
const resultJson = JSON.parse(cleaned);
if (Array.isArray(resultJson)) {
setParsedTasks(resultJson);
} else {
throw new Error('La IA no devolvió un formato de array adecuado.');
}
} catch (err) {
  // Si falla por falta de cobertura móvil en obra, usar automáticamente el motor local
  const localTasks = parseDictationLocally(transcript);
  if (localTasks.length > 0) {
    setParsedTasks(localTasks);
    setSuccessMessage('📡 Cobertura débil detectada: Dictado estructurado automáticamente en modo local del dispositivo.');
  } else {
    setError('Error al procesar dictado: ' + err.message);
  }
} finally {
setIsParsingSpeech(false);
}
};
// Save all preview/parsed tasks to SQLite
const saveParsedTasks = async () => {
if (parsedTasks.length === 0) return;
if (obras.length === 0) {
  setError('Debes registrar al menos una obra antes de importar tareas del dictado.');
  setIsDictatingModalOpen(false);
  setIsManageObrasModalOpen(true);
  return;
}
const defaultObraId = obras[0][0];
try {
const nowIso = new Date().toISOString();
// Insert each task
const pendingQueries = parsedTasks.map((t, idx) => {
const taskId = 't_' + Date.now() + '_' + idx;
const assignedObraId = (t.obra_id && obras.some(o => o[0] === t.obra_id)) ? t.obra_id : defaultObraId;
return db.exec(
`INSERT OR REPLACE INTO tareas
(id, obra_id, fecha_semana, dia_semana, actividad, gremio, completada, notas, fecha_creado)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
[
taskId,
assignedObraId,
currentWeekMonday,
t.dia_semana || 'Lunes',
t.actividad || 'Falta definición',
t.gremio || 'Otros',
'0',
t.notes || t.notas || '',
nowIso
]
);
});
await Promise.all(pendingQueries);
setParsedTasks([]);
setTranscript('');
setIsDictatingModalOpen(false);
setError(null);
await loadData();
} catch (err) {
setError('Error guardando las tareas estructuradas: ' + err.message);
}
};
const removeParsedTaskPreview = (index) => {
setParsedTasks(prev => prev.filter((_, i) => i !== index));
};
// Filter tasks by active view
const filteredTareas = useMemo(() => {
if (selectedObraId === 'all') return tareas;
return tareas.filter(t => t.obra_id === selectedObraId);
}, [tareas, selectedObraId]);
// Group filtered tasks by Day
const tasksByDay = useMemo(() => {
const groups = {};
DIAS_SEMANA.forEach(day => {
groups[day] = [];
});
filteredTareas.forEach(task => {
if (groups[task.dia_semana]) {
groups[task.dia_semana].push(task);
} else {
// Fallback
groups['Lunes'].push(task);
}
});
return groups;
}, [filteredTareas]);
// Calculate progress stats
const stats = useMemo(() => {
const total = filteredTareas.length;
const completed = filteredTareas.filter(t => t.completada).length;
const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
return { total, completed, pct };
}, [filteredTareas]);

if (authLoading) {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 selection:bg-amber-500 selection:text-slate-950">
      <div className="w-16 h-16 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center shadow-2xl shadow-amber-500/20 mb-4 animate-bounce">
        <Building className="w-8 h-8" />
      </div>
      <h1 className="text-xl font-bold text-white mb-1">Planificador Semanal Actividades / Repasos</h1>
      <p className="text-xs font-semibold text-slate-400 mb-6 uppercase tracking-wider">ENUE Proyectos y Construcción</p>
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-sm text-amber-400">
        <RefreshCw className="w-4 h-4 animate-spin" />
        <span>Verificando sesión corporativa (@{CORPORATE_DOMAIN})...</span>
      </div>
    </div>
  );
}

if (!currentUser) {
  return (
    <AuthView
      onAuthSuccess={async (user) => {
        setCurrentUser(user);
        await setUserContext(user);
        await forceCloudSync();
        await loadData();
      }}
    />
  );
}

return (
<div className="min-h-screen bg-slate-50 text-slate-800">
{/* Dashboard Principal (Oculto al imprimir) */}
<div className="print:hidden max-w-7xl mx-auto px-3 sm:px-4 py-4 md:py-10 pb-24 md:pb-10">
{/* Header */}
<div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4 mb-5 sm:mb-8 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-xs">
<div className="flex items-center justify-between gap-3">
<div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
<div className="bg-amber-500 text-white p-2.5 sm:p-3 rounded-xl shadow-md shadow-amber-500/20 shrink-0">
<Building className="w-5 h-5 sm:w-6 sm:h-6" />
</div>
<div className="min-w-0">
<h1 className="text-base sm:text-xl md:text-2xl font-bold text-slate-950 flex flex-wrap items-center gap-2 leading-tight">
<span className="truncate sm:whitespace-normal">Planificador Semanal / Repasos</span>
{!offlineStatus.isOnline ? (
<span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs">
  <WifiOff className="w-3 h-3 text-amber-700" />
  <span>Modo Obra (Sin Cobertura{offlineStatus.pendingOfflineCount > 0 ? ` · ${offlineStatus.pendingOfflineCount} en cola` : ''})</span>
</span>
) : (syncing || offlineStatus.isFlushing) ? (
<span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200 animate-pulse">
<RefreshCw className="w-3 h-3 mr-1 animate-spin" /> {offlineStatus.pendingOfflineCount > 0 ? `Subiendo ${offlineStatus.pendingOfflineCount} cambios...` : 'Sincronizando...'}
</span>
) : offlineStatus.pendingOfflineCount > 0 ? (
<button
  type="button"
  onClick={async () => {
    setSyncing(true);
    await flushOfflineQueue();
    await forceCloudSync();
    await loadData();
    setSyncing(false);
  }}
  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 transition-colors cursor-pointer"
  title="Hay cambios guardados en el dispositivo pendientes de subir. Toca para sincronizar ahora."
>
  <CloudUpload className="w-3 h-3 text-amber-600 animate-bounce" />
  <span>{offlineStatus.pendingOfflineCount} pendientes de subir</span>
</button>
) : (
<button
  type="button"
  onClick={async () => {
    setSyncing(true);
    await flushOfflineQueue();
    await forceCloudSync();
    await loadData();
    setSyncing(false);
    setSuccessMessage(`Sincronizado en tiempo real con la nube (${todasLasTareas.length} tareas y ${obras.length} obras en ${currentUser.email}).`);
    setTimeout(() => setSuccessMessage(null), 3500);
  }}
  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors cursor-pointer"
  title="Haz clic para forzar sincronización inmediata con todos tus dispositivos"
>
  <Wifi className="w-2.5 h-2.5 text-emerald-600" />
  <span>Sincronizado ({todasLasTareas.length})</span>
</button>
)}
</h1>
<p className="text-xs sm:text-sm text-slate-500 truncate">ENUE Proyectos y Construcción · {currentUser.email}</p>
</div>
</div>

{/* Usuario compacto en móvil (visible hasta sm) */}
<div className="flex sm:hidden items-center gap-1.5 shrink-0">
  <div
    className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 text-slate-950 font-bold flex items-center justify-center text-xs shadow-xs ring-2 ring-amber-400/40"
    title={currentUser.email}
  >
    {currentUser.displayName ? currentUser.displayName.charAt(0).toUpperCase() : (currentUser.email ? currentUser.email.charAt(0).toUpperCase() : 'U')}
  </div>
  <button
    type="button"
    onClick={handleLogout}
    disabled={isLoggingOut}
    className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all cursor-pointer border border-slate-200"
    title={`Cerrar sesión (${currentUser.email})`}
  >
    <LogOut className="w-4 h-4" />
  </button>
</div>
</div>

<div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 sm:gap-3 w-full lg:w-auto">
{/* Botón Gestionar / Crear Obras */}
<button
type="button"
onClick={() => setIsManageObrasModalOpen(true)}
className="bg-white hover:bg-slate-50 hover:text-amber-800 text-slate-800 font-semibold px-3 sm:px-4 py-2.5 rounded-xl flex items-center justify-center sm:justify-start gap-2 transition-all border border-slate-200 shadow-2xs hover:border-amber-300 shrink-0 cursor-pointer text-xs sm:text-sm"
title="Gestionar, crear o modificar obras"
>
<Building className="w-4 h-4 text-amber-500 shrink-0" />
<span className="truncate">Gestionar Obras</span>
</button>
{/* Botón Informe de Repasos / Incidencias */}
<button
type="button"
onClick={() => setIsReportModalOpen(true)}
className="bg-white hover:bg-amber-50 hover:text-amber-800 text-slate-800 font-semibold px-3 sm:px-4 py-2.5 rounded-xl flex items-center justify-center sm:justify-start gap-2 transition-all border border-slate-200 shadow-2xs hover:border-amber-300 shrink-0 cursor-pointer text-xs sm:text-sm"
title="Generar informe semanal, quincenal o mensual de tareas no ejecutadas y repasos"
>
<FileSpreadsheet className="w-4 h-4 text-amber-500 shrink-0" />
<span className="truncate">Informe Repasos</span>
</button>
{/* Dictate Button */}
<button
onClick={() => { setIsDictatingModalOpen(true); setParsedTasks([]); }}
className="bg-amber-500 hover:bg-amber-600 text-slate-950 hover:cursor-pointer font-semibold px-3 sm:px-4 py-2.5 rounded-xl flex items-center justify-center sm:justify-start gap-2 transition-all shadow-md shadow-amber-500/10 shrink-0 text-xs sm:text-sm"
>
<Mic className="w-4 h-4 sm:w-5 sm:h-5 animate-pulse shrink-0" />
<span className="truncate">Dictar Plan</span>
</button>
{/* Create manual task */}
<button
onClick={() => setIsNewTaskModalOpen(true)}
className="bg-slate-900 hover:bg-slate-800 text-white hover:cursor-pointer font-medium px-3 sm:px-4 py-2.5 rounded-xl flex items-center justify-center sm:justify-start gap-2 transition-all shrink-0 text-xs sm:text-sm"
>
<Plus className="w-4 h-4 shrink-0" />
<span className="truncate">Añadir Actividad</span>
</button>

{/* Sesión de Usuario Corporativo (Tablet y Escritorio) */}
<div className="hidden sm:flex items-center gap-2.5 pl-3 border-l border-slate-200 shrink-0 ml-auto lg:ml-0">
  <div className="flex items-center gap-2">
    <div
      className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 text-slate-950 font-bold flex items-center justify-center text-xs shadow-xs shrink-0 ring-2 ring-amber-400/40"
      title={currentUser.email}
    >
      {currentUser.displayName ? currentUser.displayName.charAt(0).toUpperCase() : (currentUser.email ? currentUser.email.charAt(0).toUpperCase() : 'U')}
    </div>
    <div className="text-left">
      <p className="text-xs font-bold text-slate-900 leading-tight truncate max-w-[130px]" title={currentUser.displayName || currentUser.email}>
        {currentUser.displayName || currentUser.email.split('@')[0]}
      </p>
      <p className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
        @{CORPORATE_DOMAIN}
      </p>
    </div>
  </div>
  <button
    type="button"
    onClick={handleLogout}
    disabled={isLoggingOut}
    className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all cursor-pointer border border-slate-200 hover:border-red-200 shrink-0"
    title={`Cerrar sesión (${currentUser.email})`}
  >
    <LogOut className="w-4 h-4" />
  </button>
</div>
</div>
</div>

{/* Banner de Modo Obra Sin Cobertura / Cola de Sincronización Offline */}
{(!offlineStatus.isOnline || offlineStatus.pendingOfflineCount > 0) && (
  <div className={`mb-4 p-3.5 sm:p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs transition-all ${
    !offlineStatus.isOnline
      ? 'bg-amber-50/95 border-amber-300 text-amber-950'
      : 'bg-blue-50/90 border-blue-200 text-blue-950'
  }`}>
    <div className="flex items-start sm:items-center gap-3">
      <div className={`p-2.5 rounded-xl shrink-0 ${
        !offlineStatus.isOnline ? 'bg-amber-500 text-slate-950' : 'bg-blue-600 text-white'
      }`}>
        {!offlineStatus.isOnline ? <WifiOff className="w-5 h-5" /> : <CloudUpload className="w-5 h-5 animate-pulse" />}
      </div>
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-xs sm:text-sm font-extrabold">
            {!offlineStatus.isOnline
              ? 'Modo Obra Sin Cobertura Activo'
              : `Sincronizando datos de obra (${offlineStatus.pendingOfflineCount} pendiente${offlineStatus.pendingOfflineCount === 1 ? '' : 's'})`}
          </h3>
          {offlineStatus.pendingOfflineCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-200/80 text-amber-950 border border-amber-400">
              {offlineStatus.pendingOfflineCount} guardado{offlineStatus.pendingOfflineCount === 1 ? '' : 's'} en este dispositivo
            </span>
          )}
        </div>
        <p className="text-[11px] sm:text-xs opacity-85 mt-0.5">
          {!offlineStatus.isOnline
            ? 'Puedes registrar tareas, marcar repasos, aplazar actividades o dictar con normalidad. Todo se guarda al instante en la memoria interna de tu móvil/tablet y se subirá solo en cuanto recuperes cobertura.'
            : 'Se ha detectado conexión de datos. Subiendo automáticamente los cambios registrados en obra a la nube corporativa...'}
        </p>
      </div>
    </div>
    {offlineStatus.isOnline && offlineStatus.pendingOfflineCount > 0 && (
      <button
        type="button"
        onClick={async () => {
          setSyncing(true);
          await flushOfflineQueue();
          await forceCloudSync();
          await loadData();
          setSyncing(false);
        }}
        className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shrink-0 cursor-pointer shadow-xs"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${offlineStatus.isFlushing ? 'animate-spin' : ''}`} />
        <span>Subir ahora</span>
      </button>
    )}
  </div>
)}
{/* Alerts panel */}
{error && (
<div className="mb-5 p-3.5 sm:p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-start gap-3">
<AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
<div className="flex-1 text-xs sm:text-sm font-medium">{error}</div>
<button onClick={() => setError(null)} className="text-red-500 hover:text-red-800">
<X className="w-5 h-5" />
</button>
</div>
)}
{successMessage && (
<div className="mb-5 p-3.5 sm:p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 flex items-start gap-3">
<Check className="w-5 h-5 shrink-0 mt-0.5" />
<div className="flex-1 text-xs sm:text-sm font-medium">{successMessage}</div>
<button onClick={() => setSuccessMessage(null)} className="text-emerald-500 hover:text-emerald-800">
<X className="w-5 h-5" />
</button>
</div>
)}
{/* Selector de Vista: Semanal vs Cuadrante Mensual vs Bloc de Notas */}
<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 mb-5 sm:mb-6 bg-white p-2.5 sm:p-3 rounded-2xl border border-slate-200 shadow-2xs">
  <div className="grid grid-cols-3 sm:inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200/80 shadow-inner w-full sm:w-auto">
    <button
      type="button"
      onClick={() => setActiveView('semanal')}
      className={`flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
        activeView === 'semanal'
          ? 'bg-white text-slate-950 shadow-xs border border-slate-200/60'
          : 'text-slate-600 hover:text-slate-900'
      }`}
    >
      <Columns3 className="w-4 h-4 text-amber-500 shrink-0" />
      <span>Vista Semanal</span>
    </button>
    <button
      type="button"
      onClick={() => setActiveView('mensual')}
      className={`flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
        activeView === 'mensual'
          ? 'bg-white text-slate-950 shadow-xs border border-slate-200/60'
          : 'text-slate-600 hover:text-slate-900'
      }`}
    >
      <Calendar className="w-4 h-4 text-amber-500 shrink-0" />
      <span>Cuadrante Mensual</span>
      {monthStats.total > 0 && (
        <span className="bg-amber-100 text-amber-800 text-[10px] font-black px-1.5 py-0.5 rounded-full ml-0.5">
          {monthStats.total}
        </span>
      )}
    </button>
    <button
      type="button"
      onClick={() => setActiveView('notas')}
      className={`flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
        activeView === 'notas'
          ? 'bg-white text-slate-950 shadow-xs border border-slate-200/60'
          : 'text-slate-600 hover:text-slate-900'
      }`}
    >
      <NotebookPen className="w-4 h-4 text-amber-500 shrink-0" />
      <span>Bloc de Notas</span>
      {pendingNotasCount > 0 && (
        <span className="bg-amber-500 text-slate-950 text-[10px] font-black px-1.5 py-0.5 rounded-full ml-0.5 animate-pulse">
          {pendingNotasCount}
        </span>
      )}
    </button>
  </div>

  <div className="text-[11px] sm:text-xs text-slate-500 font-medium px-2 text-center sm:text-right">
    {activeView === 'semanal' ? (
      <span>Semana del <strong className="text-slate-800">{formatFriendlyDate(currentWeekMonday)}</strong></span>
    ) : activeView === 'mensual' ? (
      <span>Cuadrante de <strong className="text-slate-800">{MESES[monthViewDate.getMonth()]} {monthViewDate.getFullYear()}</strong> por obras</span>
    ) : (
      <span>Checklist de repasos y notas manuscritas con stylus</span>
    )}
  </div>
</div>

{/* VISTA SEMANAL */}
{activeView === 'semanal' && (
<div>
{/* Banner de bienvenida y registro de primera obra si no tiene obras registradas */}
{obras.length === 0 && (
  <div className="mb-6 p-4 sm:p-6 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border-2 border-dashed border-amber-300 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
    <div className="flex items-center gap-3.5">
      <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 shadow-md">
        <Building className="w-5 h-5 sm:w-6 sm:h-6" />
      </div>
      <div>
        <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">Registra tus obras para comenzar</h3>
        <p className="text-xs text-slate-600 mt-0.5">
          Tu cuenta corporativa está activa. Cada usuario gestiona de forma aislada y privada exclusivamente sus propias obras registradas.
        </p>
      </div>
    </div>
    <button
      type="button"
      onClick={() => setIsManageObrasModalOpen(true)}
      className="w-full sm:w-auto bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold px-5 py-2.5 rounded-xl text-xs inline-flex items-center justify-center gap-2 shadow-xs cursor-pointer shrink-0 transition-all border-none"
    >
      <Plus className="w-4 h-4" /> Registrar Primera Obra
    </button>
  </div>
)}

{/* Control Bar & Progress */}
<div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 mb-4 sm:mb-5">
{/* Selector de Obra y Semana */}
<div className="lg:col-span-8 flex flex-col md:flex-row gap-3.5 sm:gap-4 items-stretch md:items-center bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200">
{/* Obras Select */}
<div className="flex-1 min-w-0">
<label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">Filtrar por Obra</label>
<div className="flex gap-2">
<select
value={selectedObraId}
onChange={(e) => {
  const nextObraId = e.target.value;
  setSelectedObraId(nextObraId);
  if (nextObraId !== 'all') {
    const tasksForObraInCurrentWeek = todasLasTareas.filter(
      t => String(t.obra_id) === String(nextObraId) && t.fecha_semana === currentWeekMonday
    );
    if (tasksForObraInCurrentWeek.length === 0) {
      const weeksForObra = Array.from(
        new Set(todasLasTareas.filter(t => String(t.obra_id) === String(nextObraId)).map(t => t.fecha_semana).filter(Boolean))
      ).sort();
      if (weeksForObra.length > 0) {
        setCurrentWeekMonday(weeksForObra[0]);
      }
    }
  }
}}
className="w-full min-w-0 bg-slate-50 border border-slate-200 rounded-lg px-2.5 sm:px-3 py-2 text-xs sm:text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
>
<option value="all">📍 Todas las obras activas ({todasLasTareas.length} tareas)</option>
{obras.map(o => {
  const countObra = todasLasTareas.filter(t => String(t.obra_id) === String(o[0])).length;
  return (
    <option key={o[0]} value={o[0]}>🚧 {o[1]} ({countObra})</option>
  );
})}
</select>
<button
type="button"
onClick={() => setIsManageObrasModalOpen(true)}
title="Gestionar y crear obras (Añadir / Corregir / Eliminar)"
className="bg-slate-100 hover:bg-amber-50 hover:text-amber-900 hover:border-amber-300 text-slate-700 font-bold px-3 py-2 rounded-lg border border-slate-200 hover:cursor-pointer flex items-center gap-1.5 shrink-0 transition-all text-xs"
>
<Building className="w-4 h-4 text-amber-500" />
<span className="hidden sm:inline">Gestionar Obras</span>
</button>
<button
onClick={() => {
setSelectedPrintObraId(selectedObraId === 'all' ? (obras[0]?.[0] || 'all') : selectedObraId);
setIsPrintModalOpen(true);
}}
title="Imprimir / Exportar PDF para Encargado"
className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-3 py-2 rounded-lg hover:cursor-pointer flex items-center gap-1.5 shrink-0 shadow-xs transition-all"
>
<Printer className="w-4 h-4" />
<span className="text-xs font-bold hidden sm:inline">Exportar PDF</span>
</button>
</div>
</div>
{/* Navegador de Fecha de la Semana */}
<div className="shrink-0 flex flex-col">
<label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">Semana de Trabajo</label>
<div className="flex items-center justify-between gap-1 bg-slate-50 border border-slate-200 rounded-lg p-1">
<button
type="button"
onClick={() => navigateWeek(-1)}
title="Semana anterior"
className="p-2 sm:p-1.5 hover:bg-white rounded-md text-slate-600 hover:cursor-pointer transition-colors shrink-0"
>
<ChevronLeft className="w-4 h-4" />
</button>
<button
type="button"
onClick={openCalendarModal}
title="Hacer clic para abrir el calendario en grande (cambiar mes o año)"
className="px-2 sm:px-3 py-1.5 sm:py-1 text-xs font-semibold text-slate-700 hover:text-amber-800 hover:bg-white rounded-md transition-all flex items-center gap-1.5 flex-1 sm:min-w-[195px] justify-center cursor-pointer group shadow-2xs hover:shadow-xs min-w-0"
>
<Calendar className="w-4 h-4 text-amber-500 group-hover:scale-125 transition-transform shrink-0" />
<span className="group-hover:underline decoration-amber-500 underline-offset-2 truncate">Al {formatFriendlyDate(currentWeekMonday)}</span>
</button>
<button
type="button"
onClick={() => navigateWeek(1)}
title="Semana siguiente"
className="p-2 sm:p-1.5 hover:bg-white rounded-md text-slate-600 hover:cursor-pointer transition-colors shrink-0"
>
<ChevronRight className="w-4 h-4" />
</button>
<button
type="button"
onClick={goToToday}
title="Ir a la semana actual"
className="text-[11px] bg-slate-200 hover:bg-slate-300 font-bold px-2.5 py-1.5 sm:py-1 rounded-md text-slate-700 hover:cursor-pointer transition-all ml-0.5 shrink-0"
>
Hoy
</button>
</div>
</div>
</div>
{/* General Progress Widget */}
<div className="lg:col-span-4 bg-slate-900 border border-slate-800 text-white rounded-xl p-3.5 sm:p-4 flex flex-col justify-between">
<div className="flex justify-between items-center mb-1.5 sm:mb-2">
<span className="text-xs font-bold uppercase tracking-wider text-slate-400">Progreso Semanal</span>
<span className="bg-amber-500 text-slate-950 font-extrabold text-xs px-2 py-0.5 rounded-md">
{stats.pct}%
</span>
</div>
<div className="flex items-end justify-between mb-2">
<p className="text-xl sm:text-2xl font-bold">{stats.completed} <span className="text-xs sm:text-sm font-normal text-slate-400">de {stats.total} tareas completadas</span></p>
</div>
<div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
<div className="bg-amber-500 h-full rounded-full transition-all duration-500" style={{ width: `${stats.pct}%` }}></div>
</div>
</div>
</div>

{/* Barra Rápida de Semanas con Tareas Registradas (Salto directo entre semanas con actividad) */}
{weeksWithTasksForObra.length > 0 && (
  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar bg-white border border-slate-200 rounded-xl px-3 py-2 mb-4 shadow-2xs">
    <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-slate-400 shrink-0 flex items-center gap-1 mr-1">
      <CalendarDays className="w-3.5 h-3.5 text-amber-500 shrink-0" />
      <span>Semanas con tareas:</span>
    </span>
    {weeksWithTasksForObra.map(({ week, count }) => {
      const isCurrent = week === currentWeekMonday;
      return (
        <button
          key={week}
          type="button"
          onClick={() => setCurrentWeekMonday(week)}
          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 flex items-center gap-1.5 transition-all cursor-pointer border ${
            isCurrent
              ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-2xs font-extrabold'
              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-amber-50 hover:border-amber-300'
          }`}
          title={`Saltar a la semana del lunes ${formatFriendlyDate(week)} (${count} tareas)`}
        >
          <span>{formatFriendlyDate(week)}</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
            isCurrent ? 'bg-slate-950 text-amber-400' : 'bg-slate-200 text-slate-700'
          }`}>
            {count}
          </span>
        </button>
      );
    })}
  </div>
)}

{/* Barra Rápida de Selección de Día para Móviles y Tablets (< xl) */}
<div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-2 mb-4 xl:hidden">
  <button
    type="button"
    onClick={() => setMobileSelectedDay('all')}
    className={`px-3 py-2 rounded-xl text-xs font-bold shrink-0 flex items-center gap-1.5 transition-all cursor-pointer border ${
      mobileSelectedDay === 'all'
        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
    }`}
  >
    <span>📅 Todos</span>
    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
      mobileSelectedDay === 'all' ? 'bg-amber-500 text-slate-950' : 'bg-slate-100 text-slate-600'
    }`}>
      {stats.total}
    </span>
  </button>
  {DIAS_SEMANA.map((dia) => {
    const dayCount = (tasksByDay[dia] || []).length;
    const daysMap = { 'Domingo': 0, 'Lunes': 1, 'Martes': 2, 'Miércoles': 3, 'Jueves': 4, 'Viernes': 5, 'Sábado': 6 };
    const isDayToday = getMonday(new Date()) === currentWeekMonday && new Date().getDay() === daysMap[dia];
    const isSelected = mobileSelectedDay === dia;
    return (
      <button
        key={dia}
        type="button"
        onClick={() => setMobileSelectedDay(dia)}
        className={`px-3 py-2 rounded-xl text-xs font-bold shrink-0 flex items-center gap-1.5 transition-all cursor-pointer border ${
          isSelected
            ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-xs font-extrabold'
            : isDayToday
            ? 'bg-amber-50 text-amber-900 border-amber-300'
            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
        }`}
      >
        <span>{dia}</span>
        {isDayToday && <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>}
        <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
          isSelected ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-600'
        }`}>
          {dayCount}
        </span>
      </button>
    );
  })}
</div>

{/* Columns Weekly Grid layout */}
<div className="grid grid-cols-1 md:grid-cols-2 gap-4 xl:flex xl:overflow-x-auto xl:gap-5 xl:pb-4">
{DIAS_SEMANA.map((dia) => {
const tasks = tasksByDay[dia] || [];
const isToday = () => {
const daysMap = { 'Domingo':0, 'Lunes': 1, 'Martes': 2, 'Miércoles': 3, 'Jueves': 4, 'Viernes': 5, 'Sábado': 6 };
const dayNum = daysMap[dia];
const currentDay = new Date().getDay();
const isSameWeek = getMonday(new Date()) === currentWeekMonday;
return isSameWeek && currentDay === dayNum;
};
const isHiddenOnMobile = mobileSelectedDay !== 'all' && mobileSelectedDay !== dia;
return (
<div
key={dia}
onDragOver={(e) => handleDragOverDay(e, dia)}
onDragLeave={(e) => handleDragLeaveDay(e, dia)}
onDrop={(e) => handleDropOnDay(e, dia)}
className={`${isHiddenOnMobile ? 'hidden xl:flex' : 'flex'} flex-col rounded-xl border transition-all ${
  tasks.length === 0 ? 'min-h-[170px]' : 'min-h-[240px]'
} md:min-h-[380px] xl:min-h-[650px] bg-white xl:flex-none xl:w-[300px] 2xl:w-[320px] ${
dragOverDay === dia
? 'border-amber-500 ring-2 ring-amber-300 bg-amber-50/30'
: isToday()
? 'border-amber-400 shadow-md shadow-amber-400/5 ring-1 ring-amber-400 ring-opacity-30'
: 'border-slate-200 shadow-xs'
}`}
>
{/* Day Header */}
<div className={`p-3.5 sm:p-4 rounded-t-xl border-b ${
isToday()
? 'bg-amber-50/50 border-amber-100'
: 'bg-slate-50/50 border-slate-100'
} flex items-center justify-between`}>
<div className="flex items-center gap-2">
<span className={`font-bold text-base ${isToday() ? 'text-amber-600' : 'text-slate-900'}`}>{dia}</span>
{isToday() && (
<span className="bg-amber-500 text-slate-950 text-[10px] font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider">Hoy</span>
)}
</div>
<span className="bg-slate-100 text-slate-600 font-semibold text-xs px-2.5 py-0.5 rounded-full">
{tasks.length}
</span>
</div>
{/* Task Checklist Area */}
<div className="flex-1 overflow-y-auto p-3 space-y-3">
{tasks.length === 0 ? (
<div className="h-full flex flex-col items-center justify-center text-center p-4">
<div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-2">
<CheckSquare className="w-5 h-5 opacity-40" />
</div>
<p className="text-xs text-slate-400 font-medium">Sin actividades</p>
<button
onClick={() => {
setManualTask(prev => ({ ...prev, dia_semana: dia }));
setIsNewTaskModalOpen(true);
}}
className="text-xs text-amber-500 hover:text-amber-600 font-semibold mt-1 inline-flex items-center gap-0.5 hover:cursor-pointer"
>
<Plus className="w-3.5 h-3.5" /> Añadir
</button>
</div>
) : (
tasks.map((task) => {
const { userNotas: cleanNotas, aplazamientos: taskAplazamientos } = parseTaskNotas(task.notas);
return (
<div
key={task.id}
className={`relative w-full min-h-[170px] p-5 rounded-xl border text-left transition-all group z-${openTaskMenuId === task.id ? '40' : '0'} ${
task.completada
? 'bg-emerald-50/20 border-emerald-100 text-slate-400'
: 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-md'
}`}
>
<div className="absolute top-3 right-3 z-50">
<button
type="button"
aria-label="Más opciones"
title="Más opciones"
onClick={() => setOpenTaskMenuId(openTaskMenuId === task.id ? null : task.id)}
className="inline-flex items-center justify-center rounded-lg bg-slate-100 hover:bg-amber-50 hover:text-amber-700 p-2 text-slate-600 hover:cursor-pointer"
>
<MoreVertical className="w-4 h-4" />
</button>
{openTaskMenuId === task.id && (
<div className="task-menu absolute right-0 top-11 w-44 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl z-50">
<button type="button" onClick={() => { setEditingTask({ ...task, notas: cleanNotas, _aplazamientos: taskAplazamientos }); setOpenTaskMenuId(null); }} className="w-full inline-flex items-center gap-2 rounded-lg bg-slate-100 hover:bg-amber-50 hover:text-amber-700 px-2.5 py-2 text-[11px] font-bold text-slate-600 hover:cursor-pointer"><Edit className="w-3.5 h-3.5" />Editar</button>
<button type="button" onClick={() => { handleOpenPostponeModal(task); setOpenTaskMenuId(null); }} className="w-full mt-1 inline-flex items-center gap-2 rounded-lg bg-amber-50 hover:bg-amber-100 px-2.5 py-2 text-[11px] font-bold text-amber-900 hover:cursor-pointer"><AlertTriangle className="w-3.5 h-3.5 text-amber-600" />No ejecutada / Trasladar</button>
{taskAplazamientos.length > 0 && (
<button type="button" onClick={() => { setSelectedTaskHistory({ task, aplazamientos: taskAplazamientos }); setOpenTaskMenuId(null); }} className="w-full mt-1 inline-flex items-center gap-2 rounded-lg bg-slate-100 hover:bg-amber-50 hover:text-amber-700 px-2.5 py-2 text-[11px] font-bold text-slate-600 hover:cursor-pointer"><History className="w-3.5 h-3.5" />Ver Historial ({taskAplazamientos.length})</button>
)}
<button type="button" onClick={() => { setMoveTargetWeek(getMonday(task.fecha_semana)); setMoveTargetDay(task.dia_semana); setMoveTask({ ...task }); setOpenTaskMenuId(null); }} className="w-full mt-1 inline-flex items-center gap-2 rounded-lg bg-slate-100 hover:bg-amber-50 hover:text-amber-700 px-2.5 py-2 text-[11px] font-bold text-slate-600 hover:cursor-pointer"><ArrowRightLeft className="w-3.5 h-3.5" />Mover</button>
<button type="button" onClick={() => { const nextWeek = new Date(task.fecha_semana); nextWeek.setDate(nextWeek.getDate() + 7); setCopyTargetWeek(getMonday(nextWeek)); setTargetCopyDay(task.dia_semana); setCopyingTask({ ...task }); setOpenTaskMenuId(null); }} className="w-full mt-1 inline-flex items-center gap-2 rounded-lg bg-slate-100 hover:bg-amber-50 hover:text-amber-700 px-2.5 py-2 text-[11px] font-bold text-slate-600 hover:cursor-pointer"><Copy className="w-3.5 h-3.5" />Copiar</button>
<div className="my-1.5 border-t border-slate-200"></div>
<button type="button" onClick={() => { handleDeleteTask(task.id); setOpenTaskMenuId(null); }} className="w-full inline-flex items-center gap-2 rounded-lg bg-red-50 hover:bg-red-100 px-2.5 py-2 text-[11px] font-bold text-red-600 hover:cursor-pointer"><Trash2 className="w-3.5 h-3.5" />Eliminar</button>
</div>
)}
</div>
<div className="mt-4 flex items-start gap-2 border-y border-slate-100 py-3">
<button
type="button"
onClick={() => handleToggleComplete(task)}
className="shrink-0 hover:cursor-pointer focus:outline-none mt-0.5"
aria-label={task.completada ? 'Marcar como pendiente' : 'Marcar como completada'}
>
{task.completada ? <CheckSquare className="w-5 h-5 text-emerald-600" /> : <Square className="w-5 h-5 text-slate-400 hover:text-amber-500" />}
</button>
<p className={`min-w-0 flex-1 font-bold text-base leading-snug whitespace-normal break-words ${task.completada ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
{task.actividad}
</p>
<button
type="button"
draggable="true"
aria-label="Arrastrar tarea"
title="Arrastrar tarea"
onPointerDown={(e) => e.stopPropagation()}
onDragStart={(e) => handleDragStart(e, task)}
onDragEnd={() => { setDraggedTask(null); setDragOverDay(null); }}
className="text-slate-400 hover:text-amber-600 cursor-grab active:cursor-grabbing p-1.5 rounded-md hover:bg-slate-100 shrink-0 flex items-center gap-1 justify-center"
>
<GripVertical className="w-5 h-5" />
<span className="hidden md:inline text-[10px] font-semibold">Arrastrar</span>
</button>
</div>
<div className="mt-4 space-y-2">
<div className="flex items-center gap-2 flex-wrap">
<span className={`inline-flex max-w-full whitespace-normal break-words text-[9px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${getGremioTagClasses(task.gremio, task.completada)}`}>
{task.gremio}
</span>
{selectedObraId === 'all' && <span className="text-xs font-semibold text-slate-500 flex items-center gap-1 min-w-0"><Building className="w-3.5 h-3.5 text-slate-400 shrink-0" /><span className="truncate">{task.obra_nombre}</span></span>}
{taskAplazamientos.length > 0 && (
<button
type="button"
onClick={(e) => { e.stopPropagation(); setSelectedTaskHistory({ task, aplazamientos: taskAplazamientos }); }}
className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200 transition-colors cursor-pointer"
title={`No ejecutada en ${taskAplazamientos.length} ocasión(es). Clic para ver motivos.`}
>
<AlertTriangle className="w-3 h-3 text-amber-600" />
<span>No ejecutada ({taskAplazamientos.length})</span>
</button>
)}
</div>
{cleanNotas && <p className="text-xs italic text-slate-400 break-words whitespace-normal whitespace-pre-wrap leading-relaxed border-t border-slate-100 pt-2">💡 {cleanNotas}</p>}
{task.trazo_data && (
  <div
    onClick={(e) => { e.stopPropagation(); setTaskLightboxImage(task.trazo_data); }}
    className="mt-2.5 relative rounded-2xl overflow-hidden border border-slate-200 bg-white p-1 cursor-zoom-in group/sketch shadow-2xs hover:border-amber-400 transition-all"
    title="Toca para ver el croquis a pantalla completa"
  >
    <img
      src={task.trazo_data}
      alt="Croquis de la tarea"
      className="w-full h-36 object-contain bg-slate-50/60 rounded-xl"
    />
    <div className="absolute bottom-2 right-2 bg-slate-900/80 backdrop-blur-xs text-amber-300 text-[9px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 opacity-90 group-hover/sketch:opacity-100 transition-opacity shadow-sm">
      <Maximize2 className="w-2.5 h-2.5" />
      <span>Ampliar croquis</span>
    </div>
  </div>
)}
<div className="flex items-center justify-between pt-1 border-t border-slate-50">
<button
type="button"
onClick={() => handleOpenPostponeModal(task)}
className="text-[10px] font-bold text-slate-500 hover:text-amber-800 hover:bg-amber-50 px-2 py-1 rounded-md border border-slate-200 hover:border-amber-300 flex items-center gap-1 cursor-pointer transition-colors"
title="Registrar que no se ejecutó hoy y trasladar a otra fecha"
>
<AlertTriangle className="w-3 h-3 text-amber-500" />
<span>No ejecutada / Trasladar</span>
</button>
</div>
</div>
</div>
);
})
)}
</div>
<button
type="button"
onClick={() => {
setManualTask(prev => ({ ...prev, dia_semana: dia }));
setIsNewTaskModalOpen(true);
}}
className="m-3 inline-flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-amber-300 bg-amber-50 px-3 py-2.5 text-xs font-bold text-amber-700 hover:bg-amber-100 hover:cursor-pointer transition-colors"
>
<Plus className="w-4 h-4" /> Añadir actividad
</button>
</div>
);
})}
</div>
<p className="mt-4 text-xs text-slate-500 text-center">Arrastra desde el asa de una actividad a otro día para moverla. Usa Editar para corregir o ampliar cualquier tarea.</p>
{/* Footer instructions */}
<div className="mt-10 bg-slate-100 border border-slate-200 rounded-xl p-5 flex flex-col md:flex-row items-center gap-4 justify-between">
<div className="flex items-center gap-3">
<Sparkles className="w-5 h-5 text-amber-500 animate-bounce" />
<p className="text-sm font-medium text-slate-600">
<strong>Consejo rápido:</strong> Usa el botón de <strong className="text-slate-900">"Dictar Plan"</strong> para dictar todo tu cronograma de la semana en un solo speech. Nuestro motor de IA se encargará de clasificarlo y meterlo en tu checklist.
</p>
</div>
</div>
</div>
)}

{/* VISTA CUADRANTE MENSUAL */}
{activeView === 'mensual' && (
  <div className="space-y-6">
    {/* Barra de control y navegación del Cuadrante Mensual */}
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* Navegador del Mes */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl p-1.5 shadow-2xs">
            <button
              type="button"
              onClick={prevQuadrantMonth}
              title="Mes anterior"
              className="p-2 hover:bg-white rounded-lg text-slate-700 hover:shadow-xs transition-all cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            {/* Selectores de Mes y Año */}
            <div className="flex items-center gap-1.5 px-2">
              <select
                value={monthViewDate.getMonth()}
                onChange={(e) => {
                  const m = parseInt(e.target.value, 10);
                  setMonthViewDate(new Date(monthViewDate.getFullYear(), m, 1, 12));
                }}
                className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
              >
                {MESES.map((mes, idx) => (
                  <option key={mes} value={idx}>{mes}</option>
                ))}
              </select>

              <select
                value={monthViewDate.getFullYear()}
                onChange={(e) => {
                  const y = parseInt(e.target.value, 10);
                  setMonthViewDate(new Date(y, monthViewDate.getMonth(), 1, 12));
                }}
                className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
              >
                {monthYearOptions.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={nextQuadrantMonth}
              title="Mes siguiente"
              className="p-2 hover:bg-white rounded-lg text-slate-700 hover:shadow-xs transition-all cursor-pointer"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={goToCurrentMonth}
              title="Ir al mes actual"
              className="text-xs bg-slate-200 hover:bg-slate-300 font-bold px-3 py-1.5 rounded-lg text-slate-800 hover:cursor-pointer transition-all ml-1"
            >
              Mes Actual
            </button>
          </div>
        </div>

        {/* Filtros de Obra, Estado y Sub-modo */}
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          {/* Filtrar Obra y Botón Gestionar */}
          <div className="w-full sm:w-auto flex-1 sm:flex-initial min-w-[200px] flex items-center gap-2">
            <select
              value={selectedObraId}
              onChange={(e) => setSelectedObraId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs sm:text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
            >
              <option value="all">📍 Todas las obras ({obras.length})</option>
              {obras.map(o => (
                <option key={o[0]} value={o[0]}>🚧 {o[1]}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setIsManageObrasModalOpen(true)}
              title="Gestionar y crear obras (Añadir / Corregir / Eliminar)"
              className="bg-white hover:bg-amber-50 hover:text-amber-900 hover:border-amber-300 text-slate-700 font-bold px-3 py-2 rounded-xl text-xs sm:text-sm flex items-center gap-1.5 border border-slate-200 shadow-2xs transition-all cursor-pointer shrink-0"
            >
              <Building className="w-4 h-4 text-amber-500" />
              <span className="hidden md:inline">Gestionar Obras</span>
            </button>
          </div>

          {/* Filtrar Estado */}
          <div className="w-full sm:w-auto grid grid-cols-3 sm:inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200 text-[11px] sm:text-xs font-bold">
            <button
              type="button"
              onClick={() => setMonthlyFilterStatus('all')}
              className={`px-2 sm:px-3 py-1.5 rounded-lg transition-all cursor-pointer text-center ${
                monthlyFilterStatus === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Todas ({monthTasks.length})
            </button>
            <button
              type="button"
              onClick={() => setMonthlyFilterStatus('pending')}
              className={`px-2 sm:px-3 py-1.5 rounded-lg transition-all cursor-pointer text-center ${
                monthlyFilterStatus === 'pending' ? 'bg-white text-amber-700 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Pendientes ({monthStats.pending})
            </button>
            <button
              type="button"
              onClick={() => setMonthlyFilterStatus('completed')}
              className={`px-2 sm:px-3 py-1.5 rounded-lg transition-all cursor-pointer text-center ${
                monthlyFilterStatus === 'completed' ? 'bg-white text-emerald-700 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Hechas ({monthStats.completed})
            </button>
          </div>

          {/* Sub-selector: Matriz vs Calendario */}
          <div className="w-full sm:w-auto grid grid-cols-2 sm:inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setMonthlyQuadrantMode('matriz')}
              title="Ver en formato cuadrante de obras horizontal"
              className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                monthlyQuadrantMode === 'matriz' ? 'bg-amber-500 text-slate-950 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Table className="w-3.5 h-3.5 shrink-0" />
              <span>Matriz por Obras</span>
            </button>
            <button
              type="button"
              onClick={() => setMonthlyQuadrantMode('calendario')}
              title="Ver en formato cuadrícula mensual de calendario"
              className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                monthlyQuadrantMode === 'calendario' ? 'bg-amber-500 text-slate-950 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5 shrink-0" />
              <span>Calendario</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tarjeta de Métricas del Mes */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 pt-3 border-t border-slate-100">
        <div className="bg-slate-50 p-2.5 sm:p-3 rounded-xl border border-slate-200/80">
          <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Actividades</p>
          <p className="text-lg sm:text-xl font-black text-slate-900 mt-0.5">{monthStats.total}</p>
        </div>
        <div className="bg-emerald-50/50 p-2.5 sm:p-3 rounded-xl border border-emerald-100">
          <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-emerald-600">Completadas</p>
          <p className="text-lg sm:text-xl font-black text-emerald-700 mt-0.5">{monthStats.completed}</p>
        </div>
        <div className="bg-amber-50/50 p-2.5 sm:p-3 rounded-xl border border-amber-100">
          <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-amber-600">Pendientes / Repasos</p>
          <p className="text-lg sm:text-xl font-black text-amber-700 mt-0.5">{monthStats.pending}</p>
        </div>
        <div className="bg-slate-900 text-white p-2.5 sm:p-3 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center">
            <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400">Progreso</p>
            <span className="text-xs font-black text-amber-400">{monthStats.pct}%</span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-2">
            <div className="bg-amber-500 h-full rounded-full transition-all duration-500" style={{ width: `${monthStats.pct}%` }} />
          </div>
        </div>
      </div>
    </div>

    {/* VISTA A: CUADRANTE MATRIZ POR OBRAS */}
    {monthlyQuadrantMode === 'matriz' && (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-3.5 sm:p-4 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-50/60">
          <div>
            <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
              <Table className="w-4 h-4 text-amber-500 shrink-0" />
              <span>Cuadrante Mensual por Obra — {MESES[monthViewDate.getMonth()]} {monthViewDate.getFullYear()}</span>
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-500">Desliza horizontalmente para recorrer los {daysOfMonthList.length} días del mes. Toca en cualquier día para añadir o gestionar actividades.</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsManageObrasModalOpen(true)}
              className="bg-white hover:bg-amber-50 hover:text-amber-900 hover:border-amber-300 text-slate-700 font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 border border-slate-200 shadow-2xs transition-all cursor-pointer shrink-0"
              title="Gestionar o añadir nuevas obras"
            >
              <Building className="w-3.5 h-3.5 text-amber-500" />
              <span>Gestionar / Crear Obras</span>
            </button>
          </div>
        </div>

        {/* Scroll Horizontal del Cuadrante */}
        <div className="overflow-x-auto max-w-full">
          <table className="w-full border-collapse text-left min-w-max">
            <thead>
              <tr className="bg-slate-100 text-slate-700 text-xs border-b border-slate-200">
                {/* Columna Fija de Obra */}
                <th className="sticky left-0 z-20 bg-slate-100 p-2.5 sm:p-3.5 border-r border-slate-200 font-extrabold uppercase tracking-wider min-w-[140px] max-w-[160px] sm:min-w-[210px] sm:max-w-[240px] shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="truncate">Obra</span>
                    <button
                      type="button"
                      onClick={() => setIsManageObrasModalOpen(true)}
                      title="Gestionar o añadir obras"
                      className="p-1 hover:bg-slate-200 rounded text-slate-600 hover:text-amber-700 transition-colors cursor-pointer shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5 text-amber-600" />
                    </button>
                  </div>
                </th>
                {/* Columnas de los Días del Mes */}
                {daysOfMonthList.map((day) => {
                  const isToday = day.dateStr === todayExactDate;
                  return (
                    <th
                      key={day.dateStr}
                      className={`p-2 sm:p-2.5 text-center border-r border-slate-200 min-w-[125px] sm:min-w-[135px] max-w-[170px] transition-colors ${
                        day.isWeekend ? 'bg-slate-100/80 text-slate-400' : 'bg-slate-100 text-slate-700'
                      } ${isToday ? 'bg-amber-100/90 text-amber-950 font-black' : ''}`}
                    >
                      <button
                        type="button"
                        onClick={() => jumpToWeekFromDate(day.dateStr)}
                        title={`Ir a la vista semanal de esta fecha (${day.dateStr})`}
                        className="w-full flex flex-col items-center justify-center group cursor-pointer hover:opacity-80"
                      >
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${isToday ? 'text-amber-800' : 'text-slate-400 group-hover:text-amber-600'}`}>
                          {day.dayNameShort}
                        </span>
                        <span className={`text-sm sm:text-base font-black leading-tight rounded-md px-1.5 py-0.5 mt-0.5 ${
                          isToday ? 'bg-amber-500 text-slate-950 shadow-2xs' : 'group-hover:bg-slate-200'
                        }`}>
                          {day.dayNum}
                        </span>
                      </button>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {displayedObras.length === 0 ? (
                <tr>
                  <td colSpan={daysOfMonthList.length + 1} className="p-8 text-center text-slate-500">
                    <p className="mb-2">No hay obras activas registradas en tu sesión.</p>
                    <button
                      type="button"
                      onClick={() => setIsManageObrasModalOpen(true)}
                      className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs inline-flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                    >
                      <Plus className="w-4 h-4" /> Crear Nueva Obra
                    </button>
                  </td>
                </tr>
              ) : (
                displayedObras.map((obra) => {
                  const obraId = obra[0];
                  const obraNombre = obra[1];
                  const obraColor = getObraColor(obraId, obras);
                  const obraTasksInMonth = monthTasks.filter(t => t.obra_id === obraId);
                  const obraCompletedCount = obraTasksInMonth.filter(t => t.completada).length;
                  const obraPct = obraTasksInMonth.length > 0 ? Math.round((obraCompletedCount / obraTasksInMonth.length) * 100) : 0;

                  return (
                    <tr key={obraId} className="hover:bg-slate-50/40 transition-colors">
                      {/* Celda fija de la obra */}
                      <td 
                        className="sticky left-0 z-10 bg-white p-2.5 sm:p-3.5 border-r border-slate-200 shadow-xs min-w-[140px] max-w-[160px] sm:min-w-[210px] sm:max-w-[240px] align-top"
                        style={{ borderLeft: `6px solid ${obraColor.border}` }}
                      >
                        <div className="font-extrabold text-slate-900 text-xs sm:text-sm leading-snug line-clamp-2 sm:truncate" title={obraNombre}>
                          {obraNombre}
                        </div>
                        <div className="mt-1.5 sm:mt-2 flex items-center justify-between text-[10px] sm:text-[11px] text-slate-500">
                          <span>{obraTasksInMonth.length} {obraTasksInMonth.length === 1 ? 'act.' : 'acts.'}</span>
                          {obraTasksInMonth.length > 0 && (
                            <span className="font-bold text-slate-700">{obraPct}%</span>
                          )}
                        </div>
                        {obraTasksInMonth.length > 0 && (
                          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1">
                            <div className="h-full rounded-full transition-all duration-300" style={{ width: `${obraPct}%`, backgroundColor: obraColor.border }} />
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => handleOpenNewTaskForDateAndObra(daysOfMonthList[0]?.dateStr || '', obraId)}
                          className="mt-2.5 sm:mt-3 text-[10px] sm:text-[11px] font-bold text-amber-600 hover:text-amber-800 flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                          <span className="truncate">Añadir</span>
                        </button>
                      </td>

                      {/* Celdas de cada día del mes */}
                      {daysOfMonthList.map((day) => {
                        const cellTasks = tasksByObraAndDate[obraId]?.[day.dateStr] || [];
                        const isToday = day.dateStr === todayExactDate;
                        const cellKey = `${obraId}-${day.dateStr}`;
                        const isDraggedOver = dragOverCell === cellKey;

                        return (
                          <td
                            key={day.dateStr}
                            onDragEnter={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (dragOverCell !== cellKey) setDragOverCell(cellKey);
                            }}
                            onDragOver={(e) => handleDragOverMonthlyCell(e, cellKey)}
                            onDragLeave={handleDragLeaveMonthlyCell}
                            onDrop={(e) => handleDropOnMonthlyMatrixCell(e, obraId, day.dateStr)}
                            className={`p-2 border-r border-slate-200 align-top min-w-[125px] sm:min-w-[135px] max-w-[170px] transition-all relative group/cell ${
                              isDraggedOver
                                ? 'bg-amber-100/90 ring-2 ring-amber-500 ring-inset shadow-inner'
                                : day.isWeekend
                                ? 'bg-slate-50/60'
                                : 'bg-white'
                            } ${isToday && !isDraggedOver ? 'bg-amber-50/30' : ''}`}
                          >
                            <div 
                              className="space-y-1.5 min-h-[70px]"
                              onDragOver={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                try { e.dataTransfer.dropEffect = 'move'; } catch (err) {}
                              }}
                            >
                              {/* Indicador visual al arrastrar sobre esta celda */}
                              {isDraggedOver && (
                                <div className="py-2 px-1 text-center bg-amber-200/95 border-2 border-dashed border-amber-600 rounded-lg text-[10px] font-black text-amber-950 animate-pulse pointer-events-none mb-1 shadow-xs">
                                  ↓ Soltar aquí ({day.dayNum} {MESES[monthViewDate.getMonth()].slice(0, 3)})
                                </div>
                              )}

                              {cellTasks.map((task) => {
                                const { userNotas: cleanNotas, aplazamientos: taskAplazamientos } = parseTaskNotas(task.notas);
                                return (
                                <div
                                  key={task.id}
                                  draggable={true}
                                  onDragStart={(e) => handleDragStart(e, task)}
                                  onDragEnd={() => {
                                    currentDraggedTask = null;
                                    try { if (typeof window !== 'undefined') window.__currentDraggedTask = null; } catch (err) {}
                                    setDraggedTask(null);
                                    setDragOverCell(null);
                                  }}
                                  className={`p-2 pb-6 lg:pb-2 rounded-lg border text-left transition-all shadow-2xs group/card relative cursor-grab active:cursor-grabbing select-none ${
                                    task.completada
                                      ? 'bg-slate-50 border-slate-200 text-slate-400'
                                      : 'bg-white border-slate-200 hover:border-amber-400 hover:shadow-xs'
                                  }`}
                                >
                                  {/* Cabecera de la mini tarjeta: Gremio, Grip y Checkbox */}
                                  <div className="flex items-center justify-between gap-1 mb-1">
                                    <div className="flex items-center gap-1 min-w-0">
                                      <span 
                                        className="p-0.5 rounded bg-slate-100 group-hover/card:bg-amber-100 text-slate-400 group-hover/card:text-amber-600 transition-colors shrink-0"
                                        title="Arrastra para mover a otro día u otra obra"
                                      >
                                        <GripVertical className="w-3.5 h-3.5" />
                                      </span>
                                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider truncate select-none ${getGremioTagClasses(task.gremio, task.completada)}`}>
                                        {task.gremio}
                                      </span>
                                    </div>
                                    <div 
                                      className="flex items-center gap-0.5 shrink-0" 
                                      onPointerDown={(e) => e.stopPropagation()} 
                                      onMouseDown={(e) => e.stopPropagation()}
                                    >
                                      <button
                                        type="button"
                                        onClick={() => handleToggleComplete(task)}
                                        title={task.completada ? 'Marcar pendiente' : 'Marcar completada'}
                                        className="cursor-pointer shrink-0 p-0.5"
                                      >
                                        {task.completada ? (
                                          <CheckSquare className="w-4 h-4 text-emerald-600" />
                                        ) : (
                                          <Square className="w-4 h-4 text-slate-300 hover:text-amber-500" />
                                        )}
                                      </button>
                                    </div>
                                  </div>

                                  {/* Actividad */}
                                  <p className={`font-semibold text-xs leading-snug line-clamp-2 select-none pointer-events-none ${task.completada ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                                    {task.actividad}
                                  </p>

                                  {/* Badge de aplazamientos */}
                                  {taskAplazamientos.length > 0 && (
                                    <div onPointerDown={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
                                      <button
                                        type="button"
                                        onClick={() => setSelectedTaskHistory({ task, aplazamientos: taskAplazamientos })}
                                        className="mt-1 inline-flex items-center gap-1 text-[8px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200 cursor-pointer"
                                        title={`No ejecutada en ${taskAplazamientos.length} ocasión(es). Clic para ver historial.`}
                                      >
                                        <AlertTriangle className="w-2.5 h-2.5 text-amber-600" />
                                        <span>No ejecutada ({taskAplazamientos.length})</span>
                                      </button>
                                    </div>
                                  )}

                                  {/* Notas limpias si existen */}
                                  {cleanNotas && (
                                    <p className="text-[10px] text-slate-500 italic mt-1 line-clamp-1 select-none pointer-events-none" title={cleanNotas}>
                                      💡 {cleanNotas}
                                    </p>
                                  )}

                                  {/* Croquis si existe */}
                                  {task.trazo_data && (
                                    <div onPointerDown={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
                                      <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); setTaskLightboxImage(task.trazo_data); }}
                                        className="mt-1 inline-flex items-center gap-1 text-[8px] font-bold px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100 cursor-pointer shadow-2xs"
                                        title="Ver croquis adjunto"
                                      >
                                        <PenTool className="w-2.5 h-2.5 text-amber-600" />
                                        <span>Ver croquis</span>
                                      </button>
                                    </div>
                                  )}

                                  {/* Botones para posponer/trasladar y editar (visibles siempre en táctil) */}
                                  <div 
                                    className="absolute bottom-1 right-1 opacity-100 lg:opacity-0 lg:group-hover/card:opacity-100 flex items-center gap-0.5 bg-white/95 rounded shadow-xs p-0.5 transition-opacity"
                                    onPointerDown={(e) => e.stopPropagation()}
                                    onMouseDown={(e) => e.stopPropagation()}
                                  >
                                    <button
                                      type="button"
                                      onClick={() => handleOpenPostponeModal(task)}
                                      title="Mover de día / No ejecutada"
                                      className="p-1 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded cursor-pointer"
                                    >
                                      <ArrowRightLeft className="w-3 h-3" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setEditingTask({ ...task, notas: cleanNotas, _aplazamientos: taskAplazamientos })}
                                      title="Editar actividad"
                                      className="p-1 text-slate-400 hover:text-amber-600 hover:bg-slate-50 rounded cursor-pointer"
                                    >
                                      <Edit className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                                );
                              })}

                              {/* Botón añadir en celda vacía o al final (visible en táctil) */}
                              <button
                                type="button"
                                onClick={() => handleOpenNewTaskForDateAndObra(day.dateStr, obraId)}
                                title={`Programar actividad para el ${day.dayNum} de ${MESES[monthViewDate.getMonth()]}`}
                                className="w-full py-1 rounded border border-dashed border-slate-200 text-slate-400 hover:border-amber-400 hover:text-amber-600 hover:bg-amber-50/50 flex items-center justify-center gap-1 transition-all cursor-pointer opacity-70 lg:opacity-0 lg:group-hover/cell:opacity-100"
                              >
                                <Plus className="w-3 h-3" />
                                <span className="text-[10px] font-bold">Añadir</span>
                              </button>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    )}

    {/* VISTA B: CUADRÍCULA CALENDARIO MENSUAL POR OBRAS */}
    {monthlyQuadrantMode === 'calendario' && (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-3.5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-2 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-amber-500 shrink-0" />
              <span>Vista Calendario — {MESES[monthViewDate.getMonth()]} {monthViewDate.getFullYear()}</span>
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-500">Actividades de cada día agrupadas y categorizadas por obra (desliza horizontalmente en móvil)</p>
          </div>
          <button
            type="button"
            onClick={() => setIsManageObrasModalOpen(true)}
            className="bg-white hover:bg-amber-50 hover:text-amber-900 hover:border-amber-300 text-slate-700 font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 border border-slate-200 shadow-2xs transition-all cursor-pointer shrink-0"
            title="Gestionar o añadir nuevas obras"
          >
            <Building className="w-3.5 h-3.5 text-amber-500" />
            <span>Gestionar / Crear Obras</span>
          </button>
        </div>

        {/* Contenedor con scroll horizontal en pantallas pequeñas para que las 7 columnas siempre sean legibles */}
        <div className="overflow-x-auto pb-2 -mx-1 px-1">
          <div className="min-w-[680px] md:min-w-0 space-y-2">
        {/* Cabecera de 7 días */}
        <div className="grid grid-cols-7 gap-2 text-center">
          {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map((d, i) => (
            <div key={d} className={`text-xs font-black uppercase tracking-wider py-2 rounded-lg ${
              i >= 5 ? 'bg-slate-100/60 text-slate-400' : 'bg-slate-100 text-slate-700'
            }`}>
              {d}
            </div>
          ))}
        </div>

        {/* Celdas del mes distribuidas por semanas */}
        <div className="grid grid-cols-7 gap-2">
          {(() => {
            // Generar cuadrícula completa con trailing y leading days
            const y = monthViewDate.getFullYear();
            const m = monthViewDate.getMonth();
            const firstDay = new Date(y, m, 1, 12);
            const firstDayWeekday = (firstDay.getDay() + 6) % 7; // 0=Lun, 6=Dom
            const daysInMonth = new Date(y, m + 1, 0).getDate();
            const daysInPrev = new Date(y, m, 0).getDate();

            const cells = [];
            // Prev month
            for (let i = firstDayWeekday - 1; i >= 0; i--) {
              const dNum = daysInPrev - i;
              const dateObj = new Date(y, m - 1, dNum, 12);
              const dateStr = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dNum).padStart(2, '0')}`;
              cells.push({ dateStr, dayNum: dNum, isCurrentMonth: false, dateObj });
            }
            // Current month
            for (let dNum = 1; dNum <= daysInMonth; dNum++) {
              const dateObj = new Date(y, m, dNum, 12);
              const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(dNum).padStart(2, '0')}`;
              cells.push({ dateStr, dayNum: dNum, isCurrentMonth: true, dateObj });
            }
            // Next month fill to multiple of 7
            const total = Math.ceil(cells.length / 7) * 7;
            const remaining = total - cells.length;
            for (let dNum = 1; dNum <= remaining; dNum++) {
              const dateObj = new Date(y, m + 1, dNum, 12);
              const dateStr = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dNum).padStart(2, '0')}`;
              cells.push({ dateStr, dayNum: dNum, isCurrentMonth: false, dateObj });
            }

            return cells.map((cell) => {
              const dayTasks = monthTasks.filter(t => getTaskExactDate(t) === cell.dateStr);
              const isToday = cell.dateStr === todayExactDate;
              // Agrupar tareas por obra
              const tasksByObraInCell = {};
              dayTasks.forEach(t => {
                if (!tasksByObraInCell[t.obra_id]) tasksByObraInCell[t.obra_id] = [];
                tasksByObraInCell[t.obra_id].push(t);
              });

              const isDraggedOver = dragOverCalendarDate === cell.dateStr;

              return (
                <div
                  key={cell.dateStr}
                  onDragEnter={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (dragOverCalendarDate !== cell.dateStr) setDragOverCalendarDate(cell.dateStr);
                  }}
                  onDragOver={(e) => handleDragOverCalendarDate(e, cell.dateStr)}
                  onDragLeave={handleDragLeaveCalendarDate}
                  onDrop={(e) => handleDropOnCalendarDate(e, cell.dateStr)}
                  className={`min-h-[140px] rounded-xl border p-2 flex flex-col justify-between transition-all relative ${
                    isDraggedOver
                      ? 'bg-amber-100/90 ring-2 ring-amber-500 ring-inset shadow-inner'
                      : !cell.isCurrentMonth
                      ? 'bg-slate-50/40 border-slate-100 text-slate-300'
                      : isToday
                      ? 'bg-amber-50/40 border-amber-300 ring-2 ring-amber-400'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div
                    className="space-y-2"
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      try { e.dataTransfer.dropEffect = 'move'; } catch (err) {}
                    }}
                  >
                    {/* Cabecera del día */}
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`text-sm font-black ${
                        isToday ? 'text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded' : cell.isCurrentMonth ? 'text-slate-800' : 'text-slate-300'
                      }`}>
                        {cell.dayNum}
                      </span>
                      {cell.isCurrentMonth && (
                        <button
                          type="button"
                          onClick={() => handleOpenNewTaskForDateAndObra(cell.dateStr)}
                          title="Añadir actividad este día"
                          className="p-1 text-slate-400 hover:text-amber-600 hover:bg-slate-100 rounded cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Indicador visual al arrastrar sobre este día */}
                    {isDraggedOver && (
                      <div className="py-2 px-1 text-center bg-amber-200/95 border-2 border-dashed border-amber-600 rounded-lg text-[10px] font-black text-amber-950 animate-pulse my-1 pointer-events-none shadow-xs">
                        ↓ Soltar aquí ({cell.dayNum} {MESES[cell.dateObj.getMonth()].slice(0, 3)})
                      </div>
                    )}

                    {/* Tareas agrupadas por obra */}
                    <div className="space-y-2">
                      {Object.keys(tasksByObraInCell).map((obraId) => {
                        const oColor = getObraColor(obraId, obras);
                        const oName = obras.find(o => o[0] === obraId)?.[1] || 'Obra';
                        const oTasks = tasksByObraInCell[obraId];

                        return (
                          <div key={obraId} className="space-y-1">
                            {/* Etiqueta de la obra */}
                            <div className="flex items-center gap-1 text-[10px] font-extrabold truncate select-none" style={{ color: oColor.text }}>
                              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: oColor.border }} />
                              <span className="truncate">{oName}</span>
                            </div>

                            {/* Actividades de esa obra */}
                            {oTasks.map(task => {
                              const { userNotas: cleanNotas, aplazamientos: taskAplazamientos } = parseTaskNotas(task.notas);
                              return (
                              <div
                                key={task.id}
                                draggable={true}
                                onDragStart={(e) => handleDragStart(e, task)}
                                onDragEnd={() => {
                                  currentDraggedTask = null;
                                  try { if (typeof window !== 'undefined') window.__currentDraggedTask = null; } catch (err) {}
                                  setDraggedTask(null);
                                  setDragOverCalendarDate(null);
                                }}
                                className={`p-1.5 rounded-md border text-left text-xs group/card relative cursor-grab active:cursor-grabbing select-none ${
                                  task.completada
                                    ? 'bg-slate-50 border-slate-200 text-slate-400 line-through'
                                    : 'bg-white border-slate-200 hover:border-amber-300 shadow-2xs'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-1">
                                  <div className="flex items-center gap-1 min-w-0">
                                    <span 
                                      className="p-0.5 rounded bg-slate-100 group-hover/card:bg-amber-100 text-slate-400 group-hover/card:text-amber-600 transition-colors shrink-0"
                                      title="Arrastra para mover a otro día"
                                    >
                                      <GripVertical className="w-3 h-3" />
                                    </span>
                                    <span className={`text-[8px] font-bold px-1 rounded uppercase truncate select-none ${getGremioTagClasses(task.gremio, task.completada)}`}>
                                      {task.gremio}
                                    </span>
                                  </div>
                                  <div 
                                    className="flex items-center gap-0.5 shrink-0" 
                                    onPointerDown={(e) => e.stopPropagation()}
                                    onMouseDown={(e) => e.stopPropagation()}
                                  >
                                    <button
                                      type="button"
                                      onClick={() => handleOpenPostponeModal(task)}
                                      title="Mover de día / No ejecutada"
                                      className="cursor-pointer text-slate-400 hover:text-amber-600 transition-colors p-0.5"
                                    >
                                      <ArrowRightLeft className="w-3 h-3" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleToggleComplete(task)}
                                      className="cursor-pointer shrink-0 p-0.5"
                                    >
                                      {task.completada ? (
                                        <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
                                      ) : (
                                        <Square className="w-3.5 h-3.5 text-slate-300 hover:text-amber-500" />
                                      )}
                                    </button>
                                  </div>
                                </div>
                                <p className="font-semibold text-[11px] mt-0.5 line-clamp-2 leading-tight select-none pointer-events-none">
                                  {task.actividad}
                                </p>
                                {taskAplazamientos.length > 0 && (
                                  <div onPointerDown={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
                                    <button
                                      type="button"
                                      onClick={() => setSelectedTaskHistory({ task, aplazamientos: taskAplazamientos })}
                                      className="mt-1 inline-flex items-center gap-0.5 text-[8px] font-bold px-1 py-0.2 rounded bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200 cursor-pointer"
                                      title={`No ejecutada en ${taskAplazamientos.length} ocasión(es)`}
                                    >
                                      <AlertTriangle className="w-2.5 h-2.5 text-amber-600" />
                                      <span>No ejecutada ({taskAplazamientos.length})</span>
                                    </button>
                                  </div>
                                )}
                                {task.trazo_data && (
                                  <div onPointerDown={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
                                    <button
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); setTaskLightboxImage(task.trazo_data); }}
                                      className="mt-1 inline-flex items-center gap-0.5 text-[8px] font-bold px-1 py-0.2 rounded bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100 cursor-pointer shadow-2xs"
                                      title="Ver croquis adjunto"
                                    >
                                      <PenTool className="w-2.5 h-2.5 text-amber-600" />
                                      <span>Croquis</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {cell.isCurrentMonth && dayTasks.length > 0 && (
                    <button
                      type="button"
                      onClick={() => jumpToWeekFromDate(cell.dateStr)}
                      className="mt-2 text-[10px] font-bold text-amber-600 hover:text-amber-800 text-left cursor-pointer"
                    >
                      → Ver semana
                    </button>
                  )}
                </div>
              );
            });
          })()}
        </div>
          </div>
        </div>
      </div>
    )}
  </div>
)}

{/* VISTA: BLOC DE NOTAS & CHECKLIST */}
{activeView === 'notas' && (
  <NotasView
    notas={notasList}
    obras={obras.map(o => ({ id: o[0], nombre: o[1], activo: o[2] }))}
    onAddNota={handleAddNota}
    onUpdateNota={handleUpdateNota}
    onDeleteNota={handleDeleteNota}
    onConvertToTask={handleConvertNotaToTask}
    currentWeekMonday={currentWeekMonday}
  />
)}

{/* BARRA DE NAVEGACIÓN INFERIOR FIJA PARA MÓVILES (Oculta en Tablet/Escritorio e Impresión) */}
<div className="md:hidden print:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 pt-1.5 safe-bottom shadow-[0_-4px_20px_rgba(15,23,42,0.08)]">
  <div className="grid grid-cols-5 items-center gap-1 max-w-md mx-auto">
    <button
      type="button"
      onClick={() => setActiveView('semanal')}
      className={`flex flex-col items-center justify-center py-1 rounded-xl transition-colors cursor-pointer ${
        activeView === 'semanal' ? 'text-amber-600 font-extrabold' : 'text-slate-500 font-medium'
      }`}
    >
      <Columns3 className="w-5 h-5" />
      <span className="text-[10px] mt-0.5">Semanal</span>
    </button>

    <button
      type="button"
      onClick={() => setActiveView('mensual')}
      className={`flex flex-col items-center justify-center py-1 rounded-xl transition-colors cursor-pointer ${
        activeView === 'mensual' ? 'text-amber-600 font-extrabold' : 'text-slate-500 font-medium'
      }`}
    >
      <Calendar className="w-5 h-5" />
      <span className="text-[10px] mt-0.5">Mensual</span>
    </button>

    <button
      type="button"
      onClick={() => setIsNewTaskModalOpen(true)}
      className="flex flex-col items-center justify-center -mt-4 cursor-pointer"
    >
      <div className="w-11 h-11 rounded-2xl bg-slate-900 text-amber-400 flex items-center justify-center shadow-lg shadow-slate-900/30 ring-4 ring-white">
        <Plus className="w-6 h-6" />
      </div>
      <span className="text-[10px] font-bold text-slate-900 mt-0.5">Añadir</span>
    </button>

    <button
      type="button"
      onClick={() => setActiveView('notas')}
      className={`relative flex flex-col items-center justify-center py-1 rounded-xl transition-colors cursor-pointer ${
        activeView === 'notas' ? 'text-amber-600 font-extrabold' : 'text-slate-500 font-medium'
      }`}
    >
      <NotebookPen className="w-5 h-5" />
      <span className="text-[10px] mt-0.5">Notas</span>
      {pendingNotasCount > 0 && (
        <span className="absolute top-0.5 right-2 w-4 h-4 bg-amber-500 text-slate-950 font-black text-[9px] rounded-full flex items-center justify-center animate-pulse">
          {pendingNotasCount > 9 ? '9+' : pendingNotasCount}
        </span>
      )}
    </button>

    <button
      type="button"
      onClick={() => { setMobileReportTab('preview'); setIsReportModalOpen(true); }}
      className="flex flex-col items-center justify-center py-1 rounded-xl text-slate-500 hover:text-amber-600 font-medium transition-colors cursor-pointer"
    >
      <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
      <span className="text-[10px] mt-0.5">Informe</span>
    </button>
  </div>
</div>

{/* MODAL: SMART VOICE DICTATION */}
{isDictatingModalOpen && (
<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
<div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
{/* Header */}
<div className="bg-slate-900 text-white p-5 flex justify-between items-center">
<div className="flex items-center gap-2">
<Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
<h3 className="font-bold text-lg">Asistente Inteligente de Dictado</h3>
</div>
<button onClick={() => setIsDictatingModalOpen(false)} className="text-slate-400 hover:text-white p-1 rounded-lg hover:cursor-pointer border-none bg-transparent">
<X className="w-5 h-5" />
</button>
</div>
{/* Body */}
<div className="p-6 overflow-y-auto space-y-6 flex-1 min-h-[300px]">
{/* Mic interaction section */}
<div className="flex flex-col items-center justify-center p-6 bg-slate-50 border border-slate-200 rounded-xl text-center">
<button
onClick={toggleListening}
className={`w-20 h-20 rounded-full flex items-center justify-center transition-all border-none ${
isListening
? 'bg-red-500 text-white shadow-xl shadow-red-500/20 animate-pulse scale-105'
: 'bg-amber-500 hover:bg-amber-600 text-slate-950 hover:cursor-pointer shadow-lg shadow-amber-500/10'
}`}
>
{isListening ? <MicOff className="w-10 h-10" /> : <Mic className="w-10 h-10" />}
</button>
<h4 className="mt-4 font-bold text-slate-900 text-sm">
{isListening ? 'Escuchando tu dictado... Habla de forma natural' : 'Haz clic en el micro para empezar a dictar'}
</h4>
<p className="text-[11px] text-slate-400 mt-1">Usa la Web Speech API de tu navegador para capturar tu voz.</p>
</div>
{/* Sample prompts */}
<div className="bg-amber-50/50 border border-amber-100 p-4 rounded-lg">
<span className="text-xs font-bold text-amber-800 block mb-1 uppercase tracking-wider">💡 Sugerencia de dictado:</span>
<p className="text-xs italic text-slate-600">
"El lunes en Salamanca 50 pintar el techo del hall de entrada. Para el miércoles en Hotel Erre tirar tabiquería de yeso y el viernes limpieza profunda en general."
</p>
</div>
{/* Transcript Output / Direct Input box */}
<div>
<label className="block text-xs font-bold text-slate-500 uppercase mb-2">Editor del Dictado</label>
<textarea
value={transcript}
onChange={(e) => setTranscript(e.target.value)}
placeholder="El texto dictado aparecerá aquí, también puedes escribirlo a mano directamente..."
className="w-full h-32 bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all resize-y"
/>
</div>
{/* AI Parsing Button */}
{transcript.trim() && (
<div className="flex justify-center">
<button
onClick={parseDictationWithAI}
disabled={isParsingSpeech}
className="bg-slate-900 text-white font-semibold hover:bg-slate-800 hover:cursor-pointer px-5 py-2.5 rounded-xl flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none border-none"
>
{isParsingSpeech ? (
<>
<RefreshCw className="w-4 h-4 animate-spin text-amber-500" />
<span>Procesando con IA...</span>
</>
) : (
<>
<Sparkles className="w-4 h-4 text-amber-400" />
<span>Estructurar Plan con IA</span>
</>
)}
</button>
</div>
)}
{/* Parsed Activities PREVIEW */}
{parsedTasks.length > 0 && (
<div className="space-y-3 border-t border-slate-100 pt-5">
<div className="flex justify-between items-center mb-2">
<h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
<CheckSquare className="w-4 h-4 text-emerald-500" />
Revisar Tareas antes de Generar
</h4>
<span className="text-xs font-bold text-slate-400">{parsedTasks.length} detectadas</span>
</div>
<div className="space-y-2 max-h-[250px] overflow-y-auto">
{parsedTasks.map((pt, i) => {
const matchedObra = obras.find(o => o[0] === pt.obra_id);
return (
<div key={i} className="p-3 bg-emerald-50/10 border border-emerald-100 rounded-lg flex items-start gap-2.5 text-xs">
<div className="flex-1 space-y-1">
<div className="flex items-center gap-1.5 flex-wrap">
<span className="bg-amber-500 text-slate-950 font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-wide text-[9px]">{pt.dia_semana}</span>
<span className={`font-bold px-1.5 py-0.5 rounded-sm uppercase text-[9px] ${getGremioTagClasses(pt.gremio)}`}>{pt.gremio}</span>
<span className="text-[10px] text-slate-500 font-semibold">• 🚧 {matchedObra ? matchedObra[1] : 'Obra Salamanca 50'}</span>
</div>
<p className="font-bold text-slate-800">{pt.actividad}</p>
{pt.notas && <p className="text-[10px] text-slate-400 italic">💡 {pt.notas}</p>}
</div>
<button
onClick={() => removeParsedTaskPreview(i)}
className="text-slate-400 hover:text-red-500 hover:cursor-pointer p-0.5 border-none bg-transparent"
>
<Trash2 className="w-4 h-4" />
</button>
</div>
);
})}
</div>
<div className="bg-slate-100 p-3 rounded-lg flex items-center justify-between mt-4">
<span className="text-xs text-slate-500 font-medium">¿Todo correcto para guardarlo en tu checklist?</span>
<button
onClick={saveParsedTasks}
className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-lg text-xs hover:cursor-pointer transition-all border-none"
>
Insertar Tareas en Calendario
</button>
</div>
</div>
)}
</div>
{/* Footer */}
<div className="bg-slate-50 p-4 border-t border-slate-200 flex justify-end gap-2">
<button
onClick={() => setIsDictatingModalOpen(false)}
className="bg-slate-200 hover:bg-slate-300 text-slate-800 px-4 py-2 text-xs font-semibold rounded-lg hover:cursor-pointer border-none"
>
Cancelar
</button>
</div>
</div>
</div>
)}
{/* MODAL: MANUAL TASK CREATION */}
{isNewTaskModalOpen && (
<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
<div className="bg-white rounded-xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden">
<div className="bg-slate-900 text-white p-4 flex justify-between items-center">
<h3 className="font-bold">Nueva Actividad Semanal</h3>
<button onClick={() => setIsNewTaskModalOpen(false)} className="text-slate-400 hover:text-white hover:cursor-pointer border-none bg-transparent">
<X className="w-5 h-5" />
</button>
</div>
<form onSubmit={handleAddManualTask} className="p-5 space-y-4">
<div>
<label className="block text-xs font-bold text-slate-500 uppercase mb-1">Día de Programación</label>
<select
value={manualTask.dia_semana}
onChange={(e) => setManualTask(prev => ({ ...prev, dia_semana: e.target.value }))}
className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm"
>
{DIAS_SEMANA.map(d => <option key={d} value={d}>{d}</option>)}
</select>
</div>
<div>
<div className="flex justify-between items-center mb-1">
  <label className="block text-xs font-bold text-slate-500 uppercase">Gremio / Subcontratista</label>
  <button
    type="button"
    onClick={() => {
      setGremioTargetContext('manual');
      setIsManageGremiosModalOpen(true);
    }}
    className="text-[11px] font-bold text-amber-600 hover:text-amber-800 flex items-center gap-1 cursor-pointer bg-transparent border-none"
  >
    <Plus className="w-3 h-3" /> Crear / Gestionar
  </button>
</div>
<select
value={manualTask.gremio}
onChange={(e) => {
  if (e.target.value === '__NEW__') {
    setGremioTargetContext('manual');
    setIsManageGremiosModalOpen(true);
  } else {
    setManualTask(prev => ({ ...prev, gremio: e.target.value }));
  }
}}
className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm"
>
{allGremios.map(g => (
  <option key={g} value={g}>
    {g === 'ENUE' ? '🏢 ENUE (Propio)' : g}
  </option>
))}
<option value="__NEW__" className="text-amber-600 font-bold">
  ➕ Crear nuevo gremio / subcontratista...
</option>
</select>
</div>
<div>
<div className="flex justify-between items-center mb-1">
  <label className="block text-xs font-bold text-slate-500 uppercase">Obra Asignada</label>
  <button
    type="button"
    onClick={() => setIsManageObrasModalOpen(true)}
    className="text-[11px] font-bold text-amber-600 hover:text-amber-800 flex items-center gap-1 cursor-pointer"
  >
    <Plus className="w-3 h-3" /> Crear / Gestionar Obras
  </button>
</div>
{obras.length === 0 ? (
  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-center justify-between">
    <span>⚠️ No tienes obras registradas.</span>
    <button
      type="button"
      onClick={() => { setIsNewTaskModalOpen(false); setIsManageObrasModalOpen(true); }}
      className="font-bold underline text-amber-800 hover:text-amber-950 cursor-pointer border-none bg-transparent"
    >
      + Registrar Obra
    </button>
  </div>
) : (
  <select
    value={manualTask.obra_id || (obras[0] ? obras[0][0] : '')}
    onChange={(e) => setManualTask(prev => ({ ...prev, obra_id: e.target.value }))}
    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm"
    required
  >
    {obras.map(o => <option key={o[0]} value={o[0]}>{o[1]}</option>)}
  </select>
)}
</div>
<div>
<label className="block text-xs font-bold text-slate-500 uppercase mb-1">Descripción de Actividad</label>
<input
type="text"
value={manualTask.actividad}
onChange={(e) => setManualTask(prev => ({ ...prev, actividad: e.target.value }))}
placeholder="ej. Hormigonado de pilares fase B"
required
className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
/>
</div>
<div>
<label className="block text-xs font-bold text-slate-500 uppercase mb-1">Notas / Detalles Adicionales</label>
<textarea
value={manualTask.notas}
onChange={(e) => setManualTask(prev => ({ ...prev, notas: e.target.value }))}
placeholder="ej. Traer probetas para el ensayo antes de vertido"
className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm h-20 resize-none"
/>
</div>
<div className="flex justify-end gap-2 pt-4">
<button
type="button"
onClick={() => setIsNewTaskModalOpen(false)}
className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 text-xs font-semibold rounded-lg hover:cursor-pointer border-none"
>
Cancelar
</button>
<button
type="submit"
className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-4 py-2 text-xs rounded-lg hover:cursor-pointer border-none"
>
Crear Actividad
</button>
</div>
</form>
</div>
</div>
)}
{/* MODAL: EDIT TASK */}
{editingTask && (
<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
<div className="bg-white rounded-xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden">
<div className="bg-slate-900 text-white p-4 flex justify-between items-center">
<h3 className="font-bold">Editar Actividad</h3>
<button type="button" onClick={() => setEditingTask(null)} className="text-slate-400 hover:text-white hover:cursor-pointer border-none bg-transparent">
<X className="w-5 h-5" />
</button>
</div>
<form onSubmit={handleUpdateTask} className="p-5 space-y-4">
<div>
<label className="block text-xs font-bold text-slate-500 uppercase mb-1">Día de Programación</label>
<select
value={editingTask.dia_semana}
onChange={(e) => setEditingTask(prev => ({ ...prev, dia_semana: e.target.value }))}
className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm"
>
{DIAS_SEMANA.map(d => <option key={d} value={d}>{d}</option>)}
</select>
</div>
<div>
<div className="flex justify-between items-center mb-1">
  <label className="block text-xs font-bold text-slate-500 uppercase">Gremio / Subcontratista</label>
  <button
    type="button"
    onClick={() => {
      setGremioTargetContext('edit');
      setIsManageGremiosModalOpen(true);
    }}
    className="text-[11px] font-bold text-amber-600 hover:text-amber-800 flex items-center gap-1 cursor-pointer bg-transparent border-none"
  >
    <Plus className="w-3 h-3" /> Crear / Gestionar
  </button>
</div>
<select
value={editingTask.gremio}
onChange={(e) => {
  if (e.target.value === '__NEW__') {
    setGremioTargetContext('edit');
    setIsManageGremiosModalOpen(true);
  } else {
    setEditingTask(prev => ({ ...prev, gremio: e.target.value }));
  }
}}
className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm"
>
{allGremios.map(g => (
  <option key={g} value={g}>
    {g === 'ENUE' ? '🏢 ENUE (Propio)' : g}
  </option>
))}
<option value="__NEW__" className="text-amber-600 font-bold">
  ➕ Crear nuevo gremio / subcontratista...
</option>
</select>
</div>
<div>
<div className="flex justify-between items-center mb-1">
  <label className="block text-xs font-bold text-slate-500 uppercase">Obra Asignada</label>
  <button
    type="button"
    onClick={() => setIsManageObrasModalOpen(true)}
    className="text-[11px] font-bold text-amber-600 hover:text-amber-800 flex items-center gap-1 cursor-pointer"
  >
    <Building className="w-3 h-3" /> Gestionar obras
  </button>
</div>
<select
value={editingTask.obra_id}
onChange={(e) => setEditingTask(prev => ({ ...prev, obra_id: e.target.value }))}
className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm"
required
>
{obras.map(o => <option key={o[0]} value={o[0]}>{o[1]}</option>)}
</select>
</div>
<div>
<label className="block text-xs font-bold text-slate-500 uppercase mb-1">Descripción de Actividad</label>
<input
type="text"
value={editingTask.actividad}
onChange={(e) => setEditingTask(prev => ({ ...prev, actividad: e.target.value }))}
required
className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
/>
</div>
<div>
<label className="block text-xs font-bold text-slate-500 uppercase mb-1">Notas / Detalles Adicionales</label>
<textarea
value={editingTask.notas || ''}
onChange={(e) => setEditingTask(prev => ({ ...prev, notas: e.target.value }))}
className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm h-20 resize-none"
/>
</div>
<div className="flex justify-end gap-2 pt-4">
<button
type="button"
onClick={() => setEditingTask(null)}
className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 text-xs font-semibold rounded-lg hover:cursor-pointer border-none"
>
Cancelar
</button>
<button
type="submit"
className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-4 py-2 text-xs rounded-lg hover:cursor-pointer border-none"
>
Guardar Cambios
</button>
</div>
</form>
</div>
</div>
)}
{/* MODAL: MOVE TASK */}
{moveTask && (
<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
<div className="bg-white rounded-xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden">
<div className="bg-slate-900 text-white p-4 flex justify-between items-center">
<h3 className="font-bold">Mover actividad a otra semana</h3>
<button onClick={() => setMoveTask(null)} className="text-slate-400 hover:text-white hover:cursor-pointer border-none bg-transparent"><X className="w-5 h-5" /></button>
</div>
<form onSubmit={(e) => { e.preventDefault(); handleMoveTask(moveTask, moveTargetWeek, moveTargetDay); }} className="p-5 space-y-4">
<div className="bg-amber-50 border border-amber-100 rounded-lg p-3 text-xs text-amber-800">La tarea se moverá a la semana y día seleccionados; no se duplicará.</div>
<div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Semana de destino</label><input type="date" value={moveTargetWeek} onChange={(e) => setMoveTargetWeek(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm" required /></div>
<div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Día de destino</label><select value={moveTargetDay} onChange={(e) => setMoveTargetDay(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm">{DIAS_SEMANA.map(d => <option key={d} value={d}>{d}</option>)}</select></div>
<div className="flex justify-end gap-2 pt-4"><button type="button" onClick={() => setMoveTask(null)} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 text-xs font-semibold rounded-lg hover:cursor-pointer border-none">Cancelar</button><button type="submit" className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-4 py-2 text-xs rounded-lg hover:cursor-pointer border-none">Mover actividad</button></div>
</form>
</div>
</div>
)}
{/* MODAL: COPY TASK */}
{copyingTask && (
<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
<div className="bg-white rounded-xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden">
<div className="bg-slate-900 text-white p-4 flex justify-between items-center"><h3 className="font-bold">Copiar actividad a otra semana</h3><button onClick={() => setCopyingTask(null)} className="text-slate-400 hover:text-white hover:cursor-pointer border-none bg-transparent"><X className="w-5 h-5" /></button></div>
<form onSubmit={(e) => { e.preventDefault(); handleCopyTask(copyingTask, copyTargetWeek, targetCopyDay); }} className="p-5 space-y-4">
<div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Actividad original</label><div className="w-full bg-slate-100 border border-slate-200 rounded-lg p-3 text-sm text-slate-700 font-medium">{copyingTask.actividad}</div></div>
<div className="bg-amber-50 border border-amber-100 rounded-lg p-3 text-xs text-amber-800">La copia será una actividad independiente. Podrás editarla sin modificar la tarea original.</div>
<div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Semana de destino</label><input type="date" value={copyTargetWeek} onChange={(e) => setCopyTargetWeek(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm" required /></div>
<div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Día de destino</label><select value={targetCopyDay} onChange={(e) => setTargetCopyDay(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm">{DIAS_SEMANA.map(d => <option key={d} value={d}>{d}</option>)}</select></div>
<div className="flex justify-end gap-2 pt-4"><button type="button" onClick={() => setCopyingTask(null)} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 text-xs font-semibold rounded-lg hover:cursor-pointer border-none">Cancelar</button><button type="submit" className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-4 py-2 text-xs rounded-lg hover:cursor-pointer border-none">Crear copia independiente</button></div>
</form>
</div>
</div>
)}
{/* MODAL: POSTPONE TASK / REGISTRAR INCIDENCIA DE NO EJECUCIÓN */}
{isPostponeModalOpen && postponeTask && (() => {
  const { aplazamientos: prevAplazamientos } = parseTaskNotas(postponeTask.notas);
  const currentExactDate = getTaskExactDate(postponeTask);
  
  const targetMonday = getMonday(postponeTargetWeek);
  const dayOffset = DIAS_SEMANA_OFFSET[postponeTargetDay] ?? 0;
  const mParts = targetMonday.split('-').map(Number);
  const targetDateObj = new Date(mParts[0], mParts[1] - 1, mParts[2] + dayOffset, 12);
  const targetExactDate = `${targetDateObj.getFullYear()}-${String(targetDateObj.getMonth() + 1).padStart(2, '0')}-${String(targetDateObj.getDate()).padStart(2, '0')}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="bg-slate-900 text-white p-5 flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg">No Ejecutada / Trasladar Actividad</h3>
              <p className="text-xs text-slate-400">Registrar motivo de incumplimiento y reprogramar</p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={() => setIsPostponeModalOpen(false)} 
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer border-none bg-transparent"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleConfirmPostpone} className="p-5 sm:p-6 space-y-4">
          {/* Tarjeta de la tarea en cuestión */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${getGremioTagClasses(postponeTask.gremio)}`}>
                {postponeTask.gremio}
              </span>
              <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                <Building className="w-3.5 h-3.5 text-slate-400" />
                {postponeTask.obra_nombre}
              </span>
              {prevAplazamientos.length > 0 && (
                <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300">
                  ⚠️ Ya aplazada {prevAplazamientos.length} {prevAplazamientos.length === 1 ? 'vez' : 'veces'}
                </span>
              )}
            </div>
            <p className="font-bold text-slate-900 text-sm">{postponeTask.actividad}</p>
            <p className="text-xs text-slate-500">
              Fecha prevista que no se ejecutó: <strong className="text-slate-800">{postponeTask.dia_semana} ({formatFriendlyDate(currentExactDate)})</strong>
            </p>
          </div>

          {/* Espacio para escribir el motivo y observaciones */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span>Motivo / Explicación de la no ejecución <span className="text-red-500">*</span></span>
              <span className="text-[10px] font-normal text-slate-400">Describe qué ocurrió en la obra</span>
            </label>
            <textarea
              value={postponeObservaciones}
              onChange={(e) => setPostponeObservaciones(e.target.value)}
              placeholder="Escribe aquí el motivo o causas de la no ejecución (ej: El camión de mortero no llegó a tiempo, o la lluvia impidió hormigonar...)"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 h-22 resize-none leading-relaxed"
              required={postponeSelectedTags.length === 0}
            />
          </div>

          {/* Categorización con Tags (etiquetas existentes y nuevas) */}
          <div className="space-y-2.5 bg-slate-50/80 p-3.5 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-amber-500" />
                Categorizar con Etiquetas (Tags)
              </label>
              {postponeSelectedTags.length > 0 && (
                <span className="text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full">
                  {postponeSelectedTags.length} {postponeSelectedTags.length === 1 ? 'seleccionada' : 'seleccionadas'}
                </span>
              )}
            </div>

            <p className="text-[11px] text-slate-500 leading-tight">
              Pulsa sobre las etiquetas existentes para seleccionarlas o deseleccionarlas, o añade una nueva:
            </p>

            {/* Nube de etiquetas seleccionables */}
            <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1.5 bg-white rounded-lg border border-slate-200">
              {allAvailableTags.map((tag) => {
                const isSelected = postponeSelectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleToggleTag(tag)}
                    className={`px-2.5 py-1 rounded-lg text-xs transition-all cursor-pointer flex items-center gap-1 border ${
                      isSelected
                        ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-2xs font-extrabold'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200 hover:border-slate-300 font-medium'
                    }`}
                  >
                    {isSelected ? <Check className="w-3 h-3 text-slate-950" /> : <span className="text-slate-400">#</span>}
                    <span>{tag}</span>
                  </button>
                );
              })}
            </div>

            {/* Input para crear nueva etiqueta */}
            <div className="flex items-center gap-2 pt-1">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={postponeCustomTagInput}
                  onChange={(e) => setPostponeCustomTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddNewTag();
                    }
                  }}
                  placeholder="Escribe una nueva etiqueta y pulsa Añadir..."
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <button
                type="button"
                onClick={handleAddNewTag}
                disabled={!postponeCustomTagInput.trim()}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg flex items-center gap-1 cursor-pointer transition-colors shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                Añadir tag
              </button>
            </div>
          </div>

          {/* Reprogramación / Traslado */}
          <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                <CalendarRange className="w-4 h-4 text-amber-600" />
                Nueva fecha de traslado
              </label>
              {/* Botón rápido para día siguiente */}
              <button
                type="button"
                onClick={() => {
                  const parts = (currentExactDate || '').split('-').map(Number);
                  const baseDate = parts.length === 3 ? new Date(parts[0], parts[1] - 1, parts[2], 12) : new Date();
                  const nextDay = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() + 1, 12);
                  if (nextDay.getDay() === 6) nextDay.setDate(nextDay.getDate() + 2);
                  if (nextDay.getDay() === 0) nextDay.setDate(nextDay.getDate() + 1);
                  const mon = getMonday(nextDay);
                  const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
                  setPostponeTargetWeek(mon);
                  setPostponeTargetDay(dayNames[nextDay.getDay()] || 'Lunes');
                }}
                className="text-[10px] font-bold bg-amber-200/80 hover:bg-amber-300 text-amber-950 px-2 py-0.5 rounded-md cursor-pointer transition-colors"
              >
                + Trasladar a mañana
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <span className="block text-[11px] font-semibold text-slate-600 mb-1">Semana de destino</span>
                <input
                  type="date"
                  value={postponeTargetWeek}
                  onChange={(e) => setPostponeTargetWeek(getMonday(e.target.value))}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-medium text-slate-800"
                  required
                />
              </div>
              <div>
                <span className="block text-[11px] font-semibold text-slate-600 mb-1">Día de destino</span>
                <select
                  value={postponeTargetDay}
                  onChange={(e) => setPostponeTargetDay(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-medium text-slate-800"
                >
                  {DIAS_SEMANA.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>

            {postponeTargetObraId && postponeTargetObraId !== postponeTask.obra_id && (
              <div className="text-xs text-amber-900 bg-amber-100/80 p-2 rounded-lg border border-amber-300 font-semibold flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                <span>Obra de destino: <strong className="text-slate-950">{obras.find(o => o[0] === postponeTargetObraId)?.[1] || 'Obra Seleccionada'}</strong></span>
              </div>
            )}

            <div className="text-xs text-amber-900 bg-white/80 p-2 rounded-lg border border-amber-200/60 font-medium flex items-center gap-1.5">
              <ArrowRight className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>Quedará reprogramada para: <strong className="text-slate-900">{postponeTargetDay}, {formatFriendlyDate(targetExactDate)}</strong></span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsPostponeModalOpen(false)}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 text-xs font-semibold rounded-xl cursor-pointer border-none"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-4 py-2 text-xs rounded-xl cursor-pointer border-none flex items-center gap-1.5 shadow-md shadow-amber-500/20"
            >
              <AlertTriangle className="w-4 h-4" />
              Confirmar Traslado y Registrar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
})()}

{/* MODAL: HISTORIAL DE NO EJECUCIÓN Y TRASLADOS */}
{selectedTaskHistory && (() => {
  const { task, aplazamientos } = selectedTaskHistory;
  const currentExactDate = getTaskExactDate(task);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs"
      onClick={(e) => { if (e.target === e.currentTarget) setSelectedTaskHistory(null); }}
    >
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150">
        <div className="bg-slate-900 text-white p-5 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl">
              <History className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg">Historial de Incidencias y Repasos</h3>
              <p className="text-xs text-slate-400">Registro de fechas y motivos de no ejecución</p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={() => setSelectedTaskHistory(null)} 
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer border-none bg-transparent"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {/* Cabecera de la tarea */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${getGremioTagClasses(task.gremio)}`}>
                {task.gremio}
              </span>
              <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                <Building className="w-3.5 h-3.5 text-slate-400" />
                {task.obra_nombre}
              </span>
            </div>
            <h4 className="font-bold text-slate-900 text-base">{task.actividad}</h4>
            <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-xs">
              <span className="text-slate-500">Estado actual:</span>
              <span className={`font-bold ${task.completada ? 'text-emerald-700' : 'text-amber-700'}`}>
                {task.completada ? '✓ Completada' : '⏳ Pendiente de ejecutar'}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Programada actualmente:</span>
              <span className="font-bold text-slate-800">
                {task.dia_semana} · {formatFriendlyDate(currentExactDate)}
              </span>
            </div>
          </div>

          {/* Línea de tiempo de incidencias */}
          <div className="space-y-3">
            <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              Incidencias registradas ({aplazamientos.length})
            </h5>

            {aplazamientos.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-4 bg-slate-50 rounded-xl">
                No hay aplazamientos registrados para esta actividad.
              </p>
            ) : (
              <div className="space-y-2.5">
                {aplazamientos.map((apl, idx) => (
                  <div key={apl.id || idx} className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/40 space-y-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="bg-amber-500 text-slate-950 font-black text-[10px] px-2 py-0.5 rounded-md uppercase">
                        Intento #{idx + 1}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400">
                          {apl.fecha_registro ? new Date(apl.fecha_registro).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                        <button
                          type="button"
                          onClick={() => setIncidentToDelete({ task, incident: apl, index: idx })}
                          className="text-rose-600 hover:text-rose-800 hover:bg-rose-100/80 px-2 py-0.5 rounded-md border border-rose-200 transition-colors cursor-pointer flex items-center gap-1 text-[10px] font-bold"
                          title="Eliminar o revertir esta incidencia"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Eliminar</span>
                        </button>
                      </div>
                    </div>

                    <div className="text-xs space-y-1">
                      <div className="flex items-baseline gap-1 text-slate-700">
                        <span className="font-bold text-slate-500">Fecha no ejecutada:</span>
                        <span className="font-semibold text-rose-700">{apl.dia_anterior} {formatFriendlyDate(apl.fecha_anterior)}</span>
                      </div>
                      <div className="flex items-start gap-1.5 text-slate-700">
                        <span className="font-bold text-slate-500 shrink-0 text-xs mt-0.5">Etiquetas:</span>
                        <div className="flex flex-wrap gap-1">
                          {(Array.isArray(apl.tags) && apl.tags.length > 0
                            ? apl.tags
                            : (apl.motivo ? apl.motivo.split(',').map(s => s.trim()).filter(Boolean) : ['General'])
                          ).map(t => (
                            <span key={t} className="font-bold text-amber-950 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-md text-[10px]">
                              #{t}
                            </span>
                          ))}
                        </div>
                      </div>
                      {apl.detalle && (
                        <div className="bg-white/90 p-2.5 rounded-lg border border-slate-200 text-slate-800 italic text-[11px] leading-relaxed">
                          "{apl.detalle}"
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 text-slate-700 pt-1">
                        <ArrowRight className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span className="font-bold text-slate-500">Trasladada a:</span>
                        <span className="font-bold text-amber-900">{apl.dia_nuevo} {formatFriendlyDate(apl.fecha_nueva)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-slate-50 p-4 border-t border-slate-200 flex justify-end shrink-0">
          <button
            type="button"
            onClick={() => setSelectedTaskHistory(null)}
            className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2 text-xs font-bold rounded-xl cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
})()}

{/* MODAL DE CONFIRMACIÓN: ELIMINAR O REVERTIR INCIDENCIA */}
{incidentToDelete && (() => {
  const { task, incident, index } = incidentToDelete;
  const canRevert = Boolean(incident.fecha_anterior && incident.dia_anterior);

  return (
    <div 
      className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs"
      onClick={(e) => { if (e.target === e.currentTarget) setIncidentToDelete(null); }}
    >
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-rose-500/20 text-rose-400 rounded-lg">
              <Trash2 className="w-4 h-4 text-rose-400" />
            </div>
            <div>
              <h4 className="font-bold text-sm sm:text-base leading-tight">Eliminar Incidencia</h4>
              <p className="text-[10px] text-slate-400">Deshacer o corregir movimiento de actividad</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIncidentToDelete(null)}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer border-none bg-transparent"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs text-slate-700">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1.5">
            <div className="flex items-center gap-2">
              <span className={`text-[8px] font-bold px-1.5 py-0.2 rounded uppercase ${getGremioTagClasses(task.gremio)}`}>
                {task.gremio}
              </span>
              <span className="text-[10px] font-bold text-slate-500">{task.obra_nombre}</span>
            </div>
            <p className="font-extrabold text-slate-900 text-sm">{task.actividad}</p>
            <div className="pt-2 border-t border-slate-200 text-[11px] space-y-1">
              <div>
                <span className="font-bold text-slate-500">Fecha no ejecutada: </span>
                <span className="text-rose-700 font-bold">{incident.dia_anterior} {formatFriendlyDate(incident.fecha_anterior)}</span>
              </div>
              <div className="flex items-center gap-1">
                <ArrowRight className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span className="font-bold text-slate-500">Trasladada a: </span>
                <span className="text-amber-900 font-bold">{incident.dia_nuevo} {formatFriendlyDate(incident.fecha_nueva)}</span>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-900 leading-relaxed font-medium">
            💡 ¿Te has equivocado al moverla de día? Puedes <strong>devolver la actividad a su fecha original</strong> o solo quitar este registro del historial.
          </div>

          <div className="space-y-2 pt-1">
            {canRevert && (
              <button
                type="button"
                onClick={() => handleConfirmDeleteIncident(true)}
                className="w-full p-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-left transition-all cursor-pointer shadow-xs flex items-center justify-between group border-none"
              >
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-black">
                    <ArrowRightLeft className="w-4 h-4 text-slate-950" />
                    Revertir fecha y borrar incidencia (Recomendado)
                  </div>
                  <p className="text-[10px] text-slate-800 font-medium mt-0.5">
                    Devuelve la actividad a: <strong>{incident.dia_anterior} ({formatFriendlyDate(incident.fecha_anterior)})</strong> y elimina este registro de no ejecución.
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-950 shrink-0 group-hover:translate-x-0.5 transition-transform" />
              </button>
            )}

            <button
              type="button"
              onClick={() => handleConfirmDeleteIncident(false)}
              className="w-full p-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-left transition-all cursor-pointer flex items-center justify-between group border-none"
            >
              <div>
                <div className="flex items-center gap-1.5 text-xs font-black text-rose-700">
                  <Trash2 className="w-4 h-4 text-rose-600" />
                  Solo borrar registro del historial
                </div>
                <p className="text-[10px] text-slate-500 font-normal mt-0.5">
                  Mantiene la actividad en su fecha actual ({incident.dia_nuevo}) y solo quita este registro de los informes.
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>

        <div className="bg-slate-50 p-3.5 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={() => setIncidentToDelete(null)}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer border-none bg-transparent"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
})()}
{/* MODAL: NEW CONSTRUCTION SITE */}
{isNewObraModalOpen && (
<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
<div className="bg-white rounded-xl border border-slate-200 shadow-2xl w-full max-w-sm overflow-hidden">
<div className="bg-slate-900 text-white p-4 flex justify-between items-center">
<h3 className="font-bold">Nueva Obra o Proyecto</h3>
<button onClick={() => setIsNewObraModalOpen(false)} className="text-slate-400 hover:text-white hover:cursor-pointer border-none bg-transparent">
<X className="w-5 h-5" />
</button>
</div>
<form onSubmit={handleAddObra} className="p-5 space-y-4">
<div>
<label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nombre de la Obra</label>
<input
type="text"
value={newObraNombre}
onChange={(e) => setNewObraNombre(e.target.value)}
placeholder="ej. Bloque Residencial Sevilla"
required
className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
/>
</div>
<div className="flex justify-end gap-2 pt-4">
<button
type="button"
onClick={() => setIsNewObraModalOpen(false)}
className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 text-xs font-semibold rounded-lg hover:cursor-pointer border-none"
>
Cancelar
</button>
<button
type="submit"
className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-4 py-2 text-xs rounded-lg hover:cursor-pointer border-none"
>
Añadir Obra
</button>
</div>
</form>
</div>
</div>
)}
{/* MODAL: MANAGE CONSTRUCTION SITES (AÑADIR Y CORREGIR) */}
{isManageObrasModalOpen && (
<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
<div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[85vh]">
{/* Header */}
<div className="bg-slate-900 text-white p-5 flex justify-between items-center">
<div className="flex items-center gap-2">
<Building className="w-5 h-5 text-amber-500" />
<h3 className="font-bold text-lg">Gestionar Obras e Infraestructuras</h3>
</div>
<button onClick={() => setIsManageObrasModalOpen(false)} className="text-slate-400 hover:text-white p-1 rounded-lg hover:cursor-pointer border-none bg-transparent">
<X className="w-5 h-5" />
</button>
</div>
{/* Body */}
<div className="p-6 overflow-y-auto space-y-6 flex-1">
<div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-sm font-medium text-amber-800">
Al eliminar una obra se borran todas sus tareas asociadas, estén pendientes o finalizadas.
</div>
{/* Formulary to Add Obra Directly */}
<div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
<h4 className="text-xs font-bold text-slate-600 uppercase mb-3 tracking-wide">Añadir Nueva Obra</h4>
<div className="flex gap-2">
<input
type="text"
value={newObraNombre}
onChange={(e) => setNewObraNombre(e.target.value)}
placeholder="Nombre de obra (ej: Reforma Edificio Triana)"
className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
onKeyDown={(e) => { if (e.key === 'Enter') handleAddObra(); }}
/>
<button
onClick={() => handleAddObra()}
className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-4 py-2 rounded-lg text-xs flex items-center gap-1.5 hover:cursor-pointer transition-all shrink-0 border-none"
>
<Plus className="w-3.5 h-3.5" /> Añadir
</button>
</div>
</div>
{/* Existing Obras List (CRUD) */}
<div>
<h4 className="text-xs font-bold text-slate-500 uppercase mb-3 tracking-wider">Obras Registradas (Corregir nombres / Eliminar)</h4>
{obras.length === 0 ? (
<p className="text-sm text-slate-400 italic text-center py-4">No hay obras registradas en la base de datos.</p>
) : (
<div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
{obras.map((obra) => {
const id = obra[0];
const nombre = obra[1];
const isEditing = editingObraId === id;
return (
<div key={id} className="p-3.5 flex items-center justify-between gap-4 hover:bg-slate-50/50 transition-all">
{isEditing ? (
<div className="flex-1 flex gap-2">
<input
type="text"
value={editingObraNombre}
onChange={(e) => setEditingObraNombre(e.target.value)}
className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
onKeyDown={(e) => {
if (e.key === 'Enter') handleUpdateObra(id, editingObraNombre);
if (e.key === 'Escape') setEditingObraId(null);
}}
autoFocus
/>
<button
onClick={() => handleUpdateObra(id, editingObraNombre)}
className="bg-emerald-600 hover:bg-emerald-700 text-white p-2 rounded-lg hover:cursor-pointer flex items-center justify-center border-none"
title="Guardar cambios"
>
<Check className="w-4 h-4" />
</button>
<button
onClick={() => setEditingObraId(null)}
className="bg-slate-200 hover:bg-slate-300 text-slate-700 p-2 rounded-lg hover:cursor-pointer flex items-center justify-center border-none"
title="Cancelar"
>
<X className="w-4 h-4" />
</button>
</div>
) : (
<>
<div className="flex-1 min-w-0 flex items-center gap-2">
<Building className="w-4 h-4 text-slate-400 shrink-0" />
<span className="font-medium text-slate-800 text-sm truncate">{nombre}</span>
</div>
<div className="flex items-center gap-1.5 shrink-0">
<button
onClick={() => {
setEditingObraId(id);
setEditingObraNombre(nombre);
}}
className="bg-slate-100 hover:bg-slate-200 hover:text-amber-600 text-slate-500 p-1.5 rounded-lg hover:cursor-pointer transition-all border border-slate-200"
title="Editar nombre / Corregir"
>
<Edit className="w-3.5 h-3.5" />
</button>
<button
onClick={() => handleDeleteObra(id)}
className="bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-400 p-1.5 rounded-lg hover:cursor-pointer transition-all border border-slate-200"
title="Eliminar Obra"
>
<Trash2 className="w-3.5 h-3.5" />
</button>
</div>
</>
)}
</div>
);
})}
</div>
)}
</div>
</div>
{/* Footer */}
<div className="bg-slate-50 p-4 border-t border-slate-200 flex justify-end">
<button
onClick={() => setIsManageObrasModalOpen(false)}
className="bg-slate-900 border border-slate-800 hover:bg-slate-800 text-white px-5 py-2 text-sm font-semibold rounded-xl hover:cursor-pointer transition-all"
>
Listo / Cerrar
</button>
</div>
</div>
</div>
)}
{/* MODAL: GESTIONAR GREMIOS Y SUBCONTRATISTAS (COMPARTIDO GLOBAL) */}
{isManageGremiosModalOpen && (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
    <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150">
      {/* Header */}
      <div className="bg-slate-900 text-white p-5 flex justify-between items-center">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center font-bold">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-base text-white">Gestionar Gremios / Subcontratistas</h3>
            <p className="text-[11px] text-slate-400 font-medium">Catálogo sincronizado para todos los usuarios de ENUE</p>
          </div>
        </div>
        <button 
          onClick={() => {
            setIsManageGremiosModalOpen(false);
            setGremioTargetContext(null);
          }} 
          className="text-slate-400 hover:text-white p-1 rounded-lg hover:cursor-pointer border-none bg-transparent"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Body */}
      <div className="p-6 overflow-y-auto space-y-6 flex-1">
        <div className="bg-amber-50 border border-amber-200/60 rounded-xl p-3.5 text-xs text-amber-900 flex items-start gap-2.5">
          <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Catálogo compartido en tiempo real</p>
            <p className="text-amber-800 text-[11px] mt-0.5">
              Cualquier nuevo gremio o empresa subcontratista que crees aquí estará disponible al instante para todos los compañeros y en todas las obras de la empresa.
            </p>
          </div>
        </div>

        {/* Formulario para añadir nuevo gremio */}
        <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
          <h4 className="text-xs font-bold text-slate-600 uppercase mb-2 tracking-wide flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5 text-amber-600" />
            <span>Crear Nuevo Gremio o Subcontratista</span>
          </h4>
          <div className="flex gap-2">
            <input
              type="text"
              value={newGremioName}
              onChange={(e) => setNewGremioName(e.target.value)}
              placeholder="Nombre del gremio o empresa (ej: Carpintería Metálica, Solados...)"
              className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreateGremio(e); }}
              autoFocus
            />
            <button
              type="button"
              onClick={handleCreateGremio}
              disabled={!newGremioName.trim()}
              className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-bold px-4 py-2 rounded-lg text-xs flex items-center gap-1.5 hover:cursor-pointer transition-all shrink-0 border-none shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" /> Guardar
            </button>
          </div>
        </div>

        {/* Gremios Personalizados Compartidos */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Gremios Creados por el Equipo ({customGremios.length})
            </h4>
          </div>
          {customGremios.length === 0 ? (
            <div className="border border-dashed border-slate-200 rounded-xl p-4 text-center text-xs text-slate-400">
              No hay gremios personalizados creados aún. Escribe uno arriba para añadirlo al catálogo compartido.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
              {customGremios.map((g) => {
                const id = g.id;
                const nombre = g.nombre;
                const creadoPor = g.creado_por || 'Equipo ENUE';
                return (
                  <div key={id} className="p-3 flex items-center justify-between gap-3 hover:bg-slate-50/60 transition-all">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${getGremioTagClasses(nombre)}`}>
                        {nombre}
                      </span>
                      <span className="text-[11px] text-slate-400 truncate">
                        (creado por {creadoPor})
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteGremio(id, nombre)}
                      className="bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-400 p-1.5 rounded-lg hover:cursor-pointer transition-all border border-slate-200 shrink-0"
                      title={`Eliminar "${nombre}"`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Gremios Predefinidos del Sistema */}
        <div>
          <h4 className="text-xs font-bold text-slate-500 uppercase mb-2 tracking-wider">
            Gremios Base Predefinidos ({GREMIOS_PREDEFINIDOS.length})
          </h4>
          <div className="flex flex-wrap gap-1.5 p-3 bg-slate-50 border border-slate-200 rounded-xl">
            {GREMIOS_PREDEFINIDOS.map((g) => (
              <span
                key={g}
                className={`text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider ${getGremioTagClasses(g)}`}
              >
                {g === 'ENUE' ? '⭐ ENUE (Empresa)' : g}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-slate-50 p-4 border-t border-slate-200 flex justify-end">
        <button
          type="button"
          onClick={() => {
            setIsManageGremiosModalOpen(false);
            setGremioTargetContext(null);
          }}
          className="bg-slate-900 border border-slate-800 hover:bg-slate-800 text-white px-5 py-2 text-sm font-semibold rounded-xl hover:cursor-pointer transition-all"
        >
          Listo / Cerrar
        </button>
      </div>
    </div>
  </div>
)}
{/* MODAL: CALENDARIO EN GRANDE / SELECTOR DE FECHA */}
{isCalendarModalOpen && (
  <div 
    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs"
    onClick={(e) => {
      if (e.target === e.currentTarget) setIsCalendarModalOpen(false);
    }}
  >
    <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
      {/* Cabecera del modal */}
      <div className="bg-slate-900 text-white p-4 sm:p-5 flex justify-between items-center">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base sm:text-lg">Calendario de Planificación</h3>
            <p className="text-xs text-slate-400">Selecciona cualquier día, mes o año para ver su semana</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsCalendarModalOpen(false)}
          className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer border-none bg-transparent"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-4 sm:p-6 space-y-4">
        {/* Barra de navegación de Mes y Año */}
        <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={prevCalendarMonth}
              title="Mes anterior"
              className="p-1.5 hover:bg-white rounded-lg text-slate-700 hover:shadow-xs transition-all cursor-pointer border border-transparent hover:border-slate-200"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={nextCalendarMonth}
              title="Mes siguiente"
              className="p-1.5 hover:bg-white rounded-lg text-slate-700 hover:shadow-xs transition-all cursor-pointer border border-transparent hover:border-slate-200"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Desplegables rápidos de Mes y Año */}
          <div className="flex items-center gap-2 flex-1 justify-center min-w-[200px]">
            <select
              value={calendarViewDate.getMonth()}
              onChange={(e) => {
                const newMonth = parseInt(e.target.value, 10);
                setCalendarViewDate(new Date(calendarViewDate.getFullYear(), newMonth, 1, 12));
              }}
              className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
            >
              {MESES.map((m, idx) => (
                <option key={m} value={idx}>{m}</option>
              ))}
            </select>

            <select
              value={calendarViewDate.getFullYear()}
              onChange={(e) => {
                const newYear = parseInt(e.target.value, 10);
                setCalendarViewDate(new Date(newYear, calendarViewDate.getMonth(), 1, 12));
              }}
              className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
            >
              {calendarYearOptions.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {/* Botón rápido para ir al día de hoy */}
          <button
            type="button"
            onClick={jumpCalendarToToday}
            className="text-xs bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-3 py-1.5 rounded-lg transition-all shadow-xs cursor-pointer"
          >
            Hoy
          </button>
        </div>

        {/* Rejilla del Calendario */}
        <div>
          {/* Cabecera de días de la semana */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((d, i) => (
              <div 
                key={d} 
                className={`text-[11px] font-bold uppercase tracking-wider py-1.5 ${
                  i >= 5 ? 'text-slate-400' : 'text-slate-600'
                }`}
              >
                {d}
              </div>
            ))}
          </div>

          {/* Días del mes */}
          <div className="grid grid-cols-7 gap-1">
            {calendarGridDays.map((cell) => {
              const cellMonday = getMonday(cell.dateStr);
              const isSelectedWeek = cellMonday === currentWeekMonday;
              const isToday = cell.dateStr === todayIsoString;
              const tasksInThisWeek = taskCountByWeek[cellMonday] || 0;

              return (
                <button
                  key={cell.dateStr}
                  type="button"
                  onClick={() => handleSelectCalendarDay(cell)}
                  title={`Seleccionar semana del ${formatFriendlyDate(cellMonday)}${tasksInThisWeek ? ` (${tasksInThisWeek} tareas)` : ''}`}
                  className={`
                    relative h-11 sm:h-12 rounded-xl flex flex-col items-center justify-center p-1 text-sm transition-all cursor-pointer
                    ${!cell.isCurrentMonth ? 'text-slate-300 hover:text-slate-600 hover:bg-slate-100/60' : 'text-slate-800'}
                    ${isSelectedWeek 
                      ? 'bg-amber-100 font-extrabold text-amber-950 border border-amber-300 shadow-2xs' 
                      : cell.isCurrentMonth ? 'hover:bg-amber-50/80 hover:border-amber-200 border border-transparent' : ''
                    }
                    ${isToday ? 'ring-2 ring-slate-900 font-bold' : ''}
                  `}
                >
                  <span className={`text-xs sm:text-sm leading-none ${isToday ? 'text-amber-600 font-black' : ''}`}>
                    {cell.dayNum}
                  </span>
                  
                  {/* Indicador sutil de tareas en la semana (solo en el lunes) */}
                  {tasksInThisWeek > 0 && cell.dateObj.getDay() === 1 && (
                    <span 
                      className="absolute bottom-1 px-1 py-0.2 bg-amber-500 text-slate-950 font-black text-[9px] rounded-full leading-tight shadow-2xs"
                      title={`${tasksInThisWeek} tareas programadas en esta semana`}
                    >
                      {tasksInThisWeek}
                    </span>
                  )}

                  {/* Indicador de 'Hoy' */}
                  {isToday && (
                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-0.5" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Leyenda y pie del modal */}
        <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-slate-500">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-amber-100 border border-amber-300 inline-block" />
              Semana activa
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md ring-2 ring-slate-900 inline-block" />
              Hoy
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
              Con tareas
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <button
              type="button"
              onClick={() => {
                setIsCalendarModalOpen(false);
                setIsManageObrasModalOpen(true);
              }}
              className="text-xs bg-slate-100 hover:bg-amber-50 text-slate-700 hover:text-amber-900 font-bold px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-amber-300 flex items-center gap-1.5 transition-all cursor-pointer"
              title="Abrir panel para añadir o gestionar obras"
            >
              <Building className="w-3.5 h-3.5 text-amber-500" />
              <span>Gestionar / Crear Obras</span>
            </button>
            <div className="text-slate-600 font-semibold whitespace-nowrap">
              Semana: <span className="text-amber-600 font-bold">{formatFriendlyDate(currentWeekMonday)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
)}
</div> {/* Fin Dashboard Principal */}
{/* NUEVO MODAL: VISTA DE IMPRESIÓN Y EXPORTACIÓN A PDF */}
{isPrintModalOpen && (() => {
// Gather all printable tasks from every existing week.
const printObraName = selectedPrintObraId === 'all'
? 'Todas las Obras'
: (obras.find(o => o[0] === selectedPrintObraId)?.[1] || 'Obra Selección');
const printTasks = todasLasTareas
.filter(t => {
const matchObra = selectedPrintObraId === 'all' || t.obra_id === selectedPrintObraId;
if (!matchObra) return false;
if (printIncludeCompleted === 'pending') return !t.completada;
if (printIncludeCompleted === 'completed') return t.completada;
return true;
})
.sort((a, b) => {
const weekCompare = String(a.fecha_semana || '').localeCompare(String(b.fecha_semana || ''));
if (weekCompare !== 0) return weekCompare;
return DIAS_SEMANA.indexOf(a.dia_semana) - DIAS_SEMANA.indexOf(b.dia_semana);
});
const printTasksByWeek = printTasks.reduce((weeks, task) => {
const week = task.fecha_semana || 'sin-fecha';
if (!weeks[week]) {
weeks[week] = {};
DIAS_SEMANA.forEach(day => { weeks[week][day] = []; });
}
if (weeks[week][task.dia_semana]) weeks[week][task.dia_semana].push(task);
return weeks;
}, {});
const printWeeks = Object.keys(printTasksByWeek)
.filter(week => Object.values(printTasksByWeek[week]).some(dayTasks => dayTasks.length > 0))
.sort();
const getPrintWeekLabel = (weekMonday) => {
if (weekMonday === 'sin-fecha') return 'Semana sin fecha';
return `Semana del ${getWeekdayDateLabel(weekMonday, 'Lunes')} al ${getWeekdayDateLabel(weekMonday, 'Viernes')}`;
};
// Paleta determinista, imprimible y consistente por obra
const obraColorPalette = [
{ text: '#1d4ed8', border: '#2563eb', background: '#eff6ff' },
{ text: '#6d28d9', border: '#7c3aed', background: '#f5f3ff' },
{ text: '#15803d', border: '#16a34a', background: '#f0fdf4' },
{ text: '#c2410c', border: '#ea580c', background: '#fff7ed' },
{ text: '#b91c1c', border: '#dc2626', background: '#fef2f2' },
{ text: '#0f766e', border: '#0d9488', background: '#f0fdfa' },
{ text: '#a16207', border: '#ca8a04', background: '#fefce8' },
{ text: '#be185d', border: '#db2777', background: '#fdf2f8' }
];
const obraColorMap = Object.fromEntries(
obras.map((obra, index) => [obra[0], obraColorPalette[index % obraColorPalette.length]])
);
const getPrintObraColor = (obraId) => obraColorMap[obraId] || obraColorPalette[0];
const presentObraIds = obras
.filter(obra => printTasks.some(task => task.obra_id === obra[0]))
.map(obra => obra[0]);
const printObraAccent = selectedPrintObraId === 'all'
? { text: '#0f172a', border: '#f59e0b', background: '#fffbeb' }
: getPrintObraColor(selectedPrintObraId);
return (
<div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4 bg-slate-950/60 backdrop-blur-xs print:bg-white print:p-0 print:absolute print:inset-0 print:z-50 print:block">
<div className="bg-slate-100 rounded-none md:rounded-2xl shadow-2xl w-full max-w-6xl h-full md:h-[90vh] flex flex-col md:flex-row overflow-hidden print:bg-white print:shadow-none print:h-auto print:max-w-none print:rounded-none">
{/* PANEL IZQUIERDO: CONTROLES - Ocultos al Imprimir */}
<div className="w-full md:w-80 bg-white border-b md:border-b-0 md:border-r border-slate-200 p-5 flex flex-col justify-between shrink-0 print:hidden overflow-y-auto">
<div className="space-y-4">
<div className="flex items-center gap-2 border-b border-slate-100 pb-3">
<Printer className="w-5 h-5 text-amber-500" />
<h3 className="font-bold text-slate-900 text-base">Exportador PDF de tareas</h3>
</div>
{/* Selector de Obra */}
<div>
<label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Obra a Exportar</label>
<select
value={selectedPrintObraId}
onChange={(e) => setSelectedPrintObraId(e.target.value)}
className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
>
<option value="all">📍 Todas las obras juntas</option>
{obras.map(o => (
<option key={o[0]} value={o[0]}>🚧 {o[1]}</option>
))}
</select>
</div>
{/* Nombre del Encargado */}
<div>
<label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Encargado de Obra</label>
<input
type="text"
value={printEncargado}
onChange={(e) => setPrintEncargado(e.target.value)}
placeholder="ej. Manuel Pozas (Encargado)"
className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
/>
</div>
{/* Instrucciones Especiales */}
<div>
<label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Avisos / Notas de la Dirección</label>
<textarea
value={printInstructions}
onChange={(e) => setPrintInstructions(e.target.value)}
placeholder="ej. Maximizar medidas de seguridad en el andamio. Revisar materiales al descargar..."
className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs h-20 text-slate-700 focus:bg-white resize-none focus:outline-none focus:ring-2 focus:ring-amber-500"
/>
</div>
{/* Filtro de completado */}
<div>
<label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Estado de Tareas</label>
<select
value={printIncludeCompleted}
onChange={(e) => setPrintIncludeCompleted(e.target.value)}
className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
>
<option value="pending">Solo tareas pendientes (recomendado)</option>
<option value="all">Todas las tareas (incluidas completadas)</option>
<option value="completed">Solo tareas completadas</option>
</select>
</div>
</div>
<div className="mt-6 pt-4 border-t border-slate-100 flex flex-col gap-2">
{/* Trigger native printing */}
<button
onClick={() => window.print()}
className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 hover:cursor-pointer shadow-md shadow-amber-500/10 transition-all border-none"
>
<Printer className="w-4 h-4" />
<span>Imprimir / Guardar PDF</span>
</button>
<button
onClick={() => setIsPrintModalOpen(false)}
className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 rounded-xl text-xs hover:cursor-pointer transition-all border-none"
>
Cancelar / Volver
</button>
</div>
</div>
{/* PANEL DERECHO: HOJA PREESTILIZADA DIN-A4 PARA EXPORTAR */}
<div className="flex-1 bg-slate-200 p-0 md:p-6 overflow-y-auto flex justify-center print:bg-white print:p-0 print:overflow-visible">
<div className="bg-white w-full md:w-[210mm] min-h-none md:min-h-[297mm] shadow-lg p-6 md:p-12 flex flex-col justify-between print:shadow-none print:p-0 print:w-full print:h-auto print:min-h-0">
<div>
{/* Cabecera Corporativa del PDF */}
<div className="border-b-4 border-amber-500 pb-4 mb-6 flex justify-between items-end">
<div>
<h2 className="text-xl font-black tracking-wider text-slate-900 m-0">ENUE</h2>
<p className="text-[9px] uppercase tracking-widest text-slate-500 font-bold m-0">Proyectos y Construcción S.L.</p>
</div>
<div className="text-right">
<h1 className="text-sm font-black text-slate-900 uppercase tracking-tight m-0">PARTE DE CHECKLIST DE OBRA</h1>
<p className="text-[10px] text-slate-500 font-semibold m-0">Tareas designadas — todas las semanas</p>
</div>
</div>
{/* Metadatos de la Obra y el Encargado */}
<div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6 print:bg-transparent print:p-2">
<div className="rounded-xl border-l-8 p-4" style={{ borderColor: printObraAccent.border, backgroundColor: printObraAccent.background }}>
<p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: printObraAccent.text }}>Centro de Trabajo / Obra</p>
<p className="text-2xl font-black leading-tight tracking-tight" style={{ color: printObraAccent.text }}>{printObraName}</p>
</div>
<div className="flex flex-col justify-center">
<p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Encargado Responsable</p>
<p className="text-sm font-bold text-slate-800">✍️ {printEncargado || 'Asignación pendiente'}</p>
</div>
</div>
{selectedPrintObraId === 'all' && presentObraIds.length > 0 && (
<div className="mb-6 rounded-xl border border-slate-200 p-4 print:bg-white">
<h4 className="text-[10px] font-black text-slate-700 uppercase tracking-wider mb-3">Obras incluidas</h4>
<div className="flex flex-wrap gap-2">
{presentObraIds.map(obraId => {
const obra = obras.find(o => o[0] === obraId);
const color = getPrintObraColor(obraId);
return (
<div key={obraId} className="flex items-center gap-1.5 rounded-md border px-2 py-1" style={{ borderColor: color.border, backgroundColor: color.background, color: color.text }}>
<span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color.border }}></span>
<span className="text-[10px] font-bold">{obra?.[1]}</span>
</div>
);
})}
</div>
</div>
)}
{/* Instrucciones de la Dirección Facultativa */}
{printInstructions.trim() && (
<div className="mb-6 p-4 bg-amber-50/50 border border-amber-100 rounded-xl print:bg-transparent print:p-2">
<h4 className="text-[10px] font-bold text-amber-800 uppercase tracking-wider mb-1">⚠️ Instrucciones de Trabajo y Seguridad:</h4>
<p className="text-xs italic text-slate-700 leading-relaxed font-semibold whitespace-pre-wrap">{printInstructions}</p>
</div>
)}
{/* Listado de tareas agrupado por semanas y días */}
<div className="space-y-8">
{printWeeks.map(weekMonday => (
<section key={weekMonday} className="space-y-4">
<div className="border-b-2 border-amber-500 pb-2">
<h3 className="text-base font-black text-slate-950 uppercase tracking-wide">{getPrintWeekLabel(weekMonday)}</h3>
</div>
<div className="space-y-5">
{DIAS_SEMANA.map(day => {
const dayTasks = printTasksByWeek[weekMonday][day] || [];
if (dayTasks.length === 0) return null;
const dayDateLabel = getWeekdayDateLabel(weekMonday, day);
return (
<div key={`${weekMonday}-${day}`} className="border border-slate-200 rounded-xl overflow-hidden print:border-slate-300">
<div className="bg-slate-100 px-4 py-2 border-b border-slate-200 flex justify-between items-center print:bg-slate-50">
<span className="font-extrabold text-sm text-slate-950 uppercase tracking-wide">{day}<span className="ml-2 font-semibold normal-case text-slate-600">· {dayDateLabel}</span></span>
<span className="text-[10px] font-semibold text-slate-500">{dayTasks.length} {dayTasks.length === 1 ? 'actividad' : 'actividades'}</span>
</div>
<div className="divide-y divide-slate-100 print:divide-slate-200">
{dayTasks.map(t => {
const obraColor = getPrintObraColor(t.obra_id);
return (
<div key={t.id} className="p-3.5 flex items-start gap-4 transition-all" style={{ borderLeft: `5px solid ${obraColor.border}` }}>
<div className="shrink-0 pt-0.5">
<div className="w-5 h-5 border-2 border-slate-400 rounded bg-white print:border-slate-500">
{t.completada && printIncludeCompleted !== 'pending' && <span className="text-slate-950 font-bold text-sm block text-center leading-none">✓</span>}
</div>
</div>
<div className="flex-1 min-w-0 pr-2">
<div className="flex items-center gap-2 mb-1 flex-wrap">
<span className={`font-extrabold text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wider font-semibold ${getGremioTagClasses(t.gremio, t.completada)} print:bg-slate-100 print:text-slate-800 print:border print:border-slate-300`}>{t.gremio}</span>
<span className="text-xs font-black" style={{ color: obraColor.text }}>{t.obra_nombre}</span>
</div>
<p className="font-bold text-slate-900 text-xs leading-relaxed">{t.actividad}</p>
{t.notas && <p className="text-[10px] text-slate-500 italic mt-1 leading-snug">💡 Notas: {t.notas}</p>}
</div>
</div>
);
})}
</div>
</div>
);
})}
</div>
</section>
))}
</div>
</div>
{/* ZONA DE FIRMAS Y APROBACIÓN */}
<div className="mt-12 pt-6 border-t border-slate-200 grid grid-cols-2 gap-8 text-center print:mt-16 print:border-slate-300">
<div>
<div className="h-16 flex items-end justify-center mb-1">
<span className="text-[10px] text-slate-300 italic">Firma del Encargado</span>
</div>
<p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Recibido por Encargado</p>
<p className="text-xs font-bold text-slate-800 border-t border-solid border-slate-200 pt-1 w-48 mx-auto">{printEncargado || 'Pendiente de asignar'}</p>
</div>
<div>
<div className="h-16 flex items-end justify-center mb-1">
<span className="text-[10px] text-slate-300 italic">Firma de Dirección / Supervisión</span>
</div>
<p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Supervisor (Jefe de Obra)</p>
<p className="text-xs font-bold text-slate-800 border-t border-solid border-slate-200 pt-1 w-48 mx-auto">Dirección de Obra</p>
</div>
</div>
{/* Pie de página del documento */}
<div className="mt-8 text-center border-t border-slate-100 pt-3 flex justify-between text-[8px] text-slate-400 uppercase tracking-widest font-semibold print:mt-10 print:border-slate-200">
<span>ENUE PROYECTOS Y CONSTRUCCIÓN S.L.</span>
<span>GENERADO: {new Date().toLocaleDateString('es-ES')}</span>
<span>PÁGINA 1 DE 1</span>
</div>
</div>
</div>
</div>
</div>
);
})()}
{/* MODAL: INFORME DE ACTIVIDADES NO EJECUTADAS Y REPASOS */}
{isReportModalOpen && (() => {
  const { items: incidentItems, completedItems = [], pendingItems = [], totalTasksInPeriod, completedInPeriod, pendingInPeriod = 0, motivesCount, startDate, endDate, label: periodLabel } = reportData;
  const totalIncidents = incidentItems.length;
  // Efectividad de ejecución: tareas completadas respecto al total programado en el período
  const compliancePct = totalTasksInPeriod > 0
    ? Math.min(100, Math.max(0, Math.round((completedInPeriod / Math.max(totalTasksInPeriod, 1)) * 100)))
    : 100;

  // Encontrar el motivo predominante
  const topMotiveEntry = Object.entries(motivesCount).sort((a, b) => b[1] - a[1])[0];
  const topMotive = topMotiveEntry ? `${topMotiveEntry[0]} (${topMotiveEntry[1]})` : 'Sin incidencias';

  const reportObraName = reportObraId === 'all'
    ? 'Todas las obras activas'
    : (obras.find(o => o[0] === reportObraId)?.[1] || 'Obra Seleccionada');

  // Agrupación de actividades y repasos por obra
  const obrasGrouped = (() => {
    const obraMap = new Map();

    const targetObras = reportObraId === 'all'
      ? obras
      : obras.filter(o => o && o[0] === reportObraId);

    targetObras.forEach(o => {
      if (o && o[0]) {
        obraMap.set(String(o[0]), {
          obra_id: String(o[0]),
          obra_nombre: o[1] || 'Obra',
          completedItems: [],
          incidentItems: [],
          pendingItems: []
        });
      }
    });

    completedItems.forEach(item => {
      const oId = String(item.obra_id || 'unknown');
      let g = obraMap.get(oId);
      if (!g) {
        g = {
          obra_id: oId,
          obra_nombre: item.obra_nombre || 'Obra',
          completedItems: [],
          incidentItems: [],
          pendingItems: []
        };
        obraMap.set(oId, g);
      }
      g.completedItems.push(item);
    });

    incidentItems.forEach(item => {
      const oId = String(item.obra_id || 'unknown');
      let g = obraMap.get(oId);
      if (!g) {
        g = {
          obra_id: oId,
          obra_nombre: item.obra_nombre || 'Obra',
          completedItems: [],
          incidentItems: [],
          pendingItems: []
        };
        obraMap.set(oId, g);
      }
      g.incidentItems.push(item);
    });

    pendingItems.forEach(item => {
      const oId = String(item.obra_id || 'unknown');
      let g = obraMap.get(oId);
      if (!g) {
        g = {
          obra_id: oId,
          obra_nombre: item.obra_nombre || 'Obra',
          completedItems: [],
          incidentItems: [],
          pendingItems: []
        };
        obraMap.set(oId, g);
      }
      if (!g.pendingItems) g.pendingItems = [];
      g.pendingItems.push(item);
    });

    // Ordenar actividades de cada obra por fecha ascendente
    obraMap.forEach(g => {
      g.completedItems.sort((a, b) => String(a.fecha_ejecucion || '').localeCompare(String(b.fecha_ejecucion || '')));
      g.incidentItems.sort((a, b) => String(a.fecha_nueva || a.fecha_anterior || '').localeCompare(String(b.fecha_nueva || b.fecha_anterior || '')));
    });

    return Array.from(obraMap.values())
      .filter(g => {
        if (reportViewFilter === 'ejecutadas') return g.completedItems.length > 0;
        if (reportViewFilter === 'no_ejecutadas') return g.incidentItems.length > 0;
        return g.completedItems.length > 0 || g.incidentItems.length > 0 || (reportObraId !== 'all' && reportObraId === g.obra_id);
      })
      .sort((a, b) => String(a.obra_nombre || '').localeCompare(String(b.obra_nombre || ''), 'es'));
  })();

  // Generador de texto para el correo (Notificación formal indicando que se adjunta el informe en PDF)
  const generateEmailReportText = (scopeObraId = 'all') => {
    const targetGroups = scopeObraId === 'all'
      ? obrasGrouped
      : obrasGrouped.filter(g => g.obra_id === scopeObraId);

    const obraTitle = scopeObraId === 'all'
      ? 'Todas las obras activas'
      : (targetGroups[0]?.obra_nombre || 'Obra seleccionada');

    const totalComp = targetGroups.reduce((acc, g) => acc + g.completedItems.length, 0);
    const totalInc = targetGroups.reduce((acc, g) => acc + g.incidentItems.length, 0);
    const totalProg = targetGroups.reduce((acc, g) => acc + g.completedItems.length + g.incidentItems.length + (g.pendingItems?.length || 0), 0);
    const effPct = totalProg > 0 ? Math.round((totalComp / totalProg) * 100) : 100;

    const senderName = currentUser?.displayName || 'Dirección Técnica';

    let text = `Estimados señores,\n\n`;
    text += `Adjunto a este correo les remitimos el Informe Oficial de Repasos y Control de Ejecución (en formato PDF) correspondiente a:\n\n`;
    text += `• Obra / Ámbito: ${obraTitle}\n`;
    text += `• Período: ${periodLabel}\n`;
    text += `• Fecha de Emisión: ${new Date().toLocaleDateString('es-ES')}\n\n`;
    text += `En el documento PDF adjunto encontrarán el desglose detallado de los trabajos realizados satisfactoriamente, así como de las actividades no ejecutadas o aplazadas con sus causas y justificación técnica:\n\n`;
    text += `Resumen de Ejecución:\n`;
    text += `  ✓ Repasos ejecutados con éxito: ${totalComp}\n`;
    text += `  ⏳ No ejecutadas / traslados de fecha: ${totalInc}\n`;
    text += `  📊 Efectividad global alcanzada: ${effPct}% (${totalComp} de ${totalProg} programados)\n\n`;
    text += `Quedamos a su entera disposición para cualquier aclaración o consulta sobre los trabajos del informe adjunto.\n\n`;
    text += `Atentamente,\n`;
    text += `${senderName}\n`;
    text += `ENUE PROYECTOS Y CONSTRUCCIÓN S.L.\n`;
    return text;
  };

  const handleSendViaGoogleWorkspace = async () => {
    if (!emailRecipient.trim()) {
      alert('Por favor, introduce una dirección de correo válida en el destinatario.');
      return;
    }

    const bodyText = (emailMessage ? `${emailMessage}\n\n==================================================\n\n` : '') + generateEmailReportText(emailScope);
    const subject = emailSubject || `[ENUE] Informe de Repasos y Ejecución - ${periodLabel}`;

    // Copiamos al portapapeles automáticamente para máxima comodidad
    try {
      await navigator.clipboard.writeText(bodyText);
      setEmailCopiedFeedback(true);
      setTimeout(() => setEmailCopiedFeedback(false), 3500);
    } catch (e) {
      console.warn('No se pudo copiar automáticamente:', e);
    }

    setEmailSendStatus('sending');

    // Registrar en Firestore
    try {
      if (currentUser?.uid) {
        const userDocRef = doc(firestore, 'users', currentUser.uid);
        await setDoc(userDocRef, {
          ultimo_envio_informe: {
            metodo: 'google_workspace',
            remitente: currentUser.email || 'usuario@enue.es',
            destinatario: emailRecipient.trim(),
            asunto: subject,
            alcance: emailScope,
            fecha: new Date().toISOString()
          }
        }, { merge: true });
      }
    } catch (err) {
      console.error('Error registrando envío en Firestore:', err);
    }

    // Cuenta corporativa Google Workspace (@enue.es)
    const userAccount = (currentUser?.email && currentUser.email.endsWith('@enue.es'))
      ? currentUser.email
      : '';

    // Truncado de seguridad para GET URL en navegadores
    const maxUrlBodyLength = 1700;
    let urlBody = bodyText;
    if (urlBody.length > maxUrlBodyLength) {
      urlBody = urlBody.substring(0, maxUrlBodyLength) + '\n\n[...Nota: El informe completo ha sido copiado automáticamente a tu portapapeles. Puedes pegarlo aquí con Ctrl+V...]';
    }

    const workspaceUrl = `https://mail.google.com/mail/?view=cm&fs=1` +
      (userAccount ? `&authuser=${encodeURIComponent(userAccount)}` : '') +
      `&to=${encodeURIComponent(emailRecipient.trim())}` +
      `&su=${encodeURIComponent(subject)}` +
      `&body=${encodeURIComponent(urlBody)}`;

    window.open(workspaceUrl, '_blank');
    setEmailSendStatus('sent');
  };

  const handleSendViaMailto = () => {
    const bodyText = (emailMessage ? `${emailMessage}\n\n====================\n\n` : '') + generateEmailReportText(emailScope);
    const subject = emailSubject || `[ENUE] Informe de Repasos - ${periodLabel}`;
    const mailtoUrl = `mailto:${encodeURIComponent(emailRecipient.trim())}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyText)}`;
    window.location.href = mailtoUrl;
    setEmailSendStatus('sent');
  };

  const handleDirectCorporateSend = async () => {
    if (!emailRecipient.trim()) {
      alert('Por favor, introduce una dirección de correo válida.');
      return;
    }
    setEmailSendStatus('sending');
    try {
      if (currentUser?.uid) {
        const userDocRef = doc(firestore, 'users', currentUser.uid);
        await setDoc(userDocRef, {
          ultimo_envio_informe: {
            metodo: 'registro_directo',
            remitente: currentUser.email || 'usuario@enue.es',
            destinatario: emailRecipient.trim(),
            asunto: emailSubject,
            alcance: emailScope,
            fecha: new Date().toISOString()
          }
        }, { merge: true });
      }
      await new Promise(r => setTimeout(r, 600));
      setEmailSendStatus('sent');
    } catch (err) {
      console.error('Error registrando envío:', err);
      setEmailSendStatus('sent');
    }
  };

  const handleCopyReportText = () => {
    const fullText = (emailMessage ? `${emailMessage}\n\n` : '') + generateEmailReportText(emailScope);
    navigator.clipboard.writeText(fullText);
    setEmailCopiedFeedback(true);
    setTimeout(() => setEmailCopiedFeedback(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4 bg-slate-950/60 backdrop-blur-xs print:bg-white print:p-0 print:absolute print:inset-0 print:z-50 print:block">
      <div className="bg-slate-100 rounded-none md:rounded-2xl shadow-2xl w-full max-w-6xl h-full md:h-[92vh] flex flex-col md:flex-row overflow-hidden print:bg-white print:shadow-none print:h-auto print:max-w-none print:rounded-none">
        
        {/* BARRA SUPERIOR MÓVIL DEL INFORME (Solo visible en móviles < 768px) */}
        <div className="md:hidden bg-slate-900 text-white p-3 border-b border-slate-800 shrink-0 print:hidden space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <h3 className="font-extrabold text-white text-sm leading-tight">Informe de Repasos</h3>
                <p className="text-[10px] text-slate-400 truncate max-w-[200px]">{reportObraName}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => window.print()}
                className="p-2 bg-amber-500 text-slate-950 rounded-lg font-extrabold text-xs flex items-center gap-1 cursor-pointer"
                title="Imprimir / Guardar PDF"
              >
                <Printer className="w-4 h-4" />
                <span>PDF</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setEmailRecipient(currentUser?.email || '');
                  setEmailSubject(`[ENUE] Informe de Repasos - ${reportObraName} (${periodLabel})`);
                  setEmailScope(reportObraId);
                  setEmailSendStatus('idle');
                  setEmailCopiedFeedback(false);
                  setIsEmailModalOpen(true);
                }}
                className="p-2 bg-slate-800 text-amber-400 border border-slate-700 rounded-lg font-bold text-xs flex items-center gap-1 cursor-pointer"
                title="Enviar por Email"
              >
                <Mail className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsReportModalOpen(false)}
                className="p-2 bg-slate-800 text-slate-300 hover:text-white rounded-lg cursor-pointer"
                title="Cerrar informe"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Selector de Pestaña en Móvil: Vista Previa vs Filtros */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-slate-800 rounded-xl text-xs font-bold">
            <button
              type="button"
              onClick={() => setMobileReportTab('preview')}
              className={`py-1.5 px-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                mobileReportTab === 'preview'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Vista del Informe ({totalTasksInPeriod})</span>
            </button>
            <button
              type="button"
              onClick={() => setMobileReportTab('filters')}
              className={`py-1.5 px-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                mobileReportTab === 'filters'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Filtros y Período</span>
            </button>
          </div>
        </div>

        {/* PANEL LATERAL: CONFIGURACIÓN Y FILTROS DEL INFORME (Oculto al Imprimir) */}
        <div className={`${mobileReportTab === 'filters' ? 'flex' : 'hidden'} md:flex w-full md:w-80 bg-white border-b md:border-b-0 md:border-r border-slate-200 p-4 sm:p-5 flex-col justify-between shrink-0 print:hidden overflow-y-auto flex-1 md:flex-initial`}>
          <div className="space-y-4">
            <div className="hidden md:flex items-center gap-2 border-b border-slate-100 pb-3">
              <FileSpreadsheet className="w-5 h-5 text-amber-500" />
              <div>
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">Informe de Repasos</h3>
                <p className="text-[11px] text-slate-400">Seguimiento de ejecución e incidencias</p>
              </div>
            </div>

            {/* Pestañas de tipo de período */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Período del Informe</label>
              <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-xl text-xs font-bold mb-1">
                <button
                  type="button"
                  onClick={() => setReportPeriodType('semanal')}
                  className={`py-1.5 rounded-lg transition-all cursor-pointer ${
                    reportPeriodType === 'semanal' ? 'bg-white text-slate-950 shadow-2xs font-extrabold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Semanal
                </button>
                <button
                  type="button"
                  onClick={() => setReportPeriodType('quincenal')}
                  className={`py-1.5 rounded-lg transition-all cursor-pointer ${
                    reportPeriodType === 'quincenal' ? 'bg-white text-slate-950 shadow-2xs font-extrabold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Quincenal
                </button>
                <button
                  type="button"
                  onClick={() => setReportPeriodType('mensual')}
                  className={`py-1.5 rounded-lg transition-all cursor-pointer ${
                    reportPeriodType === 'mensual' ? 'bg-white text-slate-950 shadow-2xs font-extrabold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Mensual
                </button>
              </div>
              <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setReportPeriodType('personalizado')}
                  className={`py-1.5 rounded-lg transition-all cursor-pointer ${
                    reportPeriodType === 'personalizado' ? 'bg-white text-slate-950 shadow-2xs font-extrabold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  A Medida
                </button>
                <button
                  type="button"
                  onClick={() => setReportPeriodType('total')}
                  className={`py-1.5 rounded-lg transition-all cursor-pointer ${
                    reportPeriodType === 'total' ? 'bg-amber-500 text-slate-950 shadow-2xs font-black' : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Histórico acumulado de todos los repasos hasta el final de la obra"
                >
                  Fin de Obra
                </button>
              </div>
            </div>

            {/* Selector de Contenido a Listar / Imprimir */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Contenido a Listar / Imprimir</label>
              <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-xl text-xs font-bold text-center">
                <button
                  type="button"
                  onClick={() => setReportViewFilter('all')}
                  className={`py-1.5 px-1 rounded-lg transition-all cursor-pointer text-[11px] ${
                    reportViewFilter === 'all' ? 'bg-white text-slate-950 shadow-2xs font-extrabold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Todos
                </button>
                <button
                  type="button"
                  onClick={() => setReportViewFilter('ejecutadas')}
                  className={`py-1.5 px-1 rounded-lg transition-all cursor-pointer text-[11px] ${
                    reportViewFilter === 'ejecutadas' ? 'bg-emerald-600 text-white shadow-2xs font-extrabold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Listar exclusivamente repasos y actividades ejecutadas satisfactoriamente"
                >
                  ✓ Ejecutados
                </button>
                <button
                  type="button"
                  onClick={() => setReportViewFilter('no_ejecutadas')}
                  className={`py-1.5 px-1 rounded-lg transition-all cursor-pointer text-[11px] ${
                    reportViewFilter === 'no_ejecutadas' ? 'bg-rose-600 text-white shadow-2xs font-extrabold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Listar exclusivamente actividades no ejecutadas e incidencias"
                >
                  ⏳ Incidencias
                </button>
              </div>
            </div>

            {/* Opción Rápida: Listar e imprimir repasos hasta fin de obra */}
            <div className="p-3 bg-emerald-50/90 border border-emerald-300 rounded-xl space-y-2">
              <div className="flex items-center gap-1.5 text-emerald-900 font-extrabold text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Repasos hasta Fin de Obra</span>
              </div>
              <p className="text-[11px] text-emerald-800 leading-tight">
                Lista e imprime todas las actividades y repasos ejecutados satisfactoriamente hasta el final de la obra.
              </p>
              <button
                type="button"
                onClick={() => {
                  setReportPeriodType('total');
                  setReportViewFilter('ejecutadas');
                }}
                className={`w-full py-2 px-3 rounded-lg text-xs font-black cursor-pointer transition-all flex items-center justify-center gap-1.5 border shadow-2xs ${
                  reportPeriodType === 'total' && reportViewFilter === 'ejecutadas'
                    ? 'bg-emerald-600 text-white border-emerald-700'
                    : 'bg-white hover:bg-emerald-100 text-emerald-900 border-emerald-300'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>{reportPeriodType === 'total' && reportViewFilter === 'ejecutadas' ? '✓ Modo Fin de Obra Activo' : 'Listar Ejecutados Fin de Obra'}</span>
              </button>
            </div>

            {/* Controles específicos según período seleccionado */}
            {reportPeriodType === 'semanal' && (
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Semana a auditar</label>
                <input
                  type="date"
                  value={reportWeek || currentWeekMonday}
                  onChange={(e) => setReportWeek(getMonday(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold text-slate-700"
                />
                <p className="text-[10px] text-slate-400 mt-1">Lunes de inicio: {formatFriendlyDate(reportWeek || currentWeekMonday)}</p>
              </div>
            )}

            {reportPeriodType === 'quincenal' && (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Mes</label>
                    <select
                      value={reportMonth}
                      onChange={(e) => setReportMonth(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold text-slate-700"
                    >
                      {MESES.map((m, i) => (
                        <option key={m} value={i}>{m}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Año</label>
                    <input
                      type="number"
                      value={reportYear}
                      onChange={(e) => setReportYear(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold text-slate-700"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Quincena</label>
                  <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-xl text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setReportQuincena(1)}
                      className={`py-1.5 rounded-lg transition-all cursor-pointer ${
                        reportQuincena === 1 ? 'bg-amber-500 text-slate-950 font-bold shadow-2xs' : 'text-slate-600'
                      }`}
                    >
                      1ª (1 al 15)
                    </button>
                    <button
                      type="button"
                      onClick={() => setReportQuincena(2)}
                      className={`py-1.5 rounded-lg transition-all cursor-pointer ${
                        reportQuincena === 2 ? 'bg-amber-500 text-slate-950 font-bold shadow-2xs' : 'text-slate-600'
                      }`}
                    >
                      2ª (16 a fin)
                    </button>
                  </div>
                </div>
              </div>
            )}

            {reportPeriodType === 'mensual' && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Mes</label>
                  <select
                    value={reportMonth}
                    onChange={(e) => setReportMonth(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold text-slate-700"
                  >
                    {MESES.map((m, i) => (
                      <option key={m} value={i}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Año</label>
                  <input
                    type="number"
                    value={reportYear}
                    onChange={(e) => setReportYear(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold text-slate-700"
                  />
                </div>
              </div>
            )}

            {reportPeriodType === 'personalizado' && (
              <div className="space-y-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Fecha Desde</label>
                  <input
                    type="date"
                    value={reportCustomStart}
                    onChange={(e) => setReportCustomStart(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold text-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Fecha Hasta</label>
                  <input
                    type="date"
                    value={reportCustomEnd}
                    onChange={(e) => setReportCustomEnd(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold text-slate-700"
                  />
                </div>
              </div>
            )}

            {reportPeriodType === 'total' && (
              <div className="p-2.5 bg-amber-50/70 border border-amber-200 rounded-lg text-xs text-amber-900">
                <span className="font-bold">Modo Fin de Obra:</span> Incluye todas las actividades y repasos planificados o ejecutados en la obra sin límite de fecha.
              </div>
            )}

            {/* Filtros de Alcance */}
            <div className="pt-2 border-t border-slate-100 space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Filtrar por Obra</label>
                <select
                  value={reportObraId}
                  onChange={(e) => setReportObraId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold text-slate-700"
                >
                  <option value="all">📍 Todas las obras</option>
                  {obras.map(o => (
                    <option key={o[0]} value={o[0]}>🚧 {o[1]}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Filtrar por Gremio</label>
                <select
                  value={reportGremio}
                  onChange={(e) => setReportGremio(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold text-slate-700"
                >
                  <option value="all">👥 Todos los gremios</option>
                  {allGremios.map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Modalidad de Impresión */}
            <div className="pt-2 border-t border-slate-100">
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 flex items-center justify-between">
                <span>Modalidad de Impresión</span>
                <Printer className="w-3.5 h-3.5 text-slate-400" />
              </label>
              <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setReportPrintMode('consolidado')}
                  className={`py-1.5 px-2 rounded-lg transition-all cursor-pointer text-[11px] ${
                    reportPrintMode === 'consolidado' ? 'bg-white text-slate-950 shadow-2xs font-extrabold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Imprime todas las obras en un único documento continuo"
                >
                  Todo junto
                </button>
                <button
                  type="button"
                  onClick={() => setReportPrintMode('separado')}
                  className={`py-1.5 px-2 rounded-lg transition-all cursor-pointer text-[11px] ${
                    reportPrintMode === 'separado' ? 'bg-amber-500 text-slate-950 shadow-2xs font-black' : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Inserta saltos de página para que cada obra se imprima en hojas separadas con sus propias firmas"
                >
                  Obras separadas
                </button>
              </div>
              <p className="text-[10px] text-slate-500 mt-1 italic">
                {reportPrintMode === 'separado'
                  ? '📄 Salto de página activo: cada obra saldrá en hoja independiente.'
                  : '📑 Impresión continua de todas las obras en bloque único.'}
              </p>
            </div>

            {/* Mini Resumen de Conteo */}
            <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3 text-xs space-y-1.5">
              <div className="flex justify-between text-emerald-900 font-bold">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Ejecutados con éxito:
                </span>
                <span className="text-emerald-700 font-black text-sm">{completedInPeriod}</span>
              </div>
              <div className="flex justify-between text-rose-900 font-bold">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-rose-600" />
                  No ejecutadas / traslados:
                </span>
                <span className="text-rose-700 font-black text-sm">{totalIncidents}</span>
              </div>
              {pendingInPeriod > 0 && (
                <div className="flex justify-between text-amber-900 font-bold">
                  <span className="flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    Pendientes en el período:
                  </span>
                  <span className="text-amber-800 font-black text-sm">{pendingInPeriod}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600 pt-1 border-t border-amber-200/60">
                <span>Actividades programadas:</span>
                <span className="font-semibold text-slate-800">{totalTasksInPeriod}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Efectividad / Cumplimiento:</span>
                <span className={`font-black ${compliancePct >= 80 ? 'text-emerald-700' : compliancePct >= 50 ? 'text-amber-700' : 'text-rose-700'}`}>
                  {compliancePct}%
                </span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col gap-2">
            {/* Botón exclusivo en móvil para volver a la vista del informe tras aplicar filtros */}
            <button
              type="button"
              onClick={() => setMobileReportTab('preview')}
              className="md:hidden w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md transition-all border-none"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Aplicar y Ver Informe ({totalTasksInPeriod})</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-amber-500/10 transition-all border-none"
            >
              <Printer className="w-4 h-4" />
              <span>{reportPrintMode === 'separado' ? 'Imprimir por Obras Separadas' : 'Imprimir / Guardar PDF'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setEmailRecipient(currentUser?.email || '');
                setEmailSubject(`[ENUE] Informe de Repasos - ${reportObraName} (${periodLabel})`);
                setEmailScope(reportObraId);
                setEmailSendStatus('idle');
                setEmailCopiedFeedback(false);
                setIsEmailModalOpen(true);
              }}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-all border-none"
            >
              <Mail className="w-4 h-4 text-amber-400" />
              <span>Enviar Informe por Email</span>
            </button>
            <button
              type="button"
              onClick={() => setIsReportModalOpen(false)}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 rounded-xl text-xs cursor-pointer transition-all border-none"
            >
              Cerrar
            </button>
          </div>
        </div>

        {/* PANEL DERECHO: HOJA FORMAL DIN-A4 PARA VISUALIZAR E IMPRIMIR */}
        <div className={`${mobileReportTab === 'preview' ? 'flex' : 'hidden'} md:flex flex-1 bg-slate-200 p-0 md:p-6 overflow-y-auto justify-center print:block print:bg-white print:p-0 print:overflow-visible`}>
          <div className="bg-white w-full md:w-[210mm] min-h-none md:min-h-[297mm] shadow-lg p-4 sm:p-6 md:p-12 flex flex-col justify-between print:shadow-none print:p-0 print:w-full print:h-auto print:min-h-0">
            <div>
              {/* Cabecera Corporativa de ENUE */}
              <div className="border-b-4 border-amber-500 pb-4 mb-6 flex flex-col sm:flex-row sm:justify-between sm:items-end gap-2 print:flex-row print:justify-between print:items-end">
                <div>
                  <h2 className="text-xl font-black tracking-wider text-slate-900 m-0">ENUE</h2>
                  <p className="text-[9px] uppercase tracking-widest text-slate-500 font-bold m-0">Proyectos y Construcción S.L.</p>
                </div>
                <div className="sm:text-right print:text-right">
                  <div className="hidden md:flex print:hidden items-center justify-end gap-1.5 mb-2">
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-[11px] rounded-lg shadow-2xs flex items-center gap-1 cursor-pointer transition-colors"
                      title="Imprimir el informe"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>{reportPrintMode === 'separado' ? 'Imprimir Separado' : 'Imprimir'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEmailRecipient(currentUser?.email || '');
                        setEmailSubject(`[ENUE] Informe de Repasos - ${reportObraName} (${periodLabel})`);
                        setEmailScope(reportObraId);
                        setEmailSendStatus('idle');
                        setEmailCopiedFeedback(false);
                        setIsEmailModalOpen(true);
                      }}
                      className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white font-bold text-[11px] rounded-lg shadow-2xs flex items-center gap-1 cursor-pointer transition-colors"
                      title="Enviar el informe por correo"
                    >
                      <Mail className="w-3.5 h-3.5 text-amber-400" />
                      <span>Enviar por Email</span>
                    </button>
                  </div>
                  <h1 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-tight m-0">
                    {reportViewFilter === 'ejecutadas'
                      ? (reportPeriodType === 'total' ? 'INFORME DE REPASOS EJECUTADOS - HASTA FIN DE OBRA' : 'INFORME DE ACTIVIDADES Y REPASOS EJECUTADOS')
                      : reportViewFilter === 'no_ejecutadas'
                      ? 'INFORME DE NO EJECUCIÓN Y TRASLADOS'
                      : (reportPeriodType === 'total' ? 'INFORME DE REPASOS Y CONTROL - HASTA FIN DE OBRA' : 'INFORME DE REPASOS Y CONTROL DE EJECUCIÓN')}
                  </h1>
                  <p className="text-[10px] text-amber-700 font-bold m-0">
                    {reportPeriodType === 'total' ? 'HASTA FIN DE OBRA' : periodLabel}
                  </p>
                </div>
              </div>

              {/* Metadatos del Informe */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-50 border border-slate-200 rounded-xl p-3.5 mb-6 text-xs print:bg-transparent print:p-2">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Ámbito / Obra</p>
                  <p className="font-extrabold text-slate-900 truncate">{reportObraName}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Gremio / Subcontrata</p>
                  <p className="font-extrabold text-slate-900">{reportGremio === 'all' ? 'Todos los Gremios' : reportGremio}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Fecha de Emisión</p>
                  <p className="font-extrabold text-slate-900">{new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                </div>
              </div>

              {/* Bloque de Tarjetas KPI */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 mb-6">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Actividades Previstas</p>
                  <p className="text-xl font-black text-slate-900 mt-0.5">{totalTasksInPeriod}</p>
                  <p className="text-[10px] font-medium text-slate-500 mt-0.5">Programadas</p>
                </div>
                <div className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-300">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 flex items-center justify-between">
                    <span>Ejecutadas con Éxito</span>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  </p>
                  <p className="text-xl font-black text-emerald-900 mt-0.5">{completedInPeriod}</p>
                  <p className="text-[10px] font-semibold text-emerald-700 mt-0.5">{compliancePct}% efectividad</p>
                </div>
                <div className="bg-rose-50/60 p-3 rounded-xl border border-rose-200">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-rose-700 flex items-center justify-between">
                    <span>No Ejecutadas / Traslados</span>
                    <Clock className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                  </p>
                  <p className="text-xl font-black text-rose-800 mt-0.5">{totalIncidents}</p>
                  <p className="text-[10px] font-semibold text-rose-600 mt-0.5">{totalTasksInPeriod > 0 ? Math.round((totalIncidents / totalTasksInPeriod) * 100) : 0}% incidencias</p>
                </div>
                <div className="bg-amber-50/60 p-3 rounded-xl border border-amber-200">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-amber-800">Causa Principal</p>
                  <p className="text-xs font-black text-amber-950 mt-1 truncate" title={topMotive}>{topMotive}</p>
                  <p className="text-[10px] font-semibold text-amber-700 mt-0.5">Motivo frecuente</p>
                </div>
              </div>

              {/* LISTADO DE ACTIVIDADES Y REPASOS AGRUPADOS POR CADA OBRA */}
              <div className="space-y-8">
                {obrasGrouped.length === 0 ? (
                  <div className="p-12 text-center bg-slate-50 border border-slate-200 rounded-2xl">
                    <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                    <h4 className="font-bold text-slate-700 text-sm">Sin actividades ni repasos en el período</h4>
                    <p className="text-xs text-slate-500 mt-1">No se encontraron tareas registradas para los filtros seleccionados.</p>
                  </div>
                ) : (
                  obrasGrouped.map((group, groupIdx) => {
                    const obraColor = getObraColor(group.obra_id, obras);
                    const groupProgramadas = group.completedItems.length + group.incidentItems.length + (group.pendingItems?.length || 0);
                    const groupCompliance = groupProgramadas > 0 ? Math.round((group.completedItems.length / groupProgramadas) * 100) : 100;

                    return (
                      <div
                        key={group.obra_id}
                        className={`space-y-4 ${
                          groupIdx > 0 ? 'mt-8 pt-6 border-t border-slate-200' : ''
                        } ${
                          reportPrintMode === 'separado' && groupIdx > 0
                            ? 'print-page-break print:mt-0 print:pt-6 print:border-none'
                            : ''
                        }`}
                      >
                        {/* Cabecera corporativa repetida en cada obra si la modalidad de impresión es 'separada' */}
                        {reportPrintMode === 'separado' && groupIdx > 0 && (
                          <div className="hidden print:flex border-b-4 border-amber-500 pb-4 mb-6 justify-between items-end">
                            <div>
                              <h2 className="text-xl font-black tracking-wider text-slate-900 m-0">ENUE</h2>
                              <p className="text-[9px] uppercase tracking-widest text-slate-500 font-bold m-0">Proyectos y Construcción S.L.</p>
                            </div>
                            <div className="text-right">
                              <h1 className="text-sm font-black text-slate-900 uppercase tracking-tight m-0">
                                {reportViewFilter === 'ejecutadas'
                                  ? (reportPeriodType === 'total' ? 'INFORME DE REPASOS EJECUTADOS - HASTA FIN DE OBRA' : 'INFORME DE ACTIVIDADES Y REPASOS EJECUTADOS')
                                  : (reportPeriodType === 'total' ? 'INFORME DE REPASOS Y CONTROL - HASTA FIN DE OBRA' : 'INFORME DE REPASOS Y CONTROL DE EJECUCIÓN')}
                              </h1>
                              <p className="text-[10px] text-amber-700 font-bold m-0">
                                {reportPeriodType === 'total' ? 'HASTA FIN DE OBRA' : periodLabel}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Banner de la Obra con Nombre y Acciones */}
                        <div
                          className="rounded-xl border p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs print:border-l-8 print:p-2.5 print:shadow-none"
                          style={{
                            borderLeftWidth: '6px',
                            borderLeftColor: obraColor.border,
                            backgroundColor: obraColor.background || '#f8fafc',
                            borderColor: obraColor.border ? `${obraColor.border}40` : '#e2e8f0'
                          }}
                        >
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-0.5">
                              Centro de Trabajo / Obra
                            </span>
                            <h3 className="text-base sm:text-lg font-black text-slate-950 leading-tight">
                              {group.obra_nombre}
                            </h3>
                            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-1.5 text-xs">
                              <span className="inline-flex items-center gap-1 font-bold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-md text-[11px]">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                {group.completedItems.length} {group.completedItems.length === 1 ? 'repaso ejecutado' : 'repasos ejecutados'}
                              </span>
                              {group.incidentItems.length > 0 && (
                                <span className="inline-flex items-center gap-1 font-bold text-rose-800 bg-rose-100/80 px-2 py-0.5 rounded-md text-[11px]">
                                  <Clock className="w-3.5 h-3.5 text-rose-600" />
                                  {group.incidentItems.length} {group.incidentItems.length === 1 ? 'incidencia / traslado' : 'incidencias / traslados'}
                                </span>
                              )}
                              {group.pendingItems && group.pendingItems.length > 0 && (
                                <span className="inline-flex items-center gap-1 font-bold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-md text-[11px]">
                                  {group.pendingItems.length} pendientes
                                </span>
                              )}
                              <span className="inline-flex items-center gap-1 font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md text-[11px] border border-slate-200">
                                Total: {groupProgramadas} programadas
                              </span>
                              <span className={`inline-flex items-center gap-1 font-extrabold px-2 py-0.5 rounded-md text-[11px] border ${
                                groupCompliance >= 80 ? 'text-emerald-900 bg-emerald-50 border-emerald-200' :
                                groupCompliance >= 50 ? 'text-blue-900 bg-blue-50 border-blue-200' :
                                'text-rose-900 bg-rose-50 border-rose-200'
                              }`}>
                                {groupCompliance}% efectividad
                              </span>
                            </div>
                          </div>

                          {/* Acciones por obra individual (Ocultas al Imprimir) */}
                          <div className="flex items-center gap-2 shrink-0 print:hidden">
                            <button
                              type="button"
                              onClick={() => {
                                setReportObraId(group.obra_id);
                                setTimeout(() => window.print(), 100);
                              }}
                              className="flex-1 sm:flex-initial justify-center px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-800 text-[11px] font-bold rounded-lg border border-slate-200 flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
                              title="Imprimir únicamente esta obra de forma individual"
                            >
                              <Printer className="w-3.5 h-3.5 text-slate-600" />
                              <span>Imprimir obra</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEmailScope(group.obra_id);
                                setEmailRecipient(currentUser?.email || '');
                                setEmailSubject(`[ENUE] Informe de Repasos - ${group.obra_nombre} (${periodLabel})`);
                                setEmailSendStatus('idle');
                                setEmailCopiedFeedback(false);
                                setIsEmailModalOpen(true);
                              }}
                              className="flex-1 sm:flex-initial justify-center px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 text-[11px] font-black rounded-lg shadow-2xs flex items-center gap-1.5 cursor-pointer transition-colors"
                              title="Enviar el informe de esta obra por correo electrónico"
                            >
                              <Mail className="w-3.5 h-3.5" />
                              <span>Enviar por mail</span>
                            </button>
                          </div>
                        </div>

                        {/* Listado de Actividades y Repasos Ejecutados de esta Obra */}
                        {(reportViewFilter === 'all' || reportViewFilter === 'ejecutadas') && (
                          <div className="space-y-2">
                            <div className="flex justify-between items-center px-1">
                              <span className="text-[11px] font-black uppercase tracking-wider text-emerald-800 flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                Repasos Ejecutados Satisfactoriamente ({group.completedItems.length})
                              </span>
                            </div>

                            {group.completedItems.length === 0 ? (
                              <div className="p-4 text-center bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 italic">
                                Sin actividades ejecutadas registradas para esta obra en las fechas seleccionadas.
                              </div>
                            ) : (
                              <div className="border border-slate-200 rounded-xl overflow-x-auto print:overflow-visible print:border-slate-300">
                                <table className="w-full min-w-[540px] sm:min-w-0 print:min-w-0 border-collapse text-left text-xs">
                                  <thead>
                                    <tr className="bg-emerald-50/70 text-slate-700 border-b border-slate-200 font-bold uppercase text-[10px] tracking-wider print:bg-slate-50">
                                      <th className="p-2.5">Gremio</th>
                                      <th className="p-2.5">Actividad / Repaso</th>
                                      <th className="p-2.5">Fecha Ejecución</th>
                                      <th className="p-2.5">Historial / Tipo</th>
                                      <th className="p-2.5">Observaciones & Verificación</th>
                                      <th className="p-2.5 text-center">Resultado</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 print:divide-slate-200">
                                    {group.completedItems.map((item, idx) => (
                                      <tr key={`${item.taskId}-${idx}`} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="p-2.5 align-top whitespace-nowrap">
                                          <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded uppercase ${getGremioTagClasses(item.gremio)}`}>
                                            {item.gremio}
                                          </span>
                                        </td>
                                        <td className="p-2.5 align-top font-bold text-slate-900 leading-snug">
                                          {item.actividad}
                                        </td>
                                        <td className="p-2.5 align-top text-slate-700 font-bold whitespace-nowrap">
                                          <div>{item.dia_semana || '—'}</div>
                                          <div className="text-[10px] font-normal text-slate-500">{formatFriendlyDate(item.fecha_ejecucion)}</div>
                                        </td>
                                        <td className="p-2.5 align-top">
                                          {item.es_repaso_subsanado ? (
                                            <div className="space-y-0.5">
                                              <span className="inline-block font-extrabold text-amber-900 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded text-[9px]">
                                                Subsanado tras {item.total_aplazamientos} {item.total_aplazamientos === 1 ? 'repaso' : 'repasos'}
                                              </span>
                                              {item.aplazamientos && item.aplazamientos.length > 0 && item.aplazamientos[item.aplazamientos.length - 1].motivo && (
                                                <p className="text-[10px] text-slate-500 italic mt-0.5">
                                                  Previo: {item.aplazamientos[item.aplazamientos.length - 1].motivo}
                                                </p>
                                              )}
                                            </div>
                                          ) : (
                                            <span className="inline-block font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded text-[9px]">
                                              A término (Sin retraso)
                                            </span>
                                          )}
                                        </td>
                                        <td className="p-2.5 align-top text-slate-600 text-[11px] leading-tight">
                                          {item.notas ? (
                                            <span className="italic">"{item.notas}"</span>
                                          ) : (
                                            <span className="text-slate-400 font-normal">—</span>
                                          )}
                                        </td>
                                        <td className="p-2.5 align-top text-center whitespace-nowrap">
                                          <span className="inline-flex items-center gap-1 text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded text-[10px] border border-emerald-200">
                                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                            ✓ Ejecutado
                                          </span>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Listado de Incidencias y Traslados de esta Obra (si corresponde por filtro) */}
                        {(reportViewFilter === 'all' || reportViewFilter === 'no_ejecutadas') && group.incidentItems.length > 0 && (
                          <div className="space-y-2 mt-4">
                            <span className="text-[11px] font-black uppercase tracking-wider text-rose-800 flex items-center gap-1 px-1">
                              <Clock className="w-3.5 h-3.5 text-rose-600" />
                              Incidencias y Traslados de Fecha ({group.incidentItems.length})
                            </span>
                            <div className="border border-slate-200 rounded-xl overflow-x-auto print:overflow-visible print:border-slate-300">
                              <table className="w-full min-w-[580px] sm:min-w-0 print:min-w-0 border-collapse text-left text-xs">
                                <thead>
                                  <tr className="bg-rose-50/60 text-slate-700 border-b border-slate-200 font-bold uppercase text-[10px] tracking-wider print:bg-slate-50">
                                    <th className="p-2.5">Gremio</th>
                                    <th className="p-2.5">Actividad Programada</th>
                                    <th className="p-2.5">Fecha Prevista</th>
                                    <th className="p-2.5">Causas & Observaciones</th>
                                    <th className="p-2.5">Trasladada a</th>
                                    <th className="p-2.5 text-center">Nº Aplazam.</th>
                                    <th className="p-2.5 text-center">Estado</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 print:divide-slate-200">
                                  {group.incidentItems.map((item, idx) => (
                                    <tr key={`${item.taskId}-${idx}`} className="hover:bg-slate-50/50 transition-colors">
                                      <td className="p-2.5 align-top whitespace-nowrap">
                                        <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded uppercase ${getGremioTagClasses(item.gremio)}`}>
                                          {item.gremio}
                                        </span>
                                      </td>
                                      <td className="p-2.5 align-top font-bold text-slate-900 leading-snug">
                                        {item.actividad}
                                      </td>
                                      <td className="p-2.5 align-top text-rose-700 font-bold whitespace-nowrap">
                                        {item.dia_anterior}
                                        <div className="text-[10px] font-normal text-slate-500">{formatFriendlyDate(item.fecha_anterior)}</div>
                                      </td>
                                      <td className="p-2.5 align-top space-y-1">
                                        <div className="flex flex-wrap gap-1">
                                          {(item.tags || (item.motivo ? item.motivo.split(',').map(s => s.trim()) : ['General'])).map(t => (
                                            <span key={t} className="font-bold text-amber-950 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded text-[10px]">
                                              #{t}
                                            </span>
                                          ))}
                                        </div>
                                        {item.detalle && (
                                          <p className="text-[11px] italic text-slate-600 leading-tight">
                                            "{item.detalle}"
                                          </p>
                                        )}
                                      </td>
                                      <td className="p-2.5 align-top text-amber-900 font-bold whitespace-nowrap">
                                        {item.dia_nuevo}
                                        <div className="text-[10px] font-normal text-slate-500">{formatFriendlyDate(item.fecha_nueva)}</div>
                                      </td>
                                      <td className="p-2.5 align-top text-center">
                                        <span className="font-black text-slate-800 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full text-[10px]">
                                          {item.numero_intento}º
                                        </span>
                                      </td>
                                      <td className="p-2.5 align-top text-center whitespace-nowrap">
                                        {item.completada ? (
                                          <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded text-[10px] border border-emerald-200">
                                            ✓ Hecha
                                          </span>
                                        ) : (
                                          <span className="text-amber-800 font-bold bg-amber-50 px-2 py-0.5 rounded text-[10px] border border-amber-200">
                                            ⏳ Pendiente
                                          </span>
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        {/* Si estamos en modo de impresión separada, agregamos firmas al pie de CADA obra al imprimir */}
                        {reportPrintMode === 'separado' && (
                          <div className="hidden print:grid grid-cols-2 gap-8 text-center pt-8 mt-6 border-t border-slate-200 print-avoid-break">
                            <div>
                              <div className="h-12 flex items-end justify-center mb-1">
                                <span className="text-[10px] text-slate-400 italic">Firma del Encargado</span>
                              </div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Encargado de Obra ({group.obra_nombre})</p>
                              <p className="text-xs font-bold text-slate-800 border-t border-solid border-slate-300 pt-1 w-48 mx-auto">Revisión de Ejecución</p>
                            </div>
                            <div>
                              <div className="h-12 flex items-end justify-center mb-1">
                                <span className="text-[10px] text-slate-400 italic">Firma Dirección Facultativa</span>
                              </div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Jefe de Obra / Supervisión ENUE</p>
                              <p className="text-xs font-bold text-slate-800 border-t border-solid border-slate-300 pt-1 w-48 mx-auto">Dirección Facultativa</p>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Desglose global de causas de no ejecución (Gráfica al final del informe) */}
              {(reportViewFilter === 'all' || reportViewFilter === 'no_ejecutadas') && totalIncidents > 0 && Object.keys(motivesCount).length > 0 && (
                <div className="mt-10 p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3.5 print:bg-slate-50/50 print:border-slate-300 print:mt-8 print-avoid-break">
                  <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                      <span>Distribución de Causas y Etiquetas de No Ejecución</span>
                    </h4>
                    <span className="text-[10px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded-full border border-slate-200 shadow-2xs">
                      {totalIncidents} {totalIncidents === 1 ? 'incidencia registrada' : 'incidencias registradas'}
                    </span>
                  </div>

                  <div className="space-y-2 pt-1">
                    {Object.entries(motivesCount)
                      .sort((a, b) => b[1] - a[1])
                      .map(([motivo, count]) => {
                        const pct = Math.round((count / totalIncidents) * 100);
                        return (
                          <div key={motivo} className="space-y-1">
                            <div className="flex justify-between text-xs text-slate-800 font-semibold">
                              <span className="truncate pr-2">{motivo}</span>
                              <span className="font-black shrink-0 text-slate-900">{count} {count === 1 ? 'vez' : 'veces'} ({pct}%)</span>
                            </div>
                            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                              <div
                                className="bg-amber-500 h-full rounded-full transition-all duration-500"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>

            {/* Zona de Firmas y Validación Formal (Global para impresión consolidada o pantalla) */}
            {reportPrintMode === 'consolidado' && (
              <div className="mt-12 pt-6 border-t border-slate-200 grid grid-cols-2 gap-8 text-center print:mt-16 print:border-slate-300 print-avoid-break">
                <div>
                  <div className="h-14 flex items-end justify-center mb-1">
                    <span className="text-[10px] text-slate-300 italic">Firma del Encargado</span>
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Encargado de Obra</p>
                  <p className="text-xs font-bold text-slate-800 border-t border-solid border-slate-200 pt-1 w-48 mx-auto">Revisión de Ejecución</p>
                </div>
                <div>
                  <div className="h-14 flex items-end justify-center mb-1">
                    <span className="text-[10px] text-slate-300 italic">Firma Dirección Facultativa</span>
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Jefe de Obra / Supervisión ENUE</p>
                  <p className="text-xs font-bold text-slate-800 border-t border-solid border-slate-200 pt-1 w-48 mx-auto">Dirección de Obra</p>
                </div>
              </div>
            )}

            {/* Pie de Página del Documento */}
            <div className="mt-8 text-center border-t border-slate-100 pt-3 flex justify-between text-[8px] text-slate-400 uppercase tracking-widest font-semibold print:mt-10 print:border-slate-200">
              <span>ENUE PROYECTOS Y CONSTRUCCIÓN S.L.</span>
              <span>INFORME DE REPASOS Y CONTROL · {new Date().toLocaleDateString('es-ES')}</span>
              <span>PÁGINA 1 DE 1</span>
            </div>

          </div>
        </div>

        {/* MODAL FLOTANTE: ENVIAR INFORME POR CORREO ELECTRÓNICO */}
        {isEmailModalOpen && (
          <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs print:hidden">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden border border-slate-200 flex flex-col max-h-[92vh]">
              {/* Cabecera del Modal de Email */}
              <div className="bg-slate-900 text-white p-4 px-6 flex justify-between items-center">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-blue-600 text-white rounded-xl font-bold shadow-xs">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-base leading-tight">Enviar Informe por Correo Electrónico</h3>
                      <span className="bg-blue-900/60 text-blue-200 border border-blue-500/40 px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>
                        Google Workspace · enue.es
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">ENUE Proyectos y Construcción S.L.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEmailModalOpen(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Formulario de Email */}
              <div className="p-6 overflow-y-auto space-y-4 text-xs">
                {/* Banner de Identidad Google Workspace de la Empresa */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50/60 border border-blue-200 rounded-xl p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-xs">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <path d="M22 6C22 4.9 21.1 4 20 4H4C2.9 4 2 4.9 2 6V18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V6Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M22 6L12 13L2 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-[11px] font-extrabold text-blue-950">Google Workspace Corporativo</p>
                        <span className="text-[9px] font-black uppercase tracking-wider bg-blue-200/70 text-blue-800 px-1.5 py-0.2 rounded">enue.es</span>
                      </div>
                      <p className="text-[11px] text-blue-800">
                        Remitente: <span className="font-bold text-blue-950">{currentUser?.email || 'usuario@enue.es'}</span> {currentUser?.displayName ? `(${currentUser.displayName})` : ''}
                      </p>
                    </div>
                  </div>
                  <span className="hidden sm:inline-block text-[10px] font-bold text-emerald-700 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-md">
                    ✓ Sesión activa
                  </span>
                </div>

                {/* Selector de alcance de obras */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Alcance del Informe a Enviar
                  </label>
                  <select
                    value={emailScope}
                    onChange={(e) => {
                      setEmailScope(e.target.value);
                      const name = e.target.value === 'all'
                        ? 'Todas las obras activas'
                        : (obras.find(o => o[0] === e.target.value)?.[1] || 'Obra');
                      setEmailSubject(`[ENUE] Informe de Repasos y Ejecución - ${name} (${periodLabel})`);
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">📍 Todas las obras agrupadas ({obrasGrouped.length} obras)</option>
                    {obrasGrouped.map(g => (
                      <option key={g.obra_id} value={g.obra_id}>
                        🚧 Solo: {g.obra_nombre} ({g.completedItems.length} ejecutadas)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Tarjeta Destacada: Informe en Formato PDF */}
                <div className="bg-amber-50/80 border border-amber-300 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                  <div className="flex items-start gap-2.5">
                    <div className="p-2 bg-amber-500 text-slate-950 rounded-lg shrink-0 mt-0.5 shadow-xs">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-extrabold text-xs text-slate-900 flex items-center gap-1.5">
                        <span>Documento Oficial Adjunto (PDF)</span>
                        <span className="text-[9px] bg-amber-200 text-amber-900 font-black px-1.5 py-0.2 rounded uppercase">Obligatorio</span>
                      </p>
                      <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                        El informe formal con todas las actividades, repasos, incidencias y firmas se envía como archivo PDF adjunto al correo.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shrink-0 transition-colors shadow-sm"
                    title="Guarda o descarga el informe en PDF con formato DIN-A4 oficial"
                  >
                    <Printer className="w-3.5 h-3.5 text-amber-400" />
                    <span>Guardar / Descargar PDF</span>
                  </button>
                </div>

                {/* Correo Destinatario */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Correo Electrónico Destinatario *
                  </label>
                  <input
                    type="email"
                    value={emailRecipient}
                    onChange={(e) => setEmailRecipient(e.target.value)}
                    placeholder="ej. direccion@enue.es, cliente@empresa.com"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Sugerencias corporativas:</span>
                    {currentUser?.email && (
                      <button
                        type="button"
                        onClick={() => setEmailRecipient(currentUser.email)}
                        className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-bold cursor-pointer transition-colors"
                      >
                        Mi correo ({currentUser.email})
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setEmailRecipient('direccion@enue.es')}
                      className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-bold cursor-pointer transition-colors"
                    >
                      direccion@enue.es
                    </button>
                    <button
                      type="button"
                      onClick={() => setEmailRecipient('tecnico@enue.es')}
                      className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-bold cursor-pointer transition-colors"
                    >
                      tecnico@enue.es
                    </button>
                    <button
                      type="button"
                      onClick={() => setEmailRecipient('administracion@enue.es')}
                      className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-bold cursor-pointer transition-colors"
                    >
                      administracion@enue.es
                    </button>
                    <button
                      type="button"
                      onClick={() => setEmailRecipient('obras@enue.es')}
                      className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-bold cursor-pointer transition-colors"
                    >
                      obras@enue.es
                    </button>
                  </div>
                </div>

                {/* Asunto */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Asunto del Mensaje
                  </label>
                  <input
                    type="text"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Mensaje Adicional */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Mensaje Personalizado Adicional (Opcional)
                  </label>
                  <textarea
                    value={emailMessage}
                    onChange={(e) => setEmailMessage(e.target.value)}
                    rows={2}
                    placeholder="Instrucciones o notas introductorias antes del texto de remisión..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>

                {/* Previsualización del Resumen */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Cuerpo del Mensaje (Remisión Formal del Informe en PDF)
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyReportText}
                      className="text-[10px] font-bold text-blue-700 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                    >
                      <Copy className="w-3 h-3" />
                      <span>{emailCopiedFeedback ? '✓ ¡Copiado!' : 'Copiar Texto'}</span>
                    </button>
                  </div>
                  <pre className="text-[10px] font-mono bg-white p-2.5 rounded-lg border border-slate-200 text-slate-700 max-h-36 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                    {(emailMessage ? `${emailMessage}\n\n==================================================\n\n` : '') + generateEmailReportText(emailScope)}
                  </pre>
                </div>

                {/* Confirmación visual */}
                {emailSendStatus === 'sent' && (
                  <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-950 space-y-2">
                    <div className="flex items-center gap-2 font-black text-xs text-emerald-800">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>¡Redactor de Google Workspace (Gmail) preparado y abierto!</span>
                    </div>
                    <p className="text-[11px] text-emerald-800">
                      Se ha abierto una nueva pestaña con tu cuenta corporativa <span className="font-bold">{currentUser?.email || 'enue.es'}</span> para enviar a <span className="font-bold">{emailRecipient || 'destinatario'}</span>.
                    </p>
                    <div className="p-2.5 bg-amber-100/80 border border-amber-300 rounded-lg text-[11px] text-amber-950 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-xs">📎 Adjuntar el archivo PDF en Gmail:</p>
                        <p className="text-[10px] text-amber-900 mt-0.5">
                          En la ventana de Gmail que se acaba de abrir, pulsa el icono del clip y adjunta el informe PDF guardado antes de hacer clic en «Enviar».
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Botones de acción del Modal de Email */}
              <div className="bg-slate-50 p-4 border-t border-slate-100 flex flex-col sm:flex-row gap-2">
                {/* Botón Principal: Google Workspace Gmail */}
                <button
                  type="button"
                  onClick={handleSendViaGoogleWorkspace}
                  disabled={emailSendStatus === 'sending'}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-black py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-blue-600/20 transition-all border-none disabled:opacity-50"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <path d="M22 6C22 4.9 21.1 4 20 4H4C2.9 4 2 4.9 2 6V18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V6Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M22 6L12 13L2 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span>{emailSendStatus === 'sending' ? 'Abriendo Google Workspace...' : 'Enviar con Google Workspace (Gmail)'}</span>
                  <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                </button>

                {/* Botón Secundario: Gestor Local */}
                <button
                  type="button"
                  onClick={handleSendViaMailto}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all border border-slate-200"
                  title="Abrir con el cliente de correo predeterminado del sistema (Outlook / Thunderbird)"
                >
                  <Mail className="w-3.5 h-3.5 text-slate-600" />
                  <span>Gestor Local</span>
                </button>

                {/* Botón Secundario: Copiar Texto */}
                <button
                  type="button"
                  onClick={handleCopyReportText}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all border border-slate-200"
                  title="Copiar texto del informe al portapapeles"
                >
                  <Copy className="w-3.5 h-3.5 text-slate-600" />
                  <span>{emailCopiedFeedback ? '¡Copiado!' : 'Copiar'}</span>
                </button>

                {/* Cerrar */}
                <button
                  type="button"
                  onClick={() => setIsEmailModalOpen(false)}
                  className="py-2.5 px-4 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs cursor-pointer transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* LIGHTBOX MODAL PARA AMPLIAR CROQUIS DE TAREAS */}
        {taskLightboxImage && (
          <div
            className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out"
            onClick={() => setTaskLightboxImage(null)}
          >
            <div
              className="relative max-w-4xl max-h-[90vh] bg-white rounded-3xl p-3 shadow-2xl overflow-hidden animate-scale-in"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setTaskLightboxImage(null)}
                className="absolute top-4 right-4 p-2 bg-slate-900/70 hover:bg-slate-900 text-white rounded-full transition-all cursor-pointer z-10"
              >
                <X className="w-5 h-5" />
              </button>
              <img
                src={taskLightboxImage}
                alt="Croquis de la tarea a tamaño completo"
                className="max-w-full max-h-[82vh] object-contain rounded-2xl mx-auto"
              />
            </div>
          </div>
        )}

      </div>
    </div>
  );
})()}
</div>
);
}

export default App;
