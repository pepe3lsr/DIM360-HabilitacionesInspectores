# EPEN - Sistema de Notificaciones Presenciales

Sistema completo de notificaciones presenciales para el Ente Provincial de Energía del Neuquén (EPEN). Permite gestionar la asignación, ejecución y verificación de notificaciones en campo con captura de evidencia georeferenciada.

## Arquitectura

| Componente | Tecnología | Archivo |
|---|---|---|
| Backend / API | Node.js + Express + SQLite | `server.js` |
| Panel Admin | HTML/CSS/JS (single page) | `public/admin.html` |
| App Móvil | React Native (Expo Snack) | `App.snack.jsx` |

## Funcionalidades

### Panel de Administración
- Importación masiva de notificaciones desde CSV
- Asignación de notificaciones a notificadores por zona
- Seguimiento de recorridos y estados
- Gestión de usuarios (notificadores)
- Edición de registros de notificación
- Dashboard con estadísticas
- Paginación en todas las tablas con selector de registros por página

### App Móvil (Notificador)
- Login con JWT
- Listado de notificaciones pendientes y completadas
- Filtros por fecha (Hoy, 7 días, 30 días) y búsqueda por texto
- Captura de notificación: foto del domicilio, GPS, firma digital
- Acceso a ficha oficial (PDF) de notificaciones completadas
- Modo demo para testing sin backend

### Verificación Pública
- Página `/verificar/:token` accesible sin autenticación
- Muestra constancia completa: datos, foto, firma, geolocalización, fecha de notificación
- Generación de QR con enlace de verificación

## Inicio Rápido

```bash
# Instalar dependencias
npm install

# Iniciar servidor (crea la BD automáticamente en data/epen.db)
node server.js

# Acceder al panel admin
# http://localhost:3000/admin.html
# Usuario: admin / Contraseña: admin123
```

Para la app móvil, ver [INSTRUCCIONES_APP.md](INSTRUCCIONES_APP.md).

## Documentación

- [QUICKSTART.md](QUICKSTART.md) - Guía rápida de instalación
- [INSTRUCCIONES_APP.md](INSTRUCCIONES_APP.md) - Guía de uso de la app móvil
- [PANEL_ADMIN.md](PANEL_ADMIN.md) - Documentación del panel de administración
- [PASAR_A_PRODUCCION.md](PASAR_A_PRODUCCION.md) - Guía de migración a producción

## Stack

- **Backend:** Node.js, Express, SQLite3, JWT, bcryptjs, multer, uuid
- **Frontend Admin:** HTML5, CSS3, JavaScript vanilla
- **App Móvil:** React Native, Expo SDK 54, AsyncStorage
- **Paleta:** Verde EPEN (#2e7d32, #1b5e20, #388e3c, #e8f5e9)
