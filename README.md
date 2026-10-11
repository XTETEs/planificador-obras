# Planificador Semanal de Obras (ENUE)

App React de un solo fichero para planificar tareas de obra por semana (L-V), con gremios por color,
arrastrar y soltar, mover/copiar entre semanas, dictado por voz con IA y exportacion a PDF por obra.

## Contenido de este paquete

    README.md
    package.json, vercel.json, .gitignore, .env.example
    db/schema.sql          Esquema (tablas obras y tareas)
    db/seed.sql            Esquema + datos actuales (4 obras, 37 tareas)
    db/obras.json          Datos en JSON
    db/tareas.json         Datos en JSON
    src/aikit-shim.js      Sustituye window.AiKit fuera de AiKit (SQLite en el navegador)
    src/config.js          Configuracion (endpoint de IA, semilla)
    api/dictado.js         Funcion serverless para el dictado con IA (Gemini)
    scripts/build.mjs      Inyecta shim y config en la app y genera dist/

## IMPORTANTE: falta un fichero que debes anadir tu

El codigo de la app (unos 130 KB) no viaja dentro de este zip. Para anadirlo:

1. En AiKit abre la app "Planificador Semanal de Obras Checklist (v27)".
2. Pestana del panel derecho "codigo" -> boton copiar.
3. Pegalo en un fichero llamado app-source.html en la raiz de este proyecto.

## Generar y desplegar

    npm run build        (necesita Node 18+; genera dist/index.html)
    npx serve dist       (prueba local)

En Vercel: importa el repositorio. vercel.json ya indica el comando de build y la carpeta dist.
Anade la variable GEMINI_API_KEY (ver .env.example). Sin ella todo funciona salvo el dictado con IA.

## Limitaciones a tener en cuenta (version tal cual)

- Los datos se guardan en IndexedDB de cada navegador: cada dispositivo tendria su propia copia.
  Es valido para pruebas o uso individual, no para compartir el planning entre varias personas.
- La app carga Tailwind, Babel, React y lucide desde CDN (esm.sh / unpkg / jsdelivr). Funciona, pero
  para produccion seria conviene migrarla a Vite con dependencias instaladas.
- El dictado por voz usa la Web Speech API: funciona bien en Chrome y Edge.

## Para datos compartidos entre usuarios

Sustituye src/aikit-shim.js por un cliente de tu API/base de datos que cumpla este contrato,
sin tocar la app:

    AiKit.db(id)                     -> objeto unico
    db.query(sql, params)            -> Promise<{ columns, rows, rowCount }>   (rows = arrays)
    db.exec(sql, params)             -> Promise<{ changes }>
    db.onPendingChange(fn)           -> devuelve funcion para cancelar; fn(true|false)
    AiKit.createClient().chat.completions.create({ messages })
                                     -> Promise<{ choices: [{ message: { content } }] }>

La app usa SQL sencillo sobre las tablas obras y tareas (SELECT, INSERT OR REPLACE, UPDATE, DELETE).
Si migras a Postgres/Firebase, lo mas limpio es reescribir esas llamadas en una capa de datos.

## Notas del esquema

- ids de texto (por ejemplo t_1786512160713 y o_1786512112062).
- fecha_semana = lunes de la semana (YYYY-MM-DD); dia_semana = Lunes..Viernes.
- completada = 0/1. Al borrar una obra, la app borra antes todas sus tareas.
