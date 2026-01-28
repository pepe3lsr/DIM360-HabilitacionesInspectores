# EPEN - Sistema de Notificaciones Presenciales

<p align="center">
  <img src="https://www.epen.gov.ar/wp-content/uploads/2024/02/Logo-EPEN.jpg" alt="EPEN Logo" width="300">
</p>

Sistema completo de notificaciones presenciales para el **Ente Provincial de Energía del Neuquén (EPEN)**. Permite gestionar todo el ciclo de vida de una notificación: importación masiva, asignación a notificadores, ejecución en campo con captura de evidencia georeferenciada (foto, GPS, firma digital), generación de constancia oficial con QR de verificación, y envío de SMS al ciudadano.

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
```

| Componente | Tecnología | Archivo principal |
|---|---|---|
| Backend / API REST | Node.js + Express + SQLite | `server.js` |
| Panel de Administración | HTML5 + CSS3 + JS vanilla | `public/admin.html` |
| App Móvil | React Native (Expo Snack SDK 54) | `App.snack.jsx` |
| Base de Datos | SQLite (archivo `data/epen.db`) | Auto-generada |

---

## Funcionalidades

### Panel de Administración (`/admin.html`)

- **Dashboard** con estadísticas en tiempo real (total, pendientes, completadas, notificadores activos)
- **Importación masiva** desde archivos CSV con campos EPEN (nro_orden, suministro, nro_cliente, tipo, cronograma, zona, sucursal, correo)
- **Asignación** de notificaciones a notificadores por zona o selección individual
- **Desasignación** individual, múltiple o total por notificador
- **Recorridos**: seguimiento del progreso de cada notificador con detalle de notificaciones asignadas
- **Gestión de usuarios**: alta, edición y baja de notificadores con zona asignada
- **Edición de registros**: corrección de datos importados (nombre, dirección, zona, etc.)
- **Listado de notificaciones** con filtros por estado, zona y búsqueda por texto
- **Paginación** en todas las tablas con selector de registros por página (10/20/50/100), navegación primera/anterior/siguiente/última
- **Exportación CSV** del listado de notificaciones

### App Móvil (Notificador)

- **Login** con autenticación JWT
- **Listado** de notificaciones pendientes y completadas con contadores
- **Filtros** por fecha (Hoy, 7 días, 30 días), búsqueda por nombre/dirección/nro. orden, y ordenamiento
- **Captura de notificación**:
  - Foto del domicilio (cámara real del dispositivo)
  - Geolocalización GPS (alta precisión)
  - Firma digital táctil del ciudadano (canvas SVG)
- **Detalle** completo de cada notificación con todos los campos EPEN
- **Ficha oficial**: acceso directo a la constancia de verificación desde notificaciones completadas
- **Pantalla de confirmación** con token de verificación y código QR
- **Modo demo** para testing sin backend

### Verificación Pública (`/verificar/:token`)

- Página HTML accesible sin autenticación
- Constancia oficial con encabezado EPEN
- Datos completos: notificación, ciudadano, geolocalización, foto, firma
- **Fecha y hora de notificación** en zona horaria Argentina (UTC-3)
- Token de verificación y código QR
- Diseño optimizado para impresión (PDF desde navegador)

---

## Inicio Rápido

### Requisitos

- Node.js >= 16.0.0
- npm >= 8.0.0

### Instalación y ejecución

```bash
# Clonar el repositorio
git clone https://github.com/pepe3lsr/notificadores.git
cd notificadores

# Instalar dependencias del backend
npm install

# Iniciar el servidor (crea la BD automáticamente)
node server.js
```

El servidor arranca en `http://localhost:3000`.

### Accesos

| Recurso | URL | Credenciales |
|---|---|---|
| Panel Admin | http://localhost:3000/admin.html | admin / admin123 |
| App Móvil (web) | Expo Snack (ver abajo) | notifier@example.com / demo123 |
| Verificación pública | http://localhost:3000/verificar/:token | Sin autenticación |

