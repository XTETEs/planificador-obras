import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  CheckSquare,
  Square,
  Plus,
  Trash2,
  Calendar,
  Building,
  Mic,
  MicOff,
  PenTool,
  RotateCcw,
  Eraser,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  X,
  Edit2,
  Check,
  Maximize2,
  Tag,
  Share2,
  Sparkles,
  ArrowUpDown
} from 'lucide-react';

const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

// Formateador de fecha amigable (ej: "Hoy, 14:30", "Ayer, 09:15", "18 Oct 2026")
function formatFriendlyDate(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return isoString;

  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  const timeStr = date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

  if (isToday) return `Hoy, ${timeStr}`;
  if (isYesterday) return `Ayer, ${timeStr}`;

  return `${date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}, ${timeStr}`;
}

export function NotasView({
  notas = [],
  obras = [],
  onAddNota,
  onUpdateNota,
  onDeleteNota,
  onConvertToTask,
  currentWeekMonday
}) {
  // Filtros
  const [filterStatus, setFilterStatus] = useState('pendientes'); // 'pendientes' | 'completadas' | 'todas'
  const [filterDateMode, setFilterDateMode] = useState('todos'); // 'todos' | 'hoy' | 'ayer' | 'semana' | 'mes' | 'custom'
  const [filterCustomDate, setFilterCustomDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('desc'); // 'desc' = más recientes primero | 'asc' = más antiguas primero

  // Formulario rápido
  const [newText, setNewText] = useState('');
  const [newPrioridad, setNewPrioridad] = useState('normal'); // 'normal' | 'urgente' | 'repaso'
  const [newObraId, setNewObraId] = useState('');
  const [isDictating, setIsDictating] = useState(false);
  const speechRecognitionRef = useRef(null);
  const inputRef = useRef(null);

  // Modal Canvas de Dibujo / Stylus
  const [isCanvasModalOpen, setIsCanvasModalOpen] = useState(false);
  const canvasRef = useRef(null);
  const [canvasColor, setCanvasColor] = useState('#0f172a');
  const [canvasStrokeWidth, setCanvasStrokeWidth] = useState(3);
  const [canvasTool, setCanvasTool] = useState('pen'); // 'pen' | 'highlighter' | 'eraser'
  const [canvasTitle, setCanvasTitle] = useState('');
  const [canvasHistory, setCanvasHistory] = useState([]);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef({ x: 0, y: 0 });

  // Modal Lightbox para ver dibujo ampliado
  const [lightboxImage, setLightboxImage] = useState(null);

  // Modal "Pasar a Planificador semanal"
  const [taskConvertModal, setTaskConvertModal] = useState(null); // nota object or null
  const [convertObraId, setConvertObraId] = useState('');
  const [convertDia, setConvertDia] = useState('Lunes');
  const [convertGremio, setConvertGremio] = useState('ENUE');

  // Edición rápida inline
  const [editingId, setEditingId] = useState(null);
  const [editingText, setEditingText] = useState('');

  // Inicializar reconocimiento de voz nativo para dictado
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'es-ES';

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setNewText(prev => (prev ? `${prev} ${transcript}` : transcript));
        }
        setIsDictating(false);
      };

      recognition.onerror = () => setIsDictating(false);
      recognition.onend = () => setIsDictating(false);
      speechRecognitionRef.current = recognition;
    }
  }, []);

  const toggleDictation = () => {
    if (!speechRecognitionRef.current) {
      alert('El reconocimiento de voz no está disponible en este navegador.');
      return;
    }
    if (isDictating) {
      speechRecognitionRef.current.stop();
      setIsDictating(false);
    } else {
      try {
        speechRecognitionRef.current.start();
        setIsDictating(true);
      } catch (e) {
        console.warn('Error al iniciar dictado:', e);
      }
    }
  };

  // Manejo de creación rápida
  const handleQuickAdd = (e) => {
    if (e) e.preventDefault();
    const clean = newText.trim();
    if (!clean) {
      inputRef.current?.focus();
      return;
    }

    onAddNota({
      texto: clean,
      completada: 0,
      prioridad: newPrioridad,
      obra_id: newObraId || null,
      tipo: 'texto',
      trazo_data: null
    });

    setNewText('');
    setNewPrioridad('normal');
    setNewObraId('');
  };

  // ==========================================
  // LÓGICA DEL LIENZO DE DIBUJO CON LÁPIZ (STYLUS)
  // ==========================================
  useEffect(() => {
    if (!isCanvasModalOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    // Fondo blanco suave
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, rect.width, rect.height);

    // Dibujar patrón de cuadrícula suave para facilitar notas y croquis de obra
    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 1;
    const gridSize = 24;
    for (let x = gridSize; x < rect.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, rect.height);
      ctx.stroke();
    }
    for (let y = gridSize; y < rect.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(rect.width, y);
      ctx.stroke();
    }

    // Guardar estado inicial en historial
    const initialData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setCanvasHistory([initialData]);
  }, [isCanvasModalOpen]);

  const saveCanvasStep = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setCanvasHistory(prev => [...prev.slice(-15), imgData]);
  };

  const handleCanvasUndo = () => {
    if (canvasHistory.length <= 1) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const newHist = [...canvasHistory];
    newHist.pop(); // Quitar último
    const prevData = newHist[newHist.length - 1];
    ctx.putImageData(prevData, 0, 0);
    setCanvasHistory(newHist);
  };

  const handleCanvasClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, rect.width, rect.height);
    // Rejilla de apoyo
    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 1;
    for (let x = 24; x < rect.width; x += 24) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, rect.height);
      ctx.stroke();
    }
    for (let y = 24; y < rect.height; y += 24) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(rect.width, y);
      ctx.stroke();
    }
    saveCanvasStep();
  };

  const getCanvasCoords = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const handlePointerDown = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
    isDrawingRef.current = true;
    lastPointRef.current = getCanvasCoords(e);
  };

  const handlePointerMove = (e) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const currentPoint = getCanvasCoords(e);

    ctx.save();
    if (canvasTool === 'eraser') {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 24;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    } else if (canvasTool === 'highlighter') {
      ctx.strokeStyle = 'rgba(250, 204, 21, 0.4)';
      ctx.lineWidth = 20;
      ctx.lineCap = 'square';
      ctx.lineJoin = 'round';
    } else {
      ctx.strokeStyle = canvasColor;
      // Ajustar grosor por presión si el lápiz táctil lo soporta
      const pressureFactor = e.pressure && e.pressure > 0 ? (e.pressure * 1.5) : 1;
      ctx.lineWidth = Math.max(1.5, canvasStrokeWidth * pressureFactor);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }

    ctx.beginPath();
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
    // Interpolación suave
    const midX = (lastPointRef.current.x + currentPoint.x) / 2;
    const midY = (lastPointRef.current.y + currentPoint.y) / 2;
    ctx.quadraticCurveTo(lastPointRef.current.x, lastPointRef.current.y, midX, midY);
    ctx.lineTo(currentPoint.x, currentPoint.y);
    ctx.stroke();
    ctx.restore();

    lastPointRef.current = currentPoint;
  };

  const handlePointerUp = (e) => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    const canvas = canvasRef.current;
    if (canvas) {
      try { canvas.releasePointerCapture(e.pointerId); } catch (_) {}
    }
    saveCanvasStep();
  };

  const handleSaveDrawing = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png', 0.85);

    onAddNota({
      texto: canvasTitle.trim() || 'Apunte a mano alzada / Croquis',
      completada: 0,
      prioridad: newPrioridad,
      obra_id: newObraId || null,
      tipo: 'trazo',
      trazo_data: dataUrl
    });

    setIsCanvasModalOpen(false);
    setCanvasTitle('');
  };

  // ==========================================
  // FILTRADO Y CLASIFICACIÓN
  // ==========================================
  const filteredNotas = useMemo(() => {
    return notas.filter(nota => {
      // 1. Filtro por Estado
      const isDone = Boolean(nota.completada);
      if (filterStatus === 'pendientes' && isDone) return false;
      if (filterStatus === 'completadas' && !isDone) return false;

      // 2. Filtro por Fecha de Creación
      if (nota.fecha_creacion) {
        const creationDate = new Date(nota.fecha_creacion);
        const now = new Date();

        if (filterDateMode === 'hoy') {
          if (creationDate.toDateString() !== now.toDateString()) return false;
        } else if (filterDateMode === 'ayer') {
          const yesterday = new Date(now);
          yesterday.setDate(yesterday.getDate() - 1);
          if (creationDate.toDateString() !== yesterday.toDateString()) return false;
        } else if (filterDateMode === 'semana') {
          const startOfWeek = new Date(now);
          const day = startOfWeek.getDay() || 7;
          startOfWeek.setDate(startOfWeek.getDate() - day + 1);
          startOfWeek.setHours(0, 0, 0, 0);
          if (creationDate < startOfWeek) return false;
        } else if (filterDateMode === 'mes') {
          if (creationDate.getMonth() !== now.getMonth() || creationDate.getFullYear() !== now.getFullYear()) {
            return false;
          }
        } else if (filterDateMode === 'custom' && filterCustomDate) {
          const target = new Date(filterCustomDate);
          if (creationDate.toDateString() !== target.toDateString()) return false;
        }
      }

      // 3. Filtro por Búsqueda de Texto
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const obraMatch = obras.find(o => String(o.id) === String(nota.obra_id))?.nombre?.toLowerCase().includes(q);
        const textMatch = (nota.texto || '').toLowerCase().includes(q);
        if (!textMatch && !obraMatch) return false;
      }

      return true;
    }).sort((a, b) => {
      // Orden por fecha y hora de entrada (desc = más recientes primero en primera posición)
      const timeA = new Date(a.fecha_creacion || 0).getTime();
      const timeB = new Date(b.fecha_creacion || 0).getTime();
      return sortOrder === 'desc' ? (timeB - timeA) : (timeA - timeB);
    });
  }, [notas, filterStatus, filterDateMode, filterCustomDate, searchQuery, obras, sortOrder]);

  // Contadores para métricas
  const counts = useMemo(() => {
    let pendientes = 0;
    let completadas = 0;
    let hoy = 0;
    const nowStr = new Date().toDateString();

    notas.forEach(n => {
      if (n.completada) completadas++;
      else pendientes++;

      if (n.fecha_creacion && new Date(n.fecha_creacion).toDateString() === nowStr) {
        hoy++;
      }
    });

    return { pendientes, completadas, total: notas.length, hoy };
  }, [notas]);

  // Confirmar traspaso a Tarea de Obra
  const handleConfirmConvert = () => {
    if (!taskConvertModal || !convertObraId) return;

    onConvertToTask({
      obraId: convertObraId,
      diaSemana: convertDia,
      actividad: taskConvertModal.texto || 'Apunte a mano alzada / Croquis',
      gremio: convertGremio,
      notas: `Creada desde apunte del ${formatFriendlyDate(taskConvertModal.fecha_creacion)}`,
      trazo_data: taskConvertModal.trazo_data || null
    });

    // Marcar la nota original como revisada/tachada
    onUpdateNota(taskConvertModal.id, {
      completada: 1,
      fecha_completada: new Date().toISOString()
    });

    setTaskConvertModal(null);
  };

  // Limpiar / Archivar todas las notas completadas
  const handleClearCompleted = () => {
    const completadas = notas.filter(n => n.completada);
    if (completadas.length === 0) return;

    if (window.confirm(`¿Deseas archivar y eliminar las ${completadas.length} notas revisadas para dejar el bloc limpio?`)) {
      completadas.forEach(n => onDeleteNota(n.id));
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-24 md:pb-12 animate-fade-in">
      {/* CABECERA & MÉTRICAS RÁPIDAS */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center ring-1 ring-amber-500/20">
                <CheckSquare className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Bloc de Notas & Checklist
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 font-medium">
                  Anotaciones rápidas en obra, repasos y recordatorios con lápiz o teclado.
                </p>
              </div>
            </div>
          </div>

          {/* Tarjetas de Métricas */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <div className="bg-amber-50/70 border border-amber-200/60 rounded-2xl p-2.5 sm:px-4 sm:py-2.5 text-center">
              <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block">Pendientes</span>
              <span className="text-lg sm:text-xl font-black text-amber-950">{counts.pendientes}</span>
            </div>
            <div className="bg-emerald-50/70 border border-emerald-200/60 rounded-2xl p-2.5 sm:px-4 sm:py-2.5 text-center">
              <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">Revisadas</span>
              <span className="text-lg sm:text-xl font-black text-emerald-950">{counts.completadas}</span>
            </div>
            <div className="bg-slate-100 border border-slate-200 rounded-2xl p-2.5 sm:px-4 sm:py-2.5 text-center">
              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">Creadas Hoy</span>
              <span className="text-lg sm:text-xl font-black text-slate-900">{counts.hoy}</span>
            </div>
          </div>
        </div>

        {/* BARRA DE ENTRADA RÁPIDA (TECLADO / LÁPIZ TABLET / VOZ) */}
        <form onSubmit={handleQuickAdd} className="mt-5 pt-5 border-t border-slate-100">
          <div className="flex flex-col sm:flex-row items-stretch gap-2.5">
            <div className="relative flex-1">
              <input
                ref={inputRef}
                type="text"
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                placeholder="Escribe un apunte o tarea (puedes escribir directamente con el lápiz táctil)..."
                className="w-full pl-4 pr-12 py-3 bg-slate-50/80 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-2xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all"
              />
              {/* Botón de Dictado por Voz */}
              <button
                type="button"
                onClick={toggleDictation}
                title="Dictar nota por voz"
                className={`absolute right-2.5 top-1/2 -translate-y-1/2 p-2 rounded-xl transition-all cursor-pointer ${
                  isDictating
                    ? 'bg-rose-500 text-white animate-pulse shadow-md shadow-rose-500/30'
                    : 'text-slate-400 hover:text-amber-600 hover:bg-slate-100'
                }`}
              >
                {isDictating ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
            </div>

            {/* Selector de Obra Asociada (Opcional) */}
            <select
              value={newObraId}
              onChange={(e) => setNewObraId(e.target.value)}
              className="px-3 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500/30 cursor-pointer min-w-[140px]"
            >
              <option value="">General (Sin obra)</option>
              {obras.map(o => (
                <option key={o.id} value={o.id}>{o.nombre}</option>
              ))}
            </select>

            {/* Selector de Prioridad */}
            <select
              value={newPrioridad}
              onChange={(e) => setNewPrioridad(e.target.value)}
              className="px-3 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500/30 cursor-pointer"
            >
              <option value="normal">Normal</option>
              <option value="urgente">🔴 Urgente</option>
              <option value="repaso">⚠️ Repaso</option>
            </select>

            {/* Botón Abrir Dibujo con Lápiz */}
            <button
              type="button"
              onClick={() => setIsCanvasModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-2xl text-xs font-bold transition-all cursor-pointer shrink-0"
              title="Abrir lienzo de croquis o firma a mano alzada con lápiz táctil"
            >
              <PenTool className="w-4 h-4 text-amber-600" />
              <span className="hidden sm:inline">Croquis / Lápiz</span>
            </button>

            {/* Botón Añadir (Siempre accesible y activo) */}
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-1.5 px-5 py-3 bg-slate-900 hover:bg-slate-800 text-amber-400 font-extrabold rounded-2xl text-xs transition-all shadow-md hover:shadow-lg active:scale-95 cursor-pointer shrink-0"
              title="Añadir nota al bloc"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Añadir</span>
            </button>
          </div>
        </form>
      </div>

      {/* BARRA DE FILTROS & BÚSQUEDA */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white p-3 sm:p-4 rounded-3xl border border-slate-200/80 shadow-xs">
        {/* Pestañas de Estado */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200/60 overflow-x-auto">
          <button
            type="button"
            onClick={() => setFilterStatus('pendientes')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
              filterStatus === 'pendientes'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Pendientes ({counts.pendientes})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('completadas')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
              filterStatus === 'completadas'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Revisadas ({counts.completadas})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('todas')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
              filterStatus === 'todas'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Todas ({counts.total})
          </button>
        </div>

        {/* Filtro de Fechas */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-1.5 text-xs text-slate-500 font-bold mr-1">
            <Calendar className="w-3.5 h-3.5 text-amber-500" />
            <span>Fecha creación:</span>
          </div>

          <div className="flex items-center gap-1 overflow-x-auto pb-1 lg:pb-0">
            {[
              { id: 'todos', label: 'Todas' },
              { id: 'hoy', label: 'Hoy' },
              { id: 'ayer', label: 'Ayer' },
              { id: 'semana', label: 'Esta semana' },
              { id: 'mes', label: 'Este mes' }
            ].map(f => (
              <button
                key={f.id}
                type="button"
                onClick={() => { setFilterDateMode(f.id); setFilterCustomDate(''); }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer shrink-0 ${
                  filterDateMode === f.id
                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}

            {/* Selector de fecha personalizada */}
            <input
              type="date"
              value={filterCustomDate}
              onChange={(e) => {
                setFilterCustomDate(e.target.value);
                setFilterDateMode(e.target.value ? 'custom' : 'todos');
              }}
              title="Filtrar por día exacto"
              className="px-2 py-0.5 text-[11px] font-bold bg-slate-50 border border-slate-200 rounded-lg text-slate-700 cursor-pointer focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
        </div>

        {/* Ordenación, Buscador & Acción de Limpiar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Botón de Ordenación por Fecha/Hora de Entrada */}
          <button
            type="button"
            onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0"
            title="Cambiar ordenación por fecha y hora de entrada"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-amber-600" />
            <span>{sortOrder === 'desc' ? 'Más recientes arriba ↓' : 'Más antiguas arriba ↑'}</span>
          </button>

          <div className="relative flex-1 sm:w-44">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar apunte..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium"
            />
          </div>

          {counts.completadas > 0 && (
            <button
              type="button"
              onClick={handleClearCompleted}
              title="Archivar notas revisadas para despejar la lista"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Limpiar revisadas</span>
            </button>
          )}
        </div>
      </div>

      {/* LISTADO CONTINUO DE NOTAS (LISTADO SIN FIN) */}
      {filteredNotas.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center shadow-xs">
          <div className="w-16 h-16 rounded-3xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4 border border-amber-200">
            <CheckSquare className="w-8 h-8 opacity-80" />
          </div>
          <h3 className="text-base font-bold text-slate-800 mb-1">
            {searchQuery || filterDateMode !== 'todos' || filterStatus !== 'pendientes'
              ? 'No hay notas con los filtros actuales'
              : 'El bloc de notas está vacío'}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchQuery || filterDateMode !== 'todos'
              ? 'Prueba a cambiar la fecha o borrar la búsqueda para ver más apuntes.'
              : 'Escribe un apunte arriba o pulsa en "Croquis / Lápiz" para anotar con el lápiz táctil.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs divide-y divide-slate-100 overflow-hidden">
          {filteredNotas.map(nota => {
            const isCompleted = Boolean(nota.completada);
            const isEditing = editingId === nota.id;
            const obraAsignada = obras.find(o => String(o.id) === String(nota.obra_id));

            return (
              <div
                key={nota.id}
                className={`group relative p-3.5 sm:px-5 sm:py-4 transition-all duration-150 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isCompleted
                    ? 'bg-slate-50/60 hover:bg-slate-50 opacity-70'
                    : 'hover:bg-amber-50/20 bg-white'
                }`}
              >
                {/* Lado izquierdo: Checkbox + Miniatura (si hay) + Texto y Metadata */}
                <div className="flex items-start sm:items-center gap-3.5 flex-1 min-w-0">
                  {/* Botón Checkbox táctil */}
                  <button
                    type="button"
                    onClick={() => onUpdateNota(nota.id, {
                      completada: isCompleted ? 0 : 1,
                      fecha_completada: isCompleted ? null : new Date().toISOString()
                    })}
                    className="cursor-pointer shrink-0 pt-0.5 sm:pt-0"
                    title={isCompleted ? 'Desmarcar' : 'Marcar como revisado'}
                  >
                    <div
                      className={`w-6 h-6 rounded-xl border flex items-center justify-center transition-all ${
                        isCompleted
                          ? 'bg-emerald-500 border-emerald-500 text-white shadow-xs'
                          : 'border-slate-300 bg-white hover:border-amber-500 hover:bg-amber-50'
                      }`}
                    >
                      {isCompleted && <Check className="w-4 h-4 stroke-[3]" />}
                    </div>
                  </button>

                  {/* Si contiene dibujo/croquis manuscrito con lápiz, miniatura compacta */}
                  {nota.tipo === 'trazo' && nota.trazo_data && (
                    <div
                      onClick={() => setLightboxImage(nota.trazo_data)}
                      className="w-16 h-12 shrink-0 bg-slate-50 rounded-xl border border-slate-200 overflow-hidden cursor-zoom-in group/thumb relative shadow-2xs"
                      title="Toca para ampliar apunte manuscrito"
                    >
                      <img
                        src={nota.trazo_data}
                        alt="Croquis"
                        className="w-full h-full object-contain"
                      />
                      <div className="absolute inset-0 bg-slate-900/10 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center transition-opacity">
                        <Maximize2 className="w-3.5 h-3.5 text-slate-700" />
                      </div>
                    </div>
                  )}

                  {/* Contenido principal del apunte */}
                  <div className="flex-1 min-w-0">
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          className="flex-1 px-3 py-1.5 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500 font-medium"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => {
                            onUpdateNota(nota.id, { texto: editingText.trim() });
                            setEditingId(null);
                          }}
                          className="px-3 py-1.5 bg-slate-900 text-amber-400 font-bold text-xs rounded-xl cursor-pointer shrink-0"
                        >
                          Guardar
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="px-2 py-1.5 text-xs text-slate-500 hover:text-slate-800 font-bold cursor-pointer shrink-0"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
                        <p
                          onClick={() => {
                            if (nota.tipo !== 'trazo') {
                              setEditingId(nota.id);
                              setEditingText(nota.texto || '');
                            }
                          }}
                          className={`text-xs sm:text-sm font-semibold leading-snug break-words transition-all cursor-pointer ${
                            isCompleted
                              ? 'line-through text-slate-400'
                              : 'text-slate-800 hover:text-slate-950'
                          }`}
                        >
                          {nota.texto || (nota.tipo === 'trazo' ? 'Apunte manuscrito con lápiz' : '(Sin texto)')}
                        </p>

                        {/* Badges en la misma línea */}
                        <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                          {nota.prioridad === 'urgente' && (
                            <span className="px-2 py-0.5 rounded-md text-[9px] font-black bg-rose-100 text-rose-800 border border-rose-200">
                              Urgente
                            </span>
                          )}
                          {nota.prioridad === 'repaso' && (
                            <span className="px-2 py-0.5 rounded-md text-[9px] font-black bg-amber-100 text-amber-900 border border-amber-200">
                              Repaso
                            </span>
                          )}
                          {obraAsignada && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold bg-slate-100 text-slate-700 border border-slate-200 max-w-[150px] truncate">
                              <Building className="w-2.5 h-2.5 text-amber-600 shrink-0" />
                              <span className="truncate">{obraAsignada.nombre}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Fecha y hora de entrada */}
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium mt-1">
                      <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>{formatFriendlyDate(nota.fecha_creacion)}</span>
                      {isCompleted && nota.fecha_completada && (
                        <span className="text-emerald-600 font-semibold ml-1">
                          • Revisado el {formatFriendlyDate(nota.fecha_completada)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Lado derecho: Acciones de fila */}
                <div className="flex items-center justify-end gap-1.5 shrink-0 sm:self-center border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
                  {!isCompleted && (
                    <button
                      type="button"
                      onClick={() => {
                        setTaskConvertModal(nota);
                        setConvertObraId(nota.obra_id || (obras[0] ? obras[0].id : ''));
                        setConvertDia('Lunes');
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold transition-all cursor-pointer"
                      title="Pasar a la planificación semanal de la obra"
                    >
                      <ArrowRight className="w-3.5 h-3.5 text-amber-600" />
                      <span>Pasar a Obra</span>
                    </button>
                  )}

                  {nota.tipo !== 'trazo' && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(nota.id);
                        setEditingText(nota.texto || '');
                      }}
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                      title="Editar texto"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('¿Eliminar esta anotación?')) {
                        onDeleteNota(nota.id);
                      }
                    }}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    title="Eliminar del bloc"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL LIENZO DE DIBUJO / STYLUS (PENCIL CANVAS) */}
      {/* ======================================================== */}
      {isCanvasModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
          <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-scale-in">
            {/* Cabecera del modal */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                  <PenTool className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Lienzo Manuscrito con Lápiz</h3>
                  <p className="text-[10px] text-slate-500 font-medium">
                    Dibuja croquis, escribe anotaciones o haz esquemas con el stylus de tu tablet.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCanvasModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-800 rounded-xl cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Barra de Herramientas de Dibujo */}
            <div className="p-3 bg-white border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                {/* Herramienta Bolígrafo */}
                <button
                  type="button"
                  onClick={() => setCanvasTool('pen')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    canvasTool === 'pen'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Bolígrafo
                </button>
                {/* Herramienta Subrayador */}
                <button
                  type="button"
                  onClick={() => setCanvasTool('highlighter')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    canvasTool === 'highlighter'
                      ? 'bg-amber-400 text-amber-950'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Marcador
                </button>
                {/* Herramienta Borrador */}
                <button
                  type="button"
                  onClick={() => setCanvasTool('eraser')}
                  className={`p-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    canvasTool === 'eraser'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                  title="Goma de borrar"
                >
                  <Eraser className="w-4 h-4" />
                </button>
              </div>

              {/* Colores si estamos con bolígrafo */}
              {canvasTool === 'pen' && (
                <div className="flex items-center gap-1.5 border-l border-slate-200 pl-2">
                  {[
                    { color: '#0f172a', label: 'Negro' },
                    { color: '#2563eb', label: 'Azul' },
                    { color: '#dc2626', label: 'Rojo' },
                    { color: '#16a34a', label: 'Verde' }
                  ].map(c => (
                    <button
                      key={c.color}
                      type="button"
                      onClick={() => setCanvasColor(c.color)}
                      style={{ backgroundColor: c.color }}
                      className={`w-5 h-5 rounded-full cursor-pointer transition-transform ${
                        canvasColor === c.color ? 'ring-2 ring-offset-2 ring-slate-900 scale-110' : 'opacity-80 hover:opacity-100'
                      }`}
                      title={c.label}
                    />
                  ))}
                </div>
              )}

              {/* Acciones Deshacer y Limpiar */}
              <div className="flex items-center gap-1.5 border-l border-slate-200 pl-2">
                <button
                  type="button"
                  onClick={handleCanvasUndo}
                  disabled={canvasHistory.length <= 1}
                  className="p-1.5 rounded-xl text-slate-600 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                  title="Deshacer trazo"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleCanvasClear}
                  className="px-2.5 py-1 text-xs text-rose-600 font-bold hover:bg-rose-50 rounded-xl cursor-pointer"
                  title="Borrar todo el lienzo"
                >
                  Limpiar
                </button>
              </div>
            </div>

            {/* Lienzo Interactivo HTML5 con PointerEvents */}
            <div className="relative flex-1 bg-slate-100 p-2 sm:p-4 overflow-hidden flex items-center justify-center">
              <canvas
                ref={canvasRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                style={{ touchAction: 'none' }}
                className="w-full h-80 sm:h-96 bg-white rounded-2xl shadow-inner border border-slate-200 cursor-crosshair"
              />
            </div>

            {/* Título opcional y Guardar */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <input
                type="text"
                value={canvasTitle}
                onChange={(e) => setCanvasTitle(e.target.value)}
                placeholder="Título del croquis o apunte (opcional)..."
                className="w-full sm:w-72 px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-1 focus:ring-amber-500"
              />

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setIsCanvasModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveDrawing}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold rounded-xl text-xs transition-all shadow-sm cursor-pointer"
                >
                  Guardar Apunte
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL "PASAR A PLANIFICADOR SEMANAL" */}
      {/* ======================================================== */}
      {taskConvertModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200 shadow-2xl p-6 animate-scale-in">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                  <ArrowRight className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Pasar al Planificador Semanal</h3>
                  <p className="text-xs text-slate-500">Convierte esta nota en una tarea programada</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTaskConvertModal(null)}
                className="text-slate-400 hover:text-slate-800 p-1 rounded-xl cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/60 mb-4">
              <p className="text-xs font-semibold text-slate-800 line-clamp-3">
                "{taskConvertModal.texto}"
              </p>
              {taskConvertModal.trazo_data && (
                <div className="mt-2.5 rounded-xl overflow-hidden border border-slate-200 bg-white p-1">
                  <img
                    src={taskConvertModal.trazo_data}
                    alt="Vista previa croquis"
                    className="w-full h-28 object-contain"
                  />
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md mt-1 inline-block">
                    ✓ Croquis incluido para la obra
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Obra de destino:</label>
                <select
                  value={convertObraId}
                  onChange={(e) => setConvertObraId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  {obras.map(o => (
                    <option key={o.id} value={o.id}>{o.nombre}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Día de la semana:</label>
                <select
                  value={convertDia}
                  onChange={(e) => setConvertDia(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  {DIAS_SEMANA.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Gremio / Subcontratista:</label>
                <input
                  type="text"
                  value={convertGremio}
                  onChange={(e) => setConvertGremio(e.target.value)}
                  placeholder="ENUE, Albañilería, Pintura..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setTaskConvertModal(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmConvert}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold rounded-xl text-xs transition-all shadow-sm cursor-pointer"
              >
                Confirmar y Planificar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL LIGHTBOX CROQUIS AMPLIADO */}
      {/* ======================================================== */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setLightboxImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] bg-white rounded-3xl p-3 shadow-2xl overflow-hidden animate-scale-in">
            <button
              type="button"
              onClick={() => setLightboxImage(null)}
              className="absolute top-4 right-4 p-2 bg-slate-900/60 hover:bg-slate-900 text-white rounded-full transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={lightboxImage}
              alt="Croquis a tamaño completo"
              className="max-w-full max-h-[82vh] object-contain rounded-2xl mx-auto"
            />
          </div>
        </div>
      )}
    </div>
  );
}
