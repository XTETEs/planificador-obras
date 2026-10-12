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
ArrowRight
} from 'lucide-react';
import { migrateLocalDataToFirestore } from './services/db.js';
// EMBEDDED DATABASES ID
const DB_ID = '6a548f958d05750f33c2b531';
const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];
const GREMIOS_PREDEFINIDOS = [
  'Albañilería', 'Estructura', 'Pintura', 'Fontanería', 'Electricidad',
  'Pladur / Yeso', 'Climatización', 'Carpintería', 'Instalaciones',
  'Limpieza', 'Cerramientos', 'Jardinería / Exteriores', 'Otros'
];
const getGremioTagClasses = (gremio, completada = false) => {
  if (completada) return 'bg-slate-100 text-slate-400';
  const clasesPorGremio = {
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
  return clasesPorGremio[gremio] || clasesPorGremio['Otros'];
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

const MOTIVOS_NO_EJECUCION = [
  'Falta de material / Suministros',
  'Subcontrata / Gremio no comparece',
  'Condiciones climáticas adversas / Lluvia',
  'Retraso en fase o gremio predecesor',
  'Modificación de proyecto / Instrucción de Dirección',
  'Incidencia de seguridad / Falta de protecciones',
  'Falta de permisos / Acceso a zona de trabajo',
  'Prioridad cambiada a otra zona u obra',
  'Otro motivo'
];

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
const [db] = useState(() => AiKit.db(DB_ID, { live: true }));
// State
const [obras, setObras] = useState([]);
const [tareas, setTareas] = useState([]);
const [todasLasTareas, setTodasLasTareas] = useState([]);
const [selectedObraId, setSelectedObraId] = useState('all');
const [currentWeekMonday, setCurrentWeekMonday] = useState(() => getMonday(new Date()));
// Vistas principales: 'semanal' o 'mensual'
const [activeView, setActiveView] = useState('semanal');
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
gremio: 'Albañilería',
obra_id: '',
notas: ''
});
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
const [postponeMotivo, setPostponeMotivo] = useState(MOTIVOS_NO_EJECUCION[0]);
const [postponeDetalle, setPostponeDetalle] = useState('');
const [postponeTargetWeek, setPostponeTargetWeek] = useState(currentWeekMonday);
const [postponeTargetDay, setPostponeTargetDay] = useState('Lunes');
const [postponeTargetObraId, setPostponeTargetObraId] = useState(null);
// State for viewing detailed postponement history of a task
const [selectedTaskHistory, setSelectedTaskHistory] = useState(null);
// State for Incident / Postponement Report Modal
const [isReportModalOpen, setIsReportModalOpen] = useState(false);
const [reportPeriodType, setReportPeriodType] = useState('mensual'); // 'semanal', 'quincenal', 'mensual', 'personalizado'
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
// Fetch list of works and tasks
const loadData = useCallback(async () => {
if (!db) return;
try {
// Load construction sites
const obrasRes = await db.query('SELECT * FROM obras ORDER BY nombre ASC');
setObras(obrasRes.rows || []);
if (obrasRes.rows && obrasRes.rows.length > 0 && !manualTask.obra_id) {
setManualTask(prev => ({ ...prev, obra_id: obrasRes.rows[0][0] }));
}
// Load all tasks for printing and filter the current week for the weekly grid
const query = `
SELECT t.id, t.obra_id, t.fecha_semana, t.dia_semana, t.actividad, t.gremio, t.completada, t.notas, o.nombre as obra_nombre FROM tareas t LEFT JOIN obras o ON t.obra_id = o.id ORDER BY t.fecha_semana ASC, t.fecha_creado ASC
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
obra_nombre: row[8] || 'Obra Desconocida'
}));
setTodasLasTareas(mappedTareas);
setTareas(mappedTareas.filter(task => task.fecha_semana === currentWeekMonday));
} catch (e) {
setError('Error cargando datos de la base de datos: ' + e.message);
}
}, [db, currentWeekMonday, manualTask.obra_id]);
useEffect(() => {
loadData();
}, [loadData]);
// Database Sync Event listeners
useEffect(() => {
if (!db) return;
const unsubscribe = db.onPendingChange((hasPending) => {
setSyncing(hasPending);
if (!hasPending) {
loadData(); // Reload safely when synched
}
});
return () => unsubscribe();
}, [db, loadData]);
useEffect(() => {
  const alreadyMigrated = localStorage.getItem('local_db_migrated_v1');
  if (!alreadyMigrated) {
    migrateLocalDataToFirestore().then((res) => {
      if (res.success && (res.countObras > 0 || res.countTareas > 0)) {
        localStorage.setItem('local_db_migrated_v1', 'true');
        setSuccessMessage(`Sincronización automática: se han volcado ${res.countObras} obras y ${res.countTareas} tareas locales a Firebase.`);
        loadData();
      }
    }).catch(console.error);
  }
}, [loadData]);
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
try {
await db.exec('INSERT OR REPLACE INTO obras (id, nombre, activo) VALUES (?, ?, ?)', [id, newObraNombre.trim(), '1']);
setObras(prev => {
const exists = prev.some(o => o[0] === id);
if (exists) return prev;
return [...prev, [id, newObraNombre.trim(), 1]];
});
setManualTask(prev => ({ ...prev, obra_id: id }));
setError(null);
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
// Add single manual task
const handleAddManualTask = async (e) => {
e.preventDefault();
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
manualTask.obra_id,
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
const matchedObra = obras.find(o => o[0] === manualTask.obra_id);
const newLocalTask = {
id: taskId,
obra_id: manualTask.obra_id,
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
(id, obra_id, fecha_semana, dia_semana, actividad, gremio, completada, notas, fecha_creado)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
[
taskId,
sourceTask.obra_id,
normalizedWeek,
targetDay,
sourceTask.actividad,
sourceTask.gremio,
'0',
sourceTask.notas || '',
fechaCreado
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
obra_nombre: sourceTask.obra_nombre
}]);
}
setCopyingTask(null);
setError(null);
setSuccessMessage(`Copia creada para la semana del ${formatFriendlyDate(normalizedWeek)}.`);
} catch (err) {
setError('Error al copiar actividad: ' + err.message);
}
};

// Open Postpone / Non-execution Modal for a task
const handleOpenPostponeModal = (task, targetWeek = null, targetDay = null, targetObraId = null) => {
  setPostponeTask(task);
  setPostponeMotivo(MOTIVOS_NO_EJECUCION[0]);
  setPostponeDetalle('');
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
  if (!postponeMotivo.trim()) {
    setError('Por favor, selecciona o indica el motivo de no ejecución.');
    return;
  }

  const { userNotas, aplazamientos } = parseTaskNotas(postponeTask.notas);
  const currentExactDate = getTaskExactDate(postponeTask);
  
  const targetMonday = getMonday(postponeTargetWeek);
  const dayOffset = DIAS_SEMANA_OFFSET[postponeTargetDay] ?? 0;
  const mParts = targetMonday.split('-').map(Number);
  const targetDateObj = new Date(mParts[0], mParts[1] - 1, mParts[2] + dayOffset, 12);
  const targetExactDate = `${targetDateObj.getFullYear()}-${String(targetDateObj.getMonth() + 1).padStart(2, '0')}-${String(targetDateObj.getDate()).padStart(2, '0')}`;

  const newIncident = {
    id: 'apl_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
    fecha_anterior: currentExactDate,
    dia_anterior: postponeTask.dia_semana,
    fecha_nueva: targetExactDate,
    dia_nuevo: postponeTargetDay,
    motivo: postponeMotivo.trim(),
    detalle: (postponeDetalle || '').trim(),
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
    setPostponeMotivo(MOTIVOS_NO_EJECUCION[0]);
    setPostponeDetalle('');
    setError(null);
    setSuccessMessage(`Incidencia registrada: Actividad trasladada al ${postponeTargetDay} ${formatFriendlyDate(targetExactDate)}.`);
  } catch (err) {
    setError('Error al registrar el aplazamiento: ' + err.message);
  }
};

// Calculate Start Date and End Date for the Report
const getReportDateRange = useCallback(() => {
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
}, [reportPeriodType, reportWeek, currentWeekMonday, reportYear, reportMonth, reportQuincena, reportCustomStart, reportCustomEnd]);

// Compute report metrics and list of unexecuted / postponed tasks
const reportData = useMemo(() => {
  const { startDate, endDate } = getReportDateRange();
  if (!startDate || !endDate) return { items: [], totalTasksInPeriod: 0, completedInPeriod: 0, motivesCount: {} };

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
      const inPeriod = (apl.fecha_anterior >= startDate && apl.fecha_anterior <= endDate)
        || (apl.fecha_nueva >= startDate && apl.fecha_nueva <= endDate);

      if (inPeriod) {
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
          motivo: apl.motivo,
          detalle: apl.detalle,
          fecha_registro: apl.fecha_registro,
          total_aplazamientos: aplazamientos.length,
          numero_intento: idx + 1
        });

        motivesCount[apl.motivo] = (motivesCount[apl.motivo] || 0) + 1;
      }
    });
  });

  // Baseline tasks planned for this period
  const tasksInPeriod = scopedTasks.filter(t => {
    const d = getTaskExactDate(t);
    return d && d >= startDate && d <= endDate;
  });

    return {
      items: incidentItems,
      totalTasksInPeriod: tasksInPeriod.length,
      completedInPeriod: tasksInPeriod.filter(t => t.completada).length,
      motivesCount,
      startDate,
      endDate,
      label: getReportDateRange().label
    };
}, [getReportDateRange, todasLasTareas, reportObraId, reportGremio]);

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
// AI Smart Parsing of dictation
const parseDictationWithAI = async () => {
if (!transcript.trim()) return;
setIsParsingSpeech(true);
setError(null);
try {
const client = AiKit.createClient();
const obrasTextList = obras.map(o => `ID "${o[0]}": "${o[1]}"`).join('\n');
const systemPrompt = `
Eres un experto planificador y estructurador de agendas de obra en España.
Tu misión es analizar una transcripción de voz (dictado) de obra y extraer actividades y organizarlas por días de la semana y obras.
Estas son las obras cargadas actualmente en el sistema (usa exactamente sus IDs):
${obrasTextList}
Si el dictado menciona o alude fuertemente a una obra, por favor emparéjala con su ID. Si no se puede deducir la obra, usa la obra '1' por defecto (Edificio Salamanca 50).
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
setError('Error al procesar dictado con IA: ' + err.message);
} finally {
setIsParsingSpeech(false);
}
};
// Save all preview/parsed tasks to SQLite
const saveParsedTasks = async () => {
if (parsedTasks.length === 0) return;
try {
const nowIso = new Date().toISOString();
// Insert each task
const pendingQueries = parsedTasks.map((t, idx) => {
const taskId = 't_' + Date.now() + '_' + idx;
return db.exec(
`INSERT OR REPLACE INTO tareas
(id, obra_id, fecha_semana, dia_semana, actividad, gremio, completada, notas, fecha_creado)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
[
taskId,
t.obra_id || '1',
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
return (
<div className="min-h-screen bg-slate-50 text-slate-800">
{/* Dashboard Principal (Oculto al imprimir) */}
<div className="print:hidden max-w-7xl mx-auto px-4 py-6 md:py-10">
{/* Header */}
<div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
<div className="flex items-center gap-3">
<div className="bg-amber-500 text-white p-3 rounded-xl shadow-md shadow-amber-500/20">
<Building className="w-6 h-6" />
</div>
<div>
<h1 className="text-2xl font-bold text-slate-950 flex items-center gap-2">
Planificador Semanal
{syncing && (
<span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 animate-pulse">
<RefreshCw className="w-3 h-3 mr-1 animate-spin" /> Guardando...
</span>
)}
</h1>
<p className="text-sm text-slate-500">ENUE Proyectos y Construcción</p>
</div>
</div>
<div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
{/* Botón Informe de Repasos / Incidencias */}
<button
type="button"
onClick={() => setIsReportModalOpen(true)}
className="bg-white hover:bg-amber-50 hover:text-amber-800 text-slate-800 font-semibold px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all border border-slate-200 shadow-2xs hover:border-amber-300 shrink-0 cursor-pointer"
title="Generar informe semanal, quincenal o mensual de tareas no ejecutadas y repasos"
>
<FileSpreadsheet className="w-4 h-4 text-amber-500 shrink-0" />
<span>Informe de Repasos</span>
</button>
{/* Dictate Button */}
<button
onClick={() => { setIsDictatingModalOpen(true); setParsedTasks([]); }}
className="bg-amber-500 hover:bg-amber-600 text-slate-950 hover:cursor-pointer font-semibold px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-md shadow-amber-500/10 shrink-0"
>
<Mic className="w-5 h-5 animate-pulse" />
<span>Dictar Plan</span>
</button>
{/* Create manual task */}
<button
onClick={() => setIsNewTaskModalOpen(true)}
className="bg-slate-900 hover:bg-slate-800 text-white hover:cursor-pointer font-medium px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all shrink-0"
>
<Plus className="w-4 h-4" />
<span>Añadir Actividad</span>
</button>
</div>
</div>
{/* Alerts panel */}
{error && (
<div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-start gap-3">
<AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
<div className="flex-1 text-sm font-medium">{error}</div>
<button onClick={() => setError(null)} className="text-red-500 hover:text-red-800">
<X className="w-5 h-5" />
</button>
</div>
)}
{successMessage && (
<div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 flex items-start gap-3">
<Check className="w-5 h-5 shrink-0 mt-0.5" />
<div className="flex-1 text-sm font-medium">{successMessage}</div>
<button onClick={() => setSuccessMessage(null)} className="text-emerald-500 hover:text-emerald-800">
<X className="w-5 h-5" />
</button>
</div>
)}
{/* Selector de Vista: Semanal vs Cuadrante Mensual */}
<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
  <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200/80 shadow-inner">
    <button
      type="button"
      onClick={() => setActiveView('semanal')}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer ${
        activeView === 'semanal'
          ? 'bg-white text-slate-950 shadow-xs border border-slate-200/60'
          : 'text-slate-600 hover:text-slate-900'
      }`}
    >
      <Columns3 className="w-4 h-4 text-amber-500" />
      <span>Vista Semanal</span>
    </button>
    <button
      type="button"
      onClick={() => setActiveView('mensual')}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer ${
        activeView === 'mensual'
          ? 'bg-white text-slate-950 shadow-xs border border-slate-200/60'
          : 'text-slate-600 hover:text-slate-900'
      }`}
    >
      <Calendar className="w-4 h-4 text-amber-500" />
      <span>Cuadrante Mensual</span>
      {monthStats.total > 0 && (
        <span className="bg-amber-100 text-amber-800 text-[10px] font-black px-1.5 py-0.5 rounded-full ml-1">
          {monthStats.total}
        </span>
      )}
    </button>
  </div>

  <div className="text-xs text-slate-500 font-medium px-2">
    {activeView === 'semanal' ? (
      <span>Mostrando semana del <strong className="text-slate-800">{formatFriendlyDate(currentWeekMonday)}</strong></span>
    ) : (
      <span>Cuadrante de <strong className="text-slate-800">{MESES[monthViewDate.getMonth()]} {monthViewDate.getFullYear()}</strong> categorizado por obras</span>
    )}
  </div>
</div>

{/* VISTA SEMANAL */}
{activeView === 'semanal' && (
<div>
{/* Control Bar & Progress */}
<div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
{/* Selector de Obra y Semana */}
<div className="lg:col-span-8 flex flex-col sm:flex-row gap-4 items-stretch sm:items-center bg-white p-4 rounded-xl border border-slate-200">
{/* Obras Select */}
<div className="flex-1">
<label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1">Filtrar por Obra</label>
<div className="flex gap-2">
<select
value={selectedObraId}
onChange={(e) => setSelectedObraId(e.target.value)}
className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
>
<option value="all">📍 Todas las obras activas</option>
{obras.map(o => (
<option key={o[0]} value={o[0]}>🚧 {o[1]}</option>
))}
</select>
<button
onClick={() => setIsManageObrasModalOpen(true)}
title="Gestionar Obras (Corregir / Añadir)"
className="bg-slate-100 hover:bg-slate-200 text-slate-700 p-2.5 rounded-lg border border-slate-200 hover:cursor-pointer flex items-center justify-center shrink-0"
>
<Edit className="w-4 h-4" />
</button>
<button
onClick={() => {
setSelectedPrintObraId(selectedObraId === 'all' ? (obras[0]?.[0] || 'all') : selectedObraId);
setIsPrintModalOpen(true);
}}
title="Imprimir / Exportar PDF para Encargado"
className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-3 py-2.5 rounded-lg hover:cursor-pointer flex items-center gap-1.5 shrink-0 shadow-xs transition-all"
>
<Printer className="w-4 h-4" />
<span className="text-xs font-bold hidden sm:inline">Exportar PDF</span>
</button>
</div>
</div>
{/* Navegador de Fecha de la Semana */}
<div className="shrink-0 flex flex-col">
<label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1">Semana de Trabajo</label>
<div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg p-1">
<button
type="button"
onClick={() => navigateWeek(-1)}
title="Semana anterior"
className="p-1.5 hover:bg-white rounded-md text-slate-600 hover:cursor-pointer transition-colors"
>
<ChevronLeft className="w-4 h-4" />
</button>
<button
type="button"
onClick={openCalendarModal}
title="Hacer clic para abrir el calendario en grande (cambiar mes o año)"
className="px-3 py-1 text-xs font-semibold text-slate-700 hover:text-amber-800 hover:bg-white rounded-md transition-all flex items-center gap-1.5 min-w-[210px] justify-center cursor-pointer group shadow-2xs hover:shadow-xs"
>
<Calendar className="w-4 h-4 text-amber-500 group-hover:scale-125 transition-transform shrink-0" />
<span className="group-hover:underline decoration-amber-500 underline-offset-2">Al {formatFriendlyDate(currentWeekMonday)}</span>
</button>
<button
type="button"
onClick={() => navigateWeek(1)}
title="Semana siguiente"
className="p-1.5 hover:bg-white rounded-md text-slate-600 hover:cursor-pointer transition-colors"
>
<ChevronRight className="w-4 h-4" />
</button>
<button
type="button"
onClick={goToToday}
title="Ir a la semana actual"
className="text-[10px] bg-slate-200 hover:bg-slate-300 font-bold px-2 py-1 rounded-md text-slate-700 hover:cursor-pointer transition-all ml-1"
>
Hoy
</button>
</div>
</div>
</div>
{/* General Progress Widget */}
<div className="lg:col-span-4 bg-slate-900 border border-slate-800 text-white rounded-xl p-4 flex flex-col justify-between">
<div className="flex justify-between items-center mb-2">
<span className="text-xs font-bold uppercase tracking-wider text-slate-400">Progreso Semanal</span>
<span className="bg-amber-500 text-slate-950 font-extrabold text-xs px-2 py-0.5 rounded-md">
{stats.pct}%
</span>
</div>
<div className="flex items-end justify-between mb-2">
<p className="text-2xl font-bold">{stats.completed} <span className="text-sm font-normal text-slate-400">de {stats.total} tareas completadas</span></p>
</div>
<div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
<div className="bg-amber-500 h-full rounded-full transition-all duration-500" style={{ width: `${stats.pct}%` }}></div>
</div>
</div>
</div>
{/* Columns Weekly Grid layout */}
<div className="grid grid-cols-1 md:grid-cols-2 xl:flex xl:overflow-x-auto xl:gap-5 xl:pb-4">
{DIAS_SEMANA.map((dia) => {
const tasks = tasksByDay[dia] || [];
const isToday = () => {
const daysMap = { 'Domingo':0, 'Lunes': 1, 'Martes': 2, 'Miércoles': 3, 'Jueves': 4, 'Viernes': 5, 'Sábado': 6 };
const dayNum = daysMap[dia];
const currentDay = new Date().getDay();
const isSameWeek = getMonday(new Date()) === currentWeekMonday;
return isSameWeek && currentDay === dayNum;
};
return (
<div
key={dia}
onDragOver={(e) => handleDragOverDay(e, dia)}
onDragLeave={(e) => handleDragLeaveDay(e, dia)}
onDrop={(e) => handleDropOnDay(e, dia)}
className={`flex flex-col rounded-xl border transition-all min-h-[650px] bg-white xl:flex-none xl:w-[300px] 2xl:w-[320px] ${
dragOverDay === dia
? 'border-amber-500 ring-2 ring-amber-300 bg-amber-50/30'
: isToday()
? 'border-amber-400 shadow-md shadow-amber-400/5 ring-1 ring-amber-400 ring-opacity-30'
: 'border-slate-200 shadow-xs'
}`}
>
{/* Day Header */}
<div className={`p-4 rounded-t-xl border-b ${
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
        <div className="flex flex-wrap items-center gap-3">
          {/* Filtrar Obra */}
          <div className="flex-1 sm:flex-initial min-w-[200px]">
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
          </div>

          {/* Filtrar Estado */}
          <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-bold">
            <button
              type="button"
              onClick={() => setMonthlyFilterStatus('all')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                monthlyFilterStatus === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Todas ({monthTasks.length})
            </button>
            <button
              type="button"
              onClick={() => setMonthlyFilterStatus('pending')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                monthlyFilterStatus === 'pending' ? 'bg-white text-amber-700 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Pendientes ({monthStats.pending})
            </button>
            <button
              type="button"
              onClick={() => setMonthlyFilterStatus('completed')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                monthlyFilterStatus === 'completed' ? 'bg-white text-emerald-700 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Completadas ({monthStats.completed})
            </button>
          </div>

          {/* Sub-selector: Matriz vs Calendario */}
          <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setMonthlyQuadrantMode('matriz')}
              title="Ver en formato cuadrante de obras horizontal"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                monthlyQuadrantMode === 'matriz' ? 'bg-amber-500 text-slate-950 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              <span>Matriz por Obras</span>
            </button>
            <button
              type="button"
              onClick={() => setMonthlyQuadrantMode('calendario')}
              title="Ver en formato cuadrícula mensual de calendario"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                monthlyQuadrantMode === 'calendario' ? 'bg-amber-500 text-slate-950 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Cuadrícula Calendario</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tarjeta de Métricas del Mes */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100">
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Actividades</p>
          <p className="text-xl font-black text-slate-900 mt-0.5">{monthStats.total}</p>
        </div>
        <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-100">
          <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">Completadas</p>
          <p className="text-xl font-black text-emerald-700 mt-0.5">{monthStats.completed}</p>
        </div>
        <div className="bg-amber-50/50 p-3 rounded-xl border border-amber-100">
          <p className="text-[11px] font-bold uppercase tracking-wider text-amber-600">Pendientes / Repasos</p>
          <p className="text-xl font-black text-amber-700 mt-0.5">{monthStats.pending}</p>
        </div>
        <div className="bg-slate-900 text-white p-3 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Progreso</p>
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
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 bg-slate-50/60">
          <div>
            <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
              <Table className="w-4 h-4 text-amber-500" />
              Cuadrante Mensual de Actividades por Obra — {MESES[monthViewDate.getMonth()]} {monthViewDate.getFullYear()}
            </h3>
            <p className="text-xs text-slate-500">Desplaza horizontalmente para ver todos los {daysOfMonthList.length} días del mes. Haz clic en una casilla para añadir actividades o en el encabezado para saltar a la semana.</p>
          </div>
          <div className="text-xs text-slate-400 italic">
            💡 Haz clic en el número de cualquier día para abrir su semana en vista semanal
          </div>
        </div>

        {/* Scroll Horizontal del Cuadrante */}
        <div className="overflow-x-auto max-w-full">
          <table className="w-full border-collapse text-left min-w-max">
            <thead>
              <tr className="bg-slate-100 text-slate-700 text-xs border-b border-slate-200">
                {/* Columna Fija de Obra */}
                <th className="sticky left-0 z-20 bg-slate-100 p-3.5 border-r border-slate-200 font-extrabold uppercase tracking-wider min-w-[210px] max-w-[240px] shadow-xs">
                  Obra / Proyecto
                </th>
                {/* Columnas de los Días del Mes */}
                {daysOfMonthList.map((day) => {
                  const isToday = day.dateStr === todayExactDate;
                  return (
                    <th
                      key={day.dateStr}
                      className={`p-2.5 text-center border-r border-slate-200 min-w-[130px] max-w-[170px] transition-colors ${
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
                        <span className={`text-base font-black leading-tight rounded-md px-1.5 py-0.5 mt-0.5 ${
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
                  <td colSpan={daysOfMonthList.length + 1} className="p-8 text-center text-slate-400">
                    No hay obras cargadas en el sistema.
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
                        className="sticky left-0 z-10 bg-white p-3.5 border-r border-slate-200 shadow-xs min-w-[210px] max-w-[240px] align-top"
                        style={{ borderLeft: `6px solid ${obraColor.border}` }}
                      >
                        <div className="font-extrabold text-slate-900 text-sm leading-snug truncate" title={obraNombre}>
                          {obraNombre}
                        </div>
                        <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                          <span>{obraTasksInMonth.length} {obraTasksInMonth.length === 1 ? 'actividad' : 'actividades'}</span>
                          {obraTasksInMonth.length > 0 && (
                            <span className="font-bold text-slate-700">{obraPct}%</span>
                          )}
                        </div>
                        {obraTasksInMonth.length > 0 && (
                          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1.5">
                            <div className="h-full rounded-full transition-all duration-300" style={{ width: `${obraPct}%`, backgroundColor: obraColor.border }} />
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => handleOpenNewTaskForDateAndObra(daysOfMonthList[0]?.dateStr || '', obraId)}
                          className="mt-3 text-[11px] font-bold text-amber-600 hover:text-amber-800 flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" /> Añadir a esta obra
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
                            className={`p-2 border-r border-slate-200 align-top min-w-[130px] max-w-[170px] transition-all relative group/cell ${
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
                                  className={`p-2 rounded-lg border text-left transition-all shadow-2xs group/card relative cursor-grab active:cursor-grabbing select-none ${
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

                                  {/* Botones flotantes para posponer/trasladar y editar */}
                                  <div 
                                    className="absolute bottom-1 right-1 opacity-0 group-hover/card:opacity-100 flex items-center gap-0.5 bg-white/95 rounded shadow-xs p-0.5 transition-opacity"
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

                              {/* Botón añadir en celda vacía o al final */}
                              <button
                                type="button"
                                onClick={() => handleOpenNewTaskForDateAndObra(day.dateStr, obraId)}
                                title={`Programar actividad para el ${day.dayNum} de ${MESES[monthViewDate.getMonth()]}`}
                                className={`w-full py-1 rounded border border-dashed border-slate-200 text-slate-400 hover:border-amber-400 hover:text-amber-600 hover:bg-amber-50/50 flex items-center justify-center gap-1 transition-all cursor-pointer ${
                                  cellTasks.length === 0 ? 'opacity-0 group-hover/cell:opacity-100' : 'opacity-0 group-hover/cell:opacity-100'
                                }`}
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
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 sm:p-6 space-y-4">
        <div className="flex justify-between items-center pb-2 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-amber-500" />
              Vista Calendario — {MESES[monthViewDate.getMonth()]} {monthViewDate.getFullYear()}
            </h3>
            <p className="text-xs text-slate-500">Actividades de cada día agrupadas y categorizadas por obra</p>
          </div>
        </div>

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
    )}
  </div>
)}
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
<label className="block text-xs font-bold text-slate-500 uppercase mb-1">Gremio / Subcontratista</label>
<select
value={manualTask.gremio}
onChange={(e) => setManualTask(prev => ({ ...prev, gremio: e.target.value }))}
className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm"
>
{GREMIOS_PREDEFINIDOS.map(g => <option key={g} value={g}>{g}</option>)}
</select>
</div>
<div>
<label className="block text-xs font-bold text-slate-500 uppercase mb-1">Obra Asignada</label>
<select
value={manualTask.obra_id}
onChange={(e) => setManualTask(prev => ({ ...prev, obra_id: e.target.value }))}
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
<label className="block text-xs font-bold text-slate-500 uppercase mb-1">Gremio / Subcontratista</label>
<select
value={editingTask.gremio}
onChange={(e) => setEditingTask(prev => ({ ...prev, gremio: e.target.value }))}
className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm"
>
{GREMIOS_PREDEFINIDOS.map(g => <option key={g} value={g}>{g}</option>)}
</select>
</div>
<div>
<label className="block text-xs font-bold text-slate-500 uppercase mb-1">Obra Asignada</label>
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

          {/* Motivo de no ejecución */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Motivo concreto de la no ejecución <span className="text-red-500">*</span>
            </label>
            <select
              value={postponeMotivo}
              onChange={(e) => setPostponeMotivo(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
              required
            >
              {MOTIVOS_NO_EJECUCION.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {/* Detalle o causas específicas */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Detalle u observaciones concretas
            </label>
            <textarea
              value={postponeDetalle}
              onChange={(e) => setPostponeDetalle(e.target.value)}
              placeholder="Explica qué ocurrió (ej: El camión de mortero no llegó a tiempo, o la lluvia inundó la zanja...)"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 h-20 resize-none"
            />
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
                      <span className="text-[10px] text-slate-400">
                        {apl.fecha_registro ? new Date(apl.fecha_registro).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>

                    <div className="text-xs space-y-1">
                      <div className="flex items-baseline gap-1 text-slate-700">
                        <span className="font-bold text-slate-500">Fecha no ejecutada:</span>
                        <span className="font-semibold text-rose-700">{apl.dia_anterior} {formatFriendlyDate(apl.fecha_anterior)}</span>
                      </div>
                      <div className="flex items-baseline gap-1 text-slate-700">
                        <span className="font-bold text-slate-500">Motivo:</span>
                        <span className="font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200 inline-block">{apl.motivo}</span>
                      </div>
                      {apl.detalle && (
                        <div className="bg-white/80 p-2 rounded-lg border border-slate-200 text-slate-700 italic text-[11px] leading-relaxed">
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

          <div className="text-slate-600 font-semibold">
            Semana activa: <span className="text-amber-600 font-bold">{formatFriendlyDate(currentWeekMonday)}</span>
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
  const { items: incidentItems, totalTasksInPeriod, completedInPeriod, motivesCount, startDate, endDate, label: periodLabel } = reportData;
  const totalIncidents = incidentItems.length;
  const compliancePct = totalTasksInPeriod > 0
    ? Math.max(0, Math.round(((totalTasksInPeriod - totalIncidents) / Math.max(totalTasksInPeriod, 1)) * 100))
    : 100;

  // Encontrar el motivo predominante
  const topMotiveEntry = Object.entries(motivesCount).sort((a, b) => b[1] - a[1])[0];
  const topMotive = topMotiveEntry ? `${topMotiveEntry[0]} (${topMotiveEntry[1]})` : 'Sin incidencias';

  const reportObraName = reportObraId === 'all'
    ? 'Todas las obras activas'
    : (obras.find(o => o[0] === reportObraId)?.[1] || 'Obra Seleccionada');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4 bg-slate-950/60 backdrop-blur-xs print:bg-white print:p-0 print:absolute print:inset-0 print:z-50 print:block">
      <div className="bg-slate-100 rounded-none md:rounded-2xl shadow-2xl w-full max-w-6xl h-full md:h-[92vh] flex flex-col md:flex-row overflow-hidden print:bg-white print:shadow-none print:h-auto print:max-w-none print:rounded-none">
        
        {/* PANEL LATERAL: CONFIGURACIÓN Y FILTROS DEL INFORME (Oculto al Imprimir) */}
        <div className="w-full md:w-80 bg-white border-b md:border-b-0 md:border-r border-slate-200 p-5 flex flex-col justify-between shrink-0 print:hidden overflow-y-auto">
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <FileSpreadsheet className="w-5 h-5 text-amber-500" />
              <div>
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">Informe de Repasos</h3>
                <p className="text-[11px] text-slate-400">Seguimiento de tareas no ejecutadas</p>
              </div>
            </div>

            {/* Pestañas de tipo de período */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Período del Informe</label>
              <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-xl text-xs font-bold">
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
                <button
                  type="button"
                  onClick={() => setReportPeriodType('personalizado')}
                  className={`py-1.5 rounded-lg transition-all cursor-pointer ${
                    reportPeriodType === 'personalizado' ? 'bg-white text-slate-950 shadow-2xs font-extrabold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  A Medida
                </button>
              </div>
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
                  {GREMIOS_PREDEFINIDOS.map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Mini Resumen de Incidencias */}
            <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3 text-xs space-y-1">
              <div className="flex justify-between text-amber-900 font-bold">
                <span>Tareas no ejecutadas:</span>
                <span className="text-amber-700 font-black">{totalIncidents}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Tareas en período:</span>
                <span className="font-semibold text-slate-800">{totalTasksInPeriod}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Cumplimiento:</span>
                <span className="font-semibold text-emerald-700">{compliancePct}%</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col gap-2">
            <button
              onClick={() => window.print()}
              className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-amber-500/10 transition-all border-none"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir / Guardar PDF</span>
            </button>
            <button
              onClick={() => setIsReportModalOpen(false)}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 rounded-xl text-xs cursor-pointer transition-all border-none"
            >
              Cerrar
            </button>
          </div>
        </div>

        {/* PANEL DERECHO: HOJA FORMAL DIN-A4 PARA VISUALIZAR E IMPRIMIR */}
        <div className="flex-1 bg-slate-200 p-0 md:p-6 overflow-y-auto flex justify-center print:bg-white print:p-0 print:overflow-visible">
          <div className="bg-white w-full md:w-[210mm] min-h-none md:min-h-[297mm] shadow-lg p-6 md:p-12 flex flex-col justify-between print:shadow-none print:p-0 print:w-full print:h-auto print:min-h-0">
            <div>
              {/* Cabecera Corporativa de ENUE */}
              <div className="border-b-4 border-amber-500 pb-4 mb-6 flex justify-between items-end">
                <div>
                  <h2 className="text-xl font-black tracking-wider text-slate-900 m-0">ENUE</h2>
                  <p className="text-[9px] uppercase tracking-widest text-slate-500 font-bold m-0">Proyectos y Construcción S.L.</p>
                </div>
                <div className="text-right">
                  <h1 className="text-sm font-black text-slate-900 uppercase tracking-tight m-0">INFORME DE NO EJECUCIÓN Y REPASOS</h1>
                  <p className="text-[10px] text-amber-700 font-bold m-0">{periodLabel}</p>
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
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Actividades Previstas</p>
                  <p className="text-xl font-black text-slate-900 mt-0.5">{totalTasksInPeriod}</p>
                </div>
                <div className="bg-rose-50/60 p-3 rounded-xl border border-rose-200">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-rose-700">No Ejecutadas / Traslados</p>
                  <p className="text-xl font-black text-rose-800 mt-0.5">{totalIncidents}</p>
                </div>
                <div className="bg-emerald-50/60 p-3 rounded-xl border border-emerald-200">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Cumplimiento Programado</p>
                  <p className="text-xl font-black text-emerald-800 mt-0.5">{compliancePct}%</p>
                </div>
                <div className="bg-amber-50/60 p-3 rounded-xl border border-amber-200">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-amber-800">Causa Principal</p>
                  <p className="text-xs font-black text-amber-950 mt-1 truncate" title={topMotive}>{topMotive}</p>
                </div>
              </div>

              {/* Desglose de Motivos de Incumplimiento */}
              {totalIncidents > 0 && Object.keys(motivesCount).length > 0 && (
                <div className="mb-6 p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5 print:bg-transparent">
                  <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                    Distribución de Causas de No Ejecución
                  </h4>
                  <div className="space-y-1.5">
                    {Object.entries(motivesCount)
                      .sort((a, b) => b[1] - a[1])
                      .map(([motivo, count]) => {
                        const pct = Math.round((count / totalIncidents) * 100);
                        return (
                          <div key={motivo} className="space-y-0.5">
                            <div className="flex justify-between text-xs text-slate-700 font-medium">
                              <span className="truncate pr-2">{motivo}</span>
                              <span className="font-bold shrink-0">{count} {count === 1 ? 'vez' : 'veces'} ({pct}%)</span>
                            </div>
                            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                              <div className="bg-amber-500 h-full rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Listado Detallado de Actividades No Ejecutadas */}
              <div className="space-y-3">
                <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-amber-500" />
                    Detalle de Actividades No Ejecutadas y Traslados ({incidentItems.length})
                  </h3>
                </div>

                {incidentItems.length === 0 ? (
                  <div className="p-8 text-center bg-emerald-50/50 border border-emerald-200 rounded-xl">
                    <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                    <h5 className="font-bold text-emerald-900 text-sm">Sin incidencias en el período</h5>
                    <p className="text-xs text-emerald-700 mt-1">
                      Todas las actividades programadas en este período se ejecutaron en fecha o no registran retrasos.
                    </p>
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-xl overflow-hidden print:border-slate-300">
                    <table className="w-full border-collapse text-left text-xs">
                      <thead>
                        <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 font-bold uppercase text-[10px] tracking-wider print:bg-slate-50">
                          <th className="p-2.5">Obra / Gremio</th>
                          <th className="p-2.5">Actividad Programada</th>
                          <th className="p-2.5">Fecha Prevista</th>
                          <th className="p-2.5">Motivo Concreto & Observaciones</th>
                          <th className="p-2.5">Trasladada a</th>
                          <th className="p-2.5 text-center">Nº Aplazam.</th>
                          <th className="p-2.5 text-center">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 print:divide-slate-200">
                        {incidentItems.map((item, idx) => (
                          <tr key={`${item.taskId}-${idx}`} className="hover:bg-slate-50/50 transition-colors">
                            <td className="p-2.5 align-top">
                              <div className="font-extrabold text-slate-900 leading-tight">{item.obra_nombre}</div>
                              <span className={`inline-block mt-1 text-[8px] font-bold px-1.5 py-0.2 rounded uppercase ${getGremioTagClasses(item.gremio)}`}>
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
                              <div className="font-bold text-slate-900 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-[11px] inline-block">
                                {item.motivo}
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
                )}
              </div>
            </div>

            {/* Zona de Firmas y Validación Formal */}
            <div className="mt-12 pt-6 border-t border-slate-200 grid grid-cols-2 gap-8 text-center print:mt-16 print:border-slate-300">
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
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Jefe de Obra / Supervisión</p>
                <p className="text-xs font-bold text-slate-800 border-t border-solid border-slate-200 pt-1 w-48 mx-auto">Dirección de Obra</p>
              </div>
            </div>

            {/* Pie de Página del Documento */}
            <div className="mt-8 text-center border-t border-slate-100 pt-3 flex justify-between text-[8px] text-slate-400 uppercase tracking-widest font-semibold print:mt-10 print:border-slate-200">
              <span>ENUE PROYECTOS Y CONSTRUCCIÓN S.L.</span>
              <span>INFORME DE NO EJECUCIÓN · {new Date().toLocaleDateString('es-ES')}</span>
              <span>PÁGINA 1 DE 1</span>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
})()}
</div>
);
}

export default App;
