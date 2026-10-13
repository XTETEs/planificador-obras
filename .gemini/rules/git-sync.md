---
description: Always synchronize with GitHub automatically after any change
---

# Regla de Sincronización con GitHub

Tras realizar cualquier cambio, modificación de código o completar cualquier tarea solicitada por el usuario:
1. Probar la compilación (`npm run build`).
2. Comprobar el estado de Git (`git status`).
3. Añadir, hacer commit con mensaje descriptivo y hacer push a la rama `main` en GitHub (`git add . && git commit -m "..." && git push origin main`).
4. Asegurar que el árbol de trabajo quede limpio y completamente sincronizado con el repositorio remoto `origin/main`.
