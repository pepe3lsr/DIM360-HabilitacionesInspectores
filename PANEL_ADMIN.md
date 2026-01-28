# 🎛️ Panel de Administración - Sistema EPEN

## 📋 Índice
- [Acceso al Panel](#acceso-al-panel)
- [Funcionalidades](#funcionalidades)
- [Cómo Usar](#cómo-usar)
- [API Endpoints](#api-endpoints)

---

## 🔐 Acceso al Panel

### Iniciar el Servidor

```bash
cd c:\Users\pepe3\OneDrive - AGCBA\Documentos\Pp_Personal\EPEN
node server.js
```

Verás el mensaje:
```
Twilio no configurado - Modo de prueba sin SMS
Servidor ejecutándose en http://localhost:3000
Panel de administración: http://localhost:3000/admin.html
```

### Abrir el Panel

Abre tu navegador web y ve a:
```
http://localhost:3000/admin.html
```

---

## ✨ Funcionalidades

### 1. 📊 Dashboard
- **Estadísticas en Tiempo Real**
  - Total de notificaciones
  - Notificaciones pendientes
  - Notificaciones completadas

- **Notificaciones Recientes**
  - Lista de las últimas 5 notificaciones
  - Estado actual de cada una
  - Fecha de creación

### 2. ➕ Nueva Notificación
Formulario para cargar ciudadanos a notificar:

**Campos obligatorios:**
- 👤 Nombre del Ciudadano
- 📞 Teléfono (formato: +54 9 299 456-7890)
- 📍 Dirección Completa

**Campos opcionales:**
- 🌍 Latitud y Longitud (GPS)
- 💰 Monto

### 3. 📋 Lista de Notificaciones
- **Vista Completa**
  - Tabla con todas las notificaciones
  - Información: ID, Ciudadano, Teléfono, Dirección, Estado, Fecha

- **Estados Posibles:**
  - 🟡 `Pendiente` - Aún no notificada
  - 🔵 `En Progreso` - Notificador en camino
  - 🟢 `Sincronizada` - Datos capturados (GPS, foto, firma)
  - ✅ `Completada` - Proceso finalizado

- **Acciones:**
  - 👁️ **Ver Detalle** - Abre modal con información completa
  - 🗑️ **Eliminar** - Borra la notificación

### 4. 🔍 Vista de Detalle
Al hacer clic en "Ver", se muestra:

**Información General:**
- ID de la notificación
- Estado actual
- Nombre del ciudadano
- Teléfono
- Dirección completa

**Datos de Captura (si están disponibles):**
- 📍 **GPS**: Latitud y longitud
- 📸 **Fotografía del Domicilio**: Preview de la imagen
- ✍️ **Firma del Ciudadano**: Preview de la firma
- 🔐 **Token de Verificación**: Token HMAC-SHA256
- 📱 **Código QR**: Para validación
- 📲 **Estado del SMS**: Si fue enviado o no
- 📅 **Fecha de Creación**

---

## 🚀 Cómo Usar

### Flujo Completo: Desde el Panel Web hasta la App Móvil

#### **Paso 1: Cargar Notificaciones en el Panel Web**

1. Abre el panel: `http://localhost:3000/admin.html`
2. Ve a la pestaña **"➕ Nueva Notificación"**
3. Completa el formulario:
   ```
   Nombre: Juan Pérez
   Teléfono: +54 9 299 456-7890
   Dirección: Av. Argentina 1234, Neuquén Capital
   Latitud: -38.9516 (opcional)
   Longitud: -68.0591 (opcional)
   Monto: $15,000 (opcional)
   ```
4. Haz clic en **"✓ Crear Notificación"**
5. Verás un mensaje: **"✅ Notificación creada exitosamente (ID: X)"**

#### **Paso 2: Verificar en el Dashboard**

1. Ve a la pestaña **"📊 Dashboard"**
2. Verás las estadísticas actualizadas:
   - **Total**: aumentó en 1
   - **Pendientes**: aumentó en 1
3. La notificación aparece en **"Notificaciones Recientes"**

#### **Paso 3: Ver en la App Móvil**

**Opción A: Modo Demo (sin backend)**
- La app usa datos demo precargados
- No requiere conexión al servidor

**Opción B: Modo Producción (con backend)**
1. En [App.snack.jsx](App.snack.jsx:21), cambia:
   ```javascript
   const DEMO_MODE = false; // Cambia a false
   ```
2. Asegúrate de que el servidor esté corriendo
3. La app cargará las notificaciones desde el backend

#### **Paso 4: Notificador Captura Datos**

1. El notificador inicia sesión en la app móvil
2. Selecciona una notificación de la lista
3. Captura:
   - 📍 GPS (automático)
   - 📸 Foto del domicilio (cámara)
   - ✍️ Firma del ciudadano (táctil)
4. Envía la notificación

#### **Paso 5: Ver Resultados en el Panel**

1. Vuelve al panel web
2. Ve a **"📋 Lista de Notificaciones"**
3. Haz clic en **"🔄 Refrescar"**
4. Busca la notificación procesada
5. Haz clic en **"👁️ Ver"** para ver:
   - ✅ Estado: "Sincronizada"
   - 📍 Coordenadas GPS capturadas
   - 📸 Foto del domicilio
   - ✍️ Firma del ciudadano
   - 🔐 Token de verificación
   - 📱 Código QR generado
   - 📲 Estado del SMS

---

## 🔌 API Endpoints

El panel web consume los siguientes endpoints:

### **GET /api/notifications/stats**
Obtiene estadísticas generales.

**Respuesta:**
```json
{
  "total": 10,
  "pending": 5,
  "completed": 5
}
```

### **GET /api/notifications**
Obtiene todas las notificaciones (con límite opcional).

**Query params:**
- `limit` (opcional): Número máximo de resultados

**Respuesta:**
```json
[
  {
    "id": 1,
    "citizen_name": "Juan Pérez",
    "citizen_phone": "+54 9 299 456-7890",
    "address": "Av. Argentina 1234, Neuquén Capital",
    "latitude": -38.9516,
    "longitude": -68.0591,
    "status": "pending",
    "token": null,
    "qr_code": null,
    "sms_sent": 0,
    "photo_path": null,
    "signature_path": null,
    "created_at": "2026-01-23T10:30:00.000Z"
  }
]
```

### **GET /api/notifications/:id**
Obtiene una notificación específica por ID.

**Respuesta:**
```json
{
  "id": 1,
  "citizen_name": "Juan Pérez",
  "citizen_phone": "+54 9 299 456-7890",
  "address": "Av. Argentina 1234, Neuquén Capital",
  "latitude": -38.9516,
  "longitude": -68.0591,
  "status": "synced",
  "token": "9ff6c476af5a7fcfdf785cc48dfa24c84d9a0035ec0f64002b3b5bbde535b54e",
  "qr_code": "https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=...",
  "sms_sent": 1,
  "photo_path": "data:image/jpeg;base64,...",
  "signature_path": "data:image/png;base64,...",
  "created_at": "2026-01-23T10:30:00.000Z",
  "notifier_id": 1
}
```

### **POST /api/notifications**
Crea una nueva notificación.

**Body:**
```json
{
  "citizen_name": "Juan Pérez",
  "citizen_phone": "+54 9 299 456-7890",
  "address": "Av. Argentina 1234, Neuquén Capital",
  "latitude": -38.9516,
  "longitude": -68.0591,
  "amount": "$15,000"
}
```

**Respuesta:**
```json
{
  "success": true,
  "id": 1,
  "message": "Notificación creada exitosamente"
}
```

### **PUT /api/notifications/:id**
Actualiza una notificación existente.

**Body:**
```json
{
  "citizen_name": "Juan Pérez",
  "citizen_phone": "+54 9 299 456-7890",
  "address": "Av. Argentina 1234, Neuquén Capital",
  "latitude": -38.9516,
  "longitude": -68.0591,
  "status": "pending"
}
```

### **DELETE /api/notifications/:id**
Elimina una notificación.

**Respuesta:**
```json
{
  "success": true,
  "message": "Notificación eliminada"
}
```

### **POST /api/notifications/:id/capture**
Actualiza una notificación con datos capturados (foto, firma, GPS).

**Body:**
```json
{
  "photo_base64": "base64_string...",
  "signature_base64": "base64_string...",
  "gps_lat": -38.9516,
  "gps_lng": -68.0591
}
```

**Respuesta:**
```json
{
  "success": true,
  "token": "9ff6c476af5a7fcfdf785cc48dfa24c84d9a0035ec0f64002b3b5bbde535b54e",
  "qr_url": "https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=...",
  "payment_link": "https://pago.ejemplo.com/notificacion/9ff6c476..."
}
```

---

## 🎨 Características del Panel

### ✅ Diseño Responsivo
- Se adapta a cualquier tamaño de pantalla
- Optimizado para desktop y tablets

### ⚡ Actualización en Tiempo Real
- Botón "🔄 Refrescar" para actualizar datos
- Estadísticas se actualizan automáticamente al crear/eliminar

### 🎯 Interfaz Intuitiva
- Navegación por pestañas
- Alertas visuales de éxito/error
- Estados con códigos de color
- Modal de detalle con toda la información

### 🔒 Validaciones
- Campos obligatorios marcados con *
- Validación de formato de datos
- Mensajes de error claros

---

## 🧪 Pruebas Recomendadas

### Test 1: Crear Notificación
1. Abre el panel
2. Ve a "➕ Nueva Notificación"
3. Completa el formulario
4. Verifica que aparece en Dashboard y Lista

### Test 2: Ver Detalle
1. Ve a "📋 Lista de Notificaciones"
2. Haz clic en "👁️ Ver" en cualquier notificación
3. Verifica que se muestra toda la información

### Test 3: Eliminar Notificación
1. Haz clic en "🗑️" en una notificación
2. Confirma la eliminación
3. Verifica que desaparece de la lista
4. Verifica que las estadísticas se actualizan

### Test 4: Integración con App Móvil
1. Crea una notificación en el panel
2. Configura `DEMO_MODE = false` en la app
3. Inicia sesión en la app
4. Verifica que aparece la notificación
5. Completa captura de datos
6. Vuelve al panel y verifica los datos capturados

---

## 🐛 Solución de Problemas

### El panel no carga
**Solución:** Verifica que el servidor esté corriendo en `http://localhost:3000`

### No se ven las notificaciones
**Solución:**
1. Haz clic en "🔄 Refrescar"
2. Verifica que haya notificaciones en la BD
3. Revisa la consola del navegador (F12) para errores

### No se pueden crear notificaciones
**Solución:**
1. Verifica que completes todos los campos obligatorios
2. Revisa la consola del navegador para errores
3. Verifica que el servidor esté corriendo

### Las imágenes no se muestran
**Solución:**
- En modo demo, las imágenes son URLs simuladas
- Para ver imágenes reales, usa la app en modo producción

---

## 📝 Notas Importantes

1. **Base de Datos en Memoria**
   - Los datos se pierden al reiniciar el servidor
   - Para persistencia, cambiar a SQLite en archivo o PostgreSQL

2. **Seguridad**
   - En producción, implementar autenticación para el panel
   - Agregar validación de roles (admin vs notifier)
   - Usar HTTPS

3. **SMS**
   - Requiere configurar Twilio en variables de entorno
   - Sin Twilio, funciona en modo simulación

4. **Imágenes**
   - Por ahora se guardan como base64 en BD
   - Para producción, guardar como archivos en servidor/S3

---

## 🚀 Próximos Pasos

- [ ] Implementar autenticación en el panel
- [ ] Agregar filtros en la lista de notificaciones
- [ ] Exportar reportes en PDF/Excel
- [ ] Agregar gráficos de estadísticas
- [ ] Implementar búsqueda de notificaciones
- [ ] Agregar paginación en la tabla
- [ ] Persistencia de datos en archivo SQLite
- [ ] Upload de CSV para carga masiva desde el panel

---

**¡El panel está listo para usar!** 🎉

Accede a: **http://localhost:3000/admin.html**
