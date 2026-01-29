# DIM360 - Sistema de Inspecciones de Habilitaciones

<p align="center">
  <img src="public/img/logo-dim360.png" alt="DIM360 Logo" width="300">
</p>

Sistema completo de inspecciones de habilitaciones comerciales para la **Dirección de Ingresos Municipales (DIM)** de la **Municipalidad de San Miguel de Tucumán**. Permite gestionar todo el ciclo de vida de una inspección: importación masiva desde CSV, asignación a inspectores, ejecución en campo con captura de evidencia georeferenciada (foto, GPS, detalle), generación de constancia oficial con QR de verificación.

---

## Arquitectura

El sistema se compone de tres módulos independientes que se comunican vía REST API:

```
┌─────────────────────┐     ┌──────────────────┐     ┌─────────────────────┐
│   Panel Admin       │     │   Backend API    │     │   App Móvil         │
│   (admin.html)      │────▶│   (server.js)    │◀────│   (App.snack.jsx)   │
│   Gestión completa  │     │   Express+SQLite │     │   React Native      │
└─────────────────────┘     └──────┬───────────┘     └─────────────────────┘
                                   │
                            ┌──────▼───────────┐
                            │  /verificar/:tok │
                            │  Constancia      │
                            │  pública + QR    │
                            └──────────────────┘
                                   │
                            ┌──────▼───────────┐
                            │  /api/resultados │
                            │  Integración     │
                            │  DIM360 externo  │
                            └──────────────────┘
```

| Componente | Tecnología | Archivo principal |
|---|---|---|
| Backend / API REST | Node.js + Express + SQLite | `server.js` |
| Panel de Administración | HTML5 + CSS3 + JS vanilla | `public/admin.html` |
| App Móvil | React Native (Expo Snack SDK 54) | `App.snack.jsx` |
| Base de Datos | SQLite (archivo `data/dim.db`) | Auto-generada |

---

## Funcionalidades

### Panel de Administración (`/admin.html`)

- **Dashboard** con estadísticas en tiempo real (total, pendientes, completadas, inspectores activos)
- **Importación masiva** desde archivos CSV con campos de habilitaciones
- **Asignación** de inspecciones a inspectores por zona o selección individual
- **Desasignación** individual, múltiple o total por inspector
- **Recorridos**: seguimiento del progreso de cada inspector con detalle de inspecciones asignadas
- **Gestión de usuarios**: alta, edición y baja de inspectores con zona asignada
- **Edición de registros**: corrección de datos importados
- **Listado de inspecciones** con filtros por estado, zona y búsqueda por texto
- **Paginación** en todas las tablas

### App Móvil (React Native / Expo)

- **Autenticación** con JWT
- **Listado** de inspecciones asignadas con filtros (pendientes/completadas)
- **Captura de inspección**:
  - Foto del establecimiento (cámara o galería)
  - Geolocalización automática (GPS)
  - Detalle/observaciones del inspector
  - Firma ológrafa digital
- **Confirmación** con token único y código QR de verificación

### API REST para Integración

El sistema expone un endpoint para integración con el sistema DIM360 externo:

```
GET /api/resultados
```

Devuelve las inspecciones completadas con todos los datos de captura.

---

## Formato del CSV de Importación

```csv
numero_habilitacion,nombre_comercio,titular,cuit,direccion,rubro,tipo_habilitacion,zona
12345,COMERCIO ABC,JUAN PEREZ,20-12345678-9,AV SARMIENTO 123,ALIMENTOS,COMERCIO,CENTRO
```

### Campos:

| Campo | Descripción | Obligatorio |
|-------|-------------|-------------|
| numero_habilitacion | Número de habilitación municipal | No |
| nombre_comercio | Nombre del establecimiento | Sí |
| titular | Nombre del titular | No |
| cuit | CUIT del titular | No |
| direccion | Dirección completa | Sí |
| rubro | Rubro comercial | No |
| tipo_habilitacion | Tipo de habilitación | No |
| zona | Zona de la ciudad | No |

---

## Instalación

### Requisitos

- Node.js 18+ (recomendado: 20 LTS)
- npm o yarn

### Pasos

```bash
# Clonar el repositorio
git clone <repo-url>
cd DIM-HabilitacionesInspectores

# Instalar dependencias
npm install

# Iniciar el servidor
node server.js
```

El servidor iniciará en `http://localhost:4000`

### Acceso

- **Panel Admin**: http://localhost:4000/admin.html
- **Usuario por defecto**: `admin@dim.gob.ar` / `admin123`

---

## Estructura del Proyecto

```
DIM-HabilitacionesInspectores/
├── server.js              # Backend principal
├── App.snack.jsx          # App móvil React Native
├── public/
│   ├── admin.html         # Panel de administración
│   └── img/
│       └── logo-dim360.png # Logo del sistema
├── data/
│   ├── dim.db            # Base de datos SQLite
│   └── captures/         # Fotos y firmas capturadas
├── uploads/              # Archivos CSV temporales
├── package.json
└── README.md
```

---

## API Endpoints

### Autenticación

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/auth/login` | Autenticación con JWT |

### Inspecciones

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/inspections` | Listar inspecciones |
| GET | `/api/inspections/:id` | Obtener inspección por ID |
| POST | `/api/inspections` | Crear inspección manual |
| PUT | `/api/inspections/:id` | Editar inspección |
| DELETE | `/api/inspections/:id` | Eliminar inspección |
| GET | `/api/inspections/stats` | Estadísticas |
| GET | `/api/inspections/zones` | Zonas disponibles |
| POST | `/api/inspections/:id/capture` | Guardar captura de inspección |

### Inspectores

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/inspectors` | Listar inspectores |
| POST | `/api/inspectors` | Crear inspector |
| PUT | `/api/inspectors/:id` | Editar inspector |
| DELETE | `/api/inspectors/:id` | Eliminar inspector |

### Asignación

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/assign` | Asignar inspecciones |
| POST | `/api/unassign` | Desasignar inspecciones |
| GET | `/api/recorridos` | Resumen por inspector |
| GET | `/api/recorridos/:id` | Detalle de recorrido |

### Importación

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/import/csv` | Importar CSV de habilitaciones |
| GET | `/api/import/batches` | Historial de importaciones |

### Integración Externa

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/resultados` | Resultados para DIM360 externo |

### Verificación Pública

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/verificar/:token` | Página de verificación (sin auth) |

---

## Paleta de Colores

El sistema utiliza la paleta oficial de la Municipalidad de San Miguel de Tucumán:

| Uso | Color |
|-----|-------|
| Primario | `#0066ff` |
| Primario oscuro | `#0052cc` |
| Primario claro | `#3385ff` |
| Fondo claro | `#e6f0ff` |
| Texto | `#333333` |

---

## Licencia

Sistema desarrollado para la Municipalidad de San Miguel de Tucumán.

---

**DIM360** - Dirección de Ingresos Municipales | Municipalidad de San Miguel de Tucumán
