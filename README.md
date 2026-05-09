# Buscador de Duplicados (Electron + React)

Escáner de duplicados de alto rendimiento para Windows. Libera espacio en disco detectando archivos idénticos mediante comparación de hash MD5 en paralelo. Rápido, seguro y con interfaz moderna.

<img width="989" height="781" alt="image" src="https://github.com/user-attachments/assets/cb230a1d-8724-4673-a238-3f4b6d660799" />



## Características

- **Escaneo de Alto Rendimiento**: Utiliza **Worker Threads** para calcular hashes MD5 en paralelo, aprovechando todos los núcleos de tu CPU sin congelar la interfaz.
- **Modo Recursivo Opcional**: Elige si quieres escanear subcarpetas o solo la carpeta seleccionada.
- **Interfaz Moderna**: UI limpia y oscura (Dark Mode) diseñada con Tailwind CSS y Framer Motion.
- **Seguridad**:
    - Agrupación por tamaño primero, luego por hash para máxima precisión.
    - Previsualización de archivos antes de borrar.
    - Selección inteligente ("Seleccionar todos menos uno").

## Tecnologías

- **Frontend**: React 19, TypeScript, Tailwind CSS, Framer Motion, Lucide Icons.
- **Backend (Electron)**: Electron 40, Node.js `fs` (`promises`), `worker_threads`, `crypto`.
- **Tooling**: Vite, ESLint.

## Instalación y Uso

1.  **Instalar dependencias**:
    ```bash
    npm install
    ```

2.  **Desarrollo (Hot Reload)**:
    Ejecuta tanto la ventana de React como el proceso de Electron en paralelo:
    ```bash
    npm run dev:electron
    ```

3.  **Construir para Producción**:
    Genera los archivos estáticos y prepara la app:
    ```bash
    npm run build
    ```

## Estructura del Proyecto

- **`electron/`**: Código del proceso principal (`main.js`, `preload.js`) y lógica de escaneo (`scanner.js`, `hashWorker.js`).
- **`src/`**: Código de la interfaz de usuario (React).
    - **`components/`**: Componentes reutilizables (`ScanProgress`, `DuplicateGroup`).
    - **`types.ts`**: Definiciones de tipos TypeScript compartidos.

## Optimización

El escáner implementa una estrategia de dos fases para la velocidad:
1.  **Agrupación rápida**: Lista archivos y los agrupa por tamaño exacto.
2.  **Verificación paralela**: Los grupos sospechosos (mismo tamaño) se envían a un pool de *Workers* que calculan el hash MD5 en paralelo.

## 📝 Licencia

MIT