### App Móvil en Expo Snack

1. Ir a [snack.expo.dev](https://snack.expo.dev)
2. Copiar el contenido de `App.snack.jsx`
3. Agregar dependencias: `expo-image-picker`, `expo-location`, `@react-native-async-storage/async-storage`, `react-native-svg`
4. Cambiar `API_URL` a la IP local de tu PC (ej: `http://192.168.1.77:3000`)
5. Escanear el QR con Expo Go en el celular

---

## API REST

### Autenticación

| Método | Endpoint | Auth | Descripción |
|---|---|---|---|
| POST | `/auth/login` | - | Login (devuelve JWT + user) |

### Notificaciones (Admin)

| Método | Endpoint | Auth | Descripción |
|---|---|---|---|
| GET | `/api/notifications` | Admin | Listar todas las notificaciones (con nombre de notificador) |
| GET | `/api/notifications/:id` | Token | Detalle de una notificación |
| POST | `/api/notifications` | Admin | Crear notificación individual |
| PUT | `/api/notifications/:id` | Admin | Editar campos de una notificación |
| DELETE | `/api/notifications/:id` | Admin | Eliminar notificación |
| GET | `/api/notifications/zones` | Admin | Listar zonas con conteos |
| GET | `/api/notifications/stats` | Admin | Estadísticas generales |

### Importación

| Método | Endpoint | Auth | Descripción |
|---|---|---|---|
| POST | `/import/csv` | - | Importar notificaciones desde CSV |
| GET | `/api/import/batches` | Admin | Listar lotes de importación |

### Asignación

| Método | Endpoint | Auth | Descripción |
|---|---|---|---|
| POST | `/api/assign` | Admin | Asignar notificaciones (por zona o IDs) |
| POST | `/api/unassign` | Admin | Desasignar notificaciones |
| GET | `/api/zones` | Admin | Listar zonas disponibles |
| POST | `/api/zones` | Admin | Asignar zona a notificador |

### Notificadores

| Método | Endpoint | Auth | Descripción |
|---|---|---|---|
| GET | `/api/notifiers` | Admin | Listar notificadores |
| POST | `/api/notifiers` | Admin | Crear notificador |
| PUT | `/api/notifiers/:id` | Admin | Editar notificador |
| DELETE | `/api/notifiers/:id` | Admin | Eliminar notificador |

### Recorridos

| Método | Endpoint | Auth | Descripción |
|---|---|---|---|
| GET | `/api/recorridos` | Admin | Resumen de recorridos por notificador |
| GET | `/api/recorridos/:id` | Admin | Detalle de notificaciones de un notificador |

### App Móvil (Notificador)

| Método | Endpoint | Auth | Descripción |
|---|---|---|---|
| GET | `/assignments` | Token | Notificaciones asignadas al notificador |
| POST | `/api/notifications/:id/capture` | Token | Enviar captura (foto, GPS, firma) |
| POST | `/sync` | Token | Sincronizar datos |
| GET | `/report` | Token | Reporte del notificador |

### Verificación Pública

| Método | Endpoint | Auth | Descripción |
|---|---|---|---|
| GET | `/verificar/:token` | - | Constancia oficial HTML (imprimible como PDF) |

---

## Estructura de la Base de Datos

### Tabla `notifications`

| Campo | Tipo | Descripción |
|---|---|---|
| id | INTEGER PK | ID autoincremental |
| citizen_name | TEXT | Nombre del ciudadano |
| citizen_phone | TEXT | Teléfono |
| address | TEXT | Domicilio |
| latitude / longitude | REAL | Coordenadas GPS capturadas |
| status | TEXT | pending / in_progress / synced / completed |
| notifier_id | INTEGER FK | Notificador asignado |
| photo_path | TEXT | Ruta/base64 de la foto |
| signature_path | TEXT | Ruta/base64 de la firma SVG |
| token | TEXT UNIQUE | Token de verificación (UUID) |
| qr_code | TEXT | URL del QR de verificación |
| sms_sent | BOOLEAN | Si se envió SMS |
| created_at | TIMESTAMP | Fecha de alta |
| notified_at | TIMESTAMP | Fecha y hora de notificación |
| nro_orden | TEXT | Número de orden EPEN |
| suministro | TEXT | Número de suministro |
| nro_cliente | TEXT | Número de cliente |
| tipo_notificacion | TEXT | Tipo (IN ORDENATIVO, etc.) |
| nro_cronograma | TEXT | Número de cronograma |
| correo | TEXT | Correo asociado |
| sucursal | TEXT | Sucursal EPEN |
| zona | TEXT | Zona geográfica |
| import_batch_id | INTEGER FK | Lote de importación |

### Tabla `users`

| Campo | Tipo | Descripción |
|---|---|---|
| id | INTEGER PK | ID |
| email | TEXT UNIQUE | Email de login |
| password | TEXT | Hash bcrypt |
| role | TEXT | admin / notifier |
| name | TEXT | Nombre completo |
| zone | TEXT | Zona asignada |

### Tabla `import_batches`

| Campo | Tipo | Descripción |
|---|---|---|
| id | INTEGER PK | ID |
| filename | TEXT | Nombre del archivo importado |
| nro_cronograma | TEXT | Cronograma del lote |
| correo / sucursal | TEXT | Datos del lote |
| total_records | INTEGER | Registros importados |
| created_at | TIMESTAMP | Fecha de importación |

---

## Formato CSV de Importación

El CSV debe tener las siguientes columnas (separadas por `;`):

```
NRO_ORDEN;SUMINISTRO;NRO_CLIENTE;TIPO_NOTIFICACION;RAZON_SOCIAL;DOMICILIO_SUMINISTRO
```

Ejemplo:
```
2482834;153248;153883;IN ORDENATIVO DE INTIMACION;CANDIA MICAELA ALEJANDRA;LAGO TRAFUL 23 (8306) - S. P. CHANAR, CE
```

Los campos `nro_cronograma`, `correo` y `sucursal` se configuran al momento de importar desde el panel admin.

---

## Stack Tecnológico

| Capa | Tecnologías |
|---|---|
| Backend | Node.js, Express 4, SQLite3, JWT, bcryptjs, multer, csv-parser, uuid |
| Admin Panel | HTML5, CSS3, JavaScript ES6+ (vanilla, sin frameworks) |
| App Móvil | React Native, Expo SDK 54, expo-image-picker, expo-location, react-native-svg, AsyncStorage |
| Paleta de colores | Verde EPEN: `#2e7d32` (primary), `#1b5e20` (dark), `#388e3c` (medium), `#e8f5e9` (light) |

---

## Documentación Adicional

- [QUICKSTART.md](QUICKSTART.md) - Guía de instalación paso a paso
- [INSTRUCCIONES_APP.md](INSTRUCCIONES_APP.md) - Guía de uso de la app móvil
- [PANEL_ADMIN.md](PANEL_ADMIN.md) - Documentación completa del panel admin
- [PASAR_A_PRODUCCION.md](PASAR_A_PRODUCCION.md) - Checklist de migración a producción

---

## Flujo Operativo

```
1. IMPORTAR     Admin sube CSV con notificaciones desde el panel
       │
2. ASIGNAR      Admin asigna notificaciones a notificadores por zona
       │
3. NOTIFICAR    Notificador abre la app, ve sus pendientes, va al domicilio
       │         Captura: foto + GPS + firma del ciudadano
       │
4. VERIFICAR    Sistema genera constancia con token + QR
       │         Se envía SMS al ciudadano con link de verificación
       │
5. CONSULTAR    Cualquier persona puede verificar la notificación
                 escaneando el QR o ingresando al link /verificar/:token
```

---

## Licencia

MIT
