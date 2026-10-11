CREATE TABLE IF NOT EXISTS obras (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  activo INTEGER DEFAULT 1
);
CREATE TABLE IF NOT EXISTS tareas (
  id TEXT PRIMARY KEY,
  obra_id TEXT,
  fecha_semana TEXT,
  dia_semana TEXT,
  actividad TEXT,
  gremio TEXT,
  completada INTEGER DEFAULT 0,
  notas TEXT,
  fecha_creado TEXT
);
CREATE INDEX IF NOT EXISTS idx_tareas_obra ON tareas(obra_id);
CREATE INDEX IF NOT EXISTS idx_tareas_semana ON tareas(fecha_semana);
