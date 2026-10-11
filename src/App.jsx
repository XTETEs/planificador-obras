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
GripVertical
} from 'lucide-react';
import { migrateLocalDataToFirestore } from './services/db.js';
// EMBEDDED DATABASES ID
const DB_ID = '6a548f958d05750f33c2b531';
const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
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
const date = new Date(d);
const day = date.getDay();
const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
const monday = new Date(date.setDate(diff));
return monday.toISOString().split('T')[0];
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
function App() {
const [db] = useState(() => AiKit.db(DB_ID, { live: true }));
// State
const [obras, setObras] = useState([]);
const [tareas, setTareas] = useState([]);
const [todasLasTareas, setTodasLasTareas] = useState([]);
const [selectedObraId, setSelectedObraId] = useState('all');
const [currentWeekMonday, setCurrentWeekMonday] = useState(() => getMonday(new Date()));
// UI Helpers
const [error, setError] = useState(null);
const [successMessage, setSuccessMessage] = useState(null);
const [syncing, setSyncing] = useState(false);
const [isDictatingModalOpen, setIsDictatingModalOpen] = useState(false);
const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
const [isNewObraModalOpen, setIsNewObraModalOpen] = useState(false);
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
const [openTaskMenuId, setOpenTaskMenuId] = useState(null);
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
const current = new Date(currentWeekMonday);
current.setDate(current.getDate() + weeksToShift * 7);
setCurrentWeekMonday(getMonday(current));
};
// Set to current week
const goToToday = () => {
setCurrentWeekMonday(getMonday(new Date()));
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
try {
await db.exec(
`INSERT OR REPLACE INTO tareas
(id, obra_id, fecha_semana, dia_semana, actividad, gremio, completada, notas, fecha_creado)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
[
taskId,
manualTask.obra_id,
currentWeekMonday,
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
fecha_semana: currentWeekMonday,
dia_semana: manualTask.dia_semana,
actividad: manualTask.actividad.trim(),
gremio: manualTask.gremio,
completada: false,
notas: manualTask.notas.trim(),
obra_nombre: matchedObra ? matchedObra[1] : 'Obra Desconocida'
};
setTareas(prev => [...prev, newLocalTask]);
setManualTask(prev => ({
...prev,
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
await db.exec(
'UPDATE tareas SET obra_id = ?, dia_semana = ?, actividad = ?, gremio = ?, notas = ? WHERE id = ?',
[
editingTask.obra_id,
editingTask.dia_semana,
editingTask.actividad.trim(),
editingTask.gremio,
(editingTask.notas || '').trim(),
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
notas: (editingTask.notas || '').trim(),
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
// HTML5 drag-and-drop entre días
const handleDragStart = (e, task) => {
e.stopPropagation();
try {
e.dataTransfer.setData('text/plain', String(task.id));
e.dataTransfer.effectAllowed = 'move';
} catch (err) {
console.warn('No se pudo establecer el dato de arrastre', err);
}
setDraggedTask(task);
};
const handleDragOverDay = (e, day) => {
e.preventDefault();
setDragOverDay(day);
};
const handleDragLeaveDay = (e, day) => {
if (!e.currentTarget.contains(e.relatedTarget)) {
setDragOverDay(null);
}
};
const handleDropOnDay = async (e, targetDay) => {
e.preventDefault();
e.stopPropagation();
const draggedTaskId = draggedTask?.id || e.dataTransfer.getData('text/plain');
const sourceTask = draggedTask || tareas.find(task => String(task.id) === String(draggedTaskId));
setDragOverDay(null);
if (!sourceTask) {
setDraggedTask(null);
return;
}
if (sourceTask.dia_semana === targetDay && sourceTask.fecha_semana === currentWeekMonday) {
setDraggedTask(null);
return;
}
try {
await db.exec('UPDATE tareas SET fecha_semana = ?, dia_semana = ? WHERE id = ?', [currentWeekMonday, targetDay, sourceTask.id]);
const updatedTask = { ...sourceTask, fecha_semana: currentWeekMonday, dia_semana: targetDay };
setTareas(prev => prev.map(task => task.id === sourceTask.id ? updatedTask : task));
setTodasLasTareas(prev => prev.map(task => task.id === sourceTask.id ? updatedTask : task));
setDraggedTask(null);
setError(null);
setSuccessMessage('Actividad movida correctamente.');
} catch (err) {
setDraggedTask(null);
setError('Error al mover actividad: ' + err.message);
loadData();
}
};
// Toggle task completion
const handleToggleComplete = async (task) => {
const newStatus = task.completada ? 0 : 1;
try {
// Update state optimistically
setTareas(prev => prev.map(t => t.id === task.id ? { ...t, completada: !task.completada } : t));
await db.exec('UPDATE tareas SET completada = ? WHERE id = ?', [String(newStatus), task.id]);
} catch (err) {
setError('Error al actualizar tarea: ' + err.message);
// Rollback
setTareas(prev => prev.map(t => t.id === task.id ? { ...t, completada: task.completada } : t));
}
};
// Delete task
const handleDeleteTask = async (taskId) => {
if (!confirm('¿Estás seguro de que quieres eliminar esta actividad?')) return;
try {
setTareas(prev => prev.filter(t => t.id !== taskId));
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
onClick={() => navigateWeek(-1)}
className="p-1.5 hover:bg-white rounded-md text-slate-600 hover:cursor-pointer"
>
<ChevronLeft className="w-4 h-4" />
</button>
<span className="px-3 py-1 text-xs font-semibold text-slate-700 select-none flex items-center gap-1.5 min-w-[210px] justify-center">
<Calendar className="w-3.5 h-3.5 text-amber-500" />
Al {formatFriendlyDate(currentWeekMonday)}
</span>
<button
onClick={() => navigateWeek(1)}
className="p-1.5 hover:bg-white rounded-md text-slate-600 hover:cursor-pointer"
>
<ChevronRight className="w-4 h-4" />
</button>
<button
onClick={goToToday}
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
tasks.map((task) => (
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
<div className="task-menu absolute right-0 top-11 w-36 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
<button type="button" onClick={() => { setEditingTask({ ...task }); setOpenTaskMenuId(null); }} className="w-full inline-flex items-center gap-2 rounded-lg bg-slate-100 hover:bg-amber-50 hover:text-amber-700 px-2.5 py-2 text-[11px] font-bold text-slate-600 hover:cursor-pointer"><Edit className="w-3.5 h-3.5" />Editar</button>
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
</div>
{task.notas && <p className="text-xs italic text-slate-400 break-words whitespace-normal whitespace-pre-wrap leading-relaxed border-t border-slate-100 pt-2">💡 {task.notas}</p>}
</div>
</div>
))
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
</div>
);
}

export default App;
