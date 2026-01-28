# 🚀 Guía para Pasar a Producción

## 📋 Estado Actual: Mockup vs Real

### ✅ **LO QUE FUNCIONA REALMENTE**

#### App Móvil:
- ✅ Captura de firma táctil (dibuja con el dedo)
- ✅ Captura de foto con cámara real del dispositivo
- ✅ Navegación entre pantallas
- ✅ Validaciones de formularios
- ✅ Permisos de cámara

#### Panel Web:
- ✅ Crear/Listar/Eliminar notificaciones
- ✅ Ver detalles completos
- ✅ Estadísticas en tiempo real
- ✅ Toda la interfaz visual

#### Backend:
- ✅ API REST completa
- ✅ Autenticación JWT
- ✅ Generación de tokens y QR

---

### ❌ **LO QUE ES MOCKUP (Simulado)**

#### App Móvil:
1. **GPS/Geolocalización** - Coordenadas FIJAS
   - Archivo: `App.snack.jsx` líneas 230-235
   - Problema: Siempre devuelve `-38.9516, -68.0591`

2. **Modo DEMO activado** - No conecta al backend
   - Archivo: `App.snack.jsx` línea 21
   - Problema: Usa datos hardcodeados

3. **8 Notificaciones hardcodeadas**
   - Archivo: `App.snack.jsx` líneas 24-89
   - Problema: No se actualizan desde el backend

#### Backend:
1. **Base de Datos EN MEMORIA**
   - Archivo: `server.js` línea 34
   - Problema: Se pierden TODOS los datos al reiniciar

2. **SMS no funciona** - Twilio no configurado
   - Archivo: `server.js` líneas 20-31
   - Problema: Solo imprime en consola

3. **Imágenes no se guardan completas**
   - Archivo: `server.js` líneas 510-511
   - Problema: Solo guarda 50 caracteres

---

## 🔧 CAMBIOS PARA PRODUCCIÓN

### **1. Habilitar GPS Real en la App**

#### Paso 1.1: Instalar dependencia de geolocalización

En `package.mobile.json`, agregar:
```json
{
  "dependencies": {
    "expo-image-picker": "~15.0.7",
    "expo-location": "~17.0.1"
  }
}
```

#### Paso 1.2: Modificar código de GPS

En `App.snack.jsx`, **REEMPLAZAR** líneas 1-17 con:
```javascript
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
  ActivityIndicator,
  StyleSheet,
  Platform,
  Modal,
  PanResponder,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location'; // AGREGAR ESTA LÍNEA
```

#### Paso 1.3: Actualizar función de GPS

En `App.snack.jsx`, **REEMPLAZAR** la función `requestPermissions` (líneas 238-251) con:
```javascript
const requestPermissions = async () => {
  try {
    // Solicitar permisos de cámara
    const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
    if (!cameraPermission.granted) {
      Alert.alert(
        '⚠️ Permisos necesarios',
        'Se necesita acceso a la cámara para tomar fotos del domicilio'
      );
    }

    // Solicitar permisos de ubicación
    const locationPermission = await Location.requestForegroundPermissionsAsync();
    if (!locationPermission.granted) {
      Alert.alert(
        '⚠️ Permisos necesarios',
        'Se necesita acceso a la ubicación para registrar la posición'
      );
    }
  } catch (error) {
    console.log('Error solicitando permisos:', error);
  }
};
```

#### Paso 1.4: Capturar GPS Real

En `App.snack.jsx`, **REEMPLAZAR** el useEffect (líneas 218-236) con:
```javascript
useEffect(() => {
  // Validar que notification existe
  if (!notification) {
    Alert.alert('Error', 'No se recibió información de la notificación');
    onBack();
    return;
  }

  // Solicitar permisos
  requestPermissions();

  // Capturar GPS REAL del dispositivo
  const getGPS = async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('⚠️ Error', 'Permisos de ubicación no otorgados');
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High
      });

      setGps({
        lat: location.coords.latitude,
        lng: location.coords.longitude,
      });

      Alert.alert('✅ GPS Capturado', `Lat: ${location.coords.latitude.toFixed(4)}, Lng: ${location.coords.longitude.toFixed(4)}`);
    } catch (error) {
      console.error('Error obteniendo GPS:', error);
      Alert.alert('❌ Error GPS', 'No se pudo obtener la ubicación');
    }
  };

  getGPS();
}, []);
```

---

### **2. Conectar App con Backend Real**

#### Paso 2.1: Desactivar modo DEMO

En `App.snack.jsx`, **CAMBIAR** línea 21:
```javascript
const DEMO_MODE = false; // CAMBIAR A FALSE
```

#### Paso 2.2: Configurar URL del Backend

En `App.snack.jsx`, **CAMBIAR** línea 20:
```javascript
// Para desarrollo local (misma red WiFi):
const API_URL = 'http://TU_IP_LOCAL:3000'; // Ejemplo: http://192.168.1.100:3000

// Para producción (servidor en la nube):
const API_URL = 'https://tu-dominio.com';
```

**Cómo obtener tu IP local:**
- Windows: `ipconfig` (busca "IPv4")
- Mac/Linux: `ifconfig` (busca "inet")

---

### **3. Persistir Base de Datos (NO perder datos)**

#### Opción A: SQLite en Archivo (Recomendado para desarrollo)

En `server.js`, **CAMBIAR** línea 34:
```javascript
// ANTES (en memoria):
const db = new sqlite3.Database(':memory:');

// DESPUÉS (en archivo):
const db = new sqlite3.Database('./database/epen.db');
```

Crear carpeta:
```bash
mkdir database
```

#### Opción B: PostgreSQL (Recomendado para producción)

1. Instalar dependencia:
```bash
npm install pg
```

2. Crear archivo `database.js`:
```javascript
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'epen_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password'
});

module.exports = pool;
```

3. Crear migraciones en `migrations/001_create_tables.sql`:
```sql
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE,
  password VARCHAR(255),
  role VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  citizen_name VARCHAR(255),
  citizen_phone VARCHAR(50),
  address TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  status VARCHAR(50) DEFAULT 'pending',
  notifier_id INTEGER REFERENCES users(id),
  photo_path TEXT,
  signature_path TEXT,
  token VARCHAR(255) UNIQUE,
  qr_code TEXT,
  sms_sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);
```

---

### **4. Guardar Imágenes Completas**

#### Paso 4.1: Crear carpeta de uploads

```bash
mkdir -p uploads/photos
mkdir -p uploads/signatures
```

#### Paso 4.2: Instalar dependencia para manejar base64

```bash
npm install fs-extra
```

#### Paso 4.3: Actualizar endpoint de captura

En `server.js`, **REEMPLAZAR** el endpoint `/api/notifications/:id/capture` (líneas 481-553) con:

```javascript
const fs = require('fs-extra');
const path = require('path');

// Actualizar notificación con datos de captura (foto, firma, GPS)
app.post('/api/notifications/:id/capture', async (req, res) => {
  const { photo_base64, signature_base64, gps_lat, gps_lng } = req.body;
  const notificationId = req.params.id;

  try {
    // Generar token único
    const timestamp = new Date().toISOString();
    const token = generateToken({ lat: gps_lat, lng: gps_lng }, timestamp, notificationId);
    const qr_url = generateQR(token);

    // Guardar foto como archivo
    let photoPath = null;
    if (photo_base64) {
      const photoBuffer = Buffer.from(photo_base64.replace(/^data:image\/\w+;base64,/, ''), 'base64');
      photoPath = `uploads/photos/${notificationId}_${Date.now()}.jpg`;
      await fs.writeFile(photoPath, photoBuffer);
    }

    // Guardar firma como archivo
    let signaturePath = null;
    if (signature_base64) {
      const signatureBuffer = Buffer.from(signature_base64.replace(/^data:image\/\w+;base64,/, ''), 'base64');
      signaturePath = `uploads/signatures/${notificationId}_${Date.now()}.png`;
      await fs.writeFile(signaturePath, signatureBuffer);
    }

    // Actualizar BD
    db.run(
      `
        UPDATE notifications
        SET status = 'synced',
            token = ?,
            qr_code = ?,
            latitude = ?,
            longitude = ?,
            photo_path = ?,
            signature_path = ?
        WHERE id = ?
      `,
      [token, qr_url, gps_lat, gps_lng, photoPath, signaturePath, notificationId],
      function(err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        // Obtener datos del ciudadano para SMS
        db.get(
          'SELECT citizen_phone, citizen_name FROM notifications WHERE id = ?',
          [notificationId],
          (err, row) => {
            if (row && row.citizen_phone) {
              const paymentLink = `https://pago.ejemplo.com/notificacion/${token}`;

              if (client) {
                client.messages
                  .create({
                    body: `Estimado ${row.citizen_name}, ha recibido una notificación. Pague aquí: ${paymentLink}`,
                    from: TWILIO_PHONE,
                    to: row.citizen_phone
                  })
                  .then(() => {
                    db.run('UPDATE notifications SET sms_sent = 1 WHERE id = ?', [notificationId]);
                  })
                  .catch((err) => console.log('SMS error:', err));
              } else {
                console.log('SMS simulado (Twilio no configurado):', paymentLink);
              }
            }

            res.json({
              success: true,
              token,
              qr_url,
              payment_link: `https://pago.ejemplo.com/notificacion/${token}`
            });
          }
        );
      }
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

#### Paso 4.4: Servir imágenes estáticamente

En `server.js`, **AGREGAR** después de línea 38:
```javascript
app.use('/uploads', express.static('uploads')); // Servir imágenes
```

---

### **5. Configurar SMS Real con Twilio**

#### Paso 5.1: Crear cuenta en Twilio

1. Ve a https://www.twilio.com/
2. Regístrate gratis (dan crédito de prueba)
3. Crea un número de teléfono
4. Obtén tus credenciales:
   - Account SID
   - Auth Token
   - Phone Number

#### Paso 5.2: Configurar variables de entorno

Crear archivo `.env`:
```bash
# JWT
JWT_SECRET=tu-clave-secreta-super-segura-12345

# Twilio
TWILIO_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_TOKEN=tu-token-de-twilio
TWILIO_PHONE=+1234567890

# Base de Datos (si usas PostgreSQL)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=epen_db
DB_USER=postgres
DB_PASSWORD=tu-password
```

#### Paso 5.3: Cargar variables de entorno

En `server.js`, **AGREGAR** al inicio:
```javascript
require('dotenv').config(); // AGREGAR ESTA LÍNEA al inicio

const express = require('express');
// ... resto del código
```

---

### **6. Seguridad para Producción**

#### 6.1: Hashear Passwords

```bash
npm install bcrypt
```

En `server.js`:
```javascript
const bcrypt = require('bcrypt');

// Al crear usuario:
const hashedPassword = await bcrypt.hash(password, 10);

// Al login:
const isValid = await bcrypt.compare(password, user.password);
```

#### 6.2: Validar JWT en Panel Web

En `public/admin.html`, agregar autenticación:
```javascript
// Guardar token al login
localStorage.setItem('admin_token', token);

// Agregar token a todas las peticiones
fetch('/api/notifications', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
  }
});
```

#### 6.3: HTTPS en Producción

Usar certificado SSL (Let's Encrypt gratis):
```bash
npm install express-sslify
```

```javascript
const enforce = require('express-sslify');
if (process.env.NODE_ENV === 'production') {
  app.use(enforce.HTTPS({ trustProtoHeader: true }));
}
```

---

## 📋 Checklist Completo para Producción

### App Móvil:
- [ ] Instalar `expo-location`
- [ ] Cambiar `DEMO_MODE = false`
- [ ] Actualizar `API_URL` con IP/dominio real
- [ ] Implementar GPS real con `expo-location`
- [ ] Probar permisos de GPS en dispositivo físico
- [ ] Probar conexión con backend real

### Backend:
- [ ] Cambiar BD de `:memory:` a archivo o PostgreSQL
- [ ] Configurar Twilio con credenciales reales
- [ ] Implementar guardado de imágenes completas
- [ ] Crear carpetas `uploads/photos` y `uploads/signatures`
- [ ] Instalar `fs-extra` para manejar archivos
- [ ] Servir imágenes con `express.static('/uploads')`
- [ ] Hashear passwords con bcrypt
- [ ] Validar JWT en todos los endpoints
- [ ] Configurar HTTPS
- [ ] Crear archivo `.env` con secretos

### Base de Datos:
- [ ] Migrar de SQLite a PostgreSQL (producción)
- [ ] Crear índices en tablas
- [ ] Hacer backup automático
- [ ] Configurar replicación (opcional)

### Deployment:
- [ ] Configurar servidor (AWS, DigitalOcean, etc.)
- [ ] Instalar Node.js en servidor
- [ ] Configurar Nginx como reverse proxy
- [ ] Configurar PM2 para mantener app corriendo
- [ ] Configurar dominio y DNS
- [ ] Instalar certificado SSL

---

## 🗄️ Dónde se Guardan los Datos ACTUALMENTE

### Base de Datos (EN MEMORIA - TEMPORAL):
```
Ubicación: RAM del servidor
Archivo: server.js línea 34
Tipo: SQLite en memoria

⚠️ IMPORTANTE: Se pierden TODOS los datos al reiniciar el servidor

Tablas:
- users (credenciales)
- notifications (todas las notificaciones)
- sync_queue (cola de sincronización)
```

### Imágenes (NO SE GUARDAN COMPLETAS):
```
Ubicación: Base de datos (solo primeros 50 caracteres)
Archivo: server.js líneas 510-511

⚠️ IMPORTANTE: Solo guarda referencia, NO la imagen completa
```

### Cómo Verificar:
```bash
# Ver si existe archivo de BD (debería NO existir en modo actual)
ls -la database/

# Ver qué hay en uploads (debería estar vacío)
ls -la uploads/
```

---

## 🚀 Pasos Rápidos para Probar Producción

### 1. Base de Datos Persistente (5 minutos)
```bash
mkdir database
```

En `server.js` línea 34:
```javascript
const db = new sqlite3.Database('./database/epen.db');
```

Reinicia el servidor:
```bash
node server.js
```

Ahora los datos se guardan en `database/epen.db` ✅

### 2. GPS Real en App (10 minutos)
```bash
# En package.mobile.json
"expo-location": "~17.0.1"
```

Copiar código del **Paso 1.2, 1.3 y 1.4** de arriba ✅

### 3. Conectar App con Backend (2 minutos)
En `App.snack.jsx`:
```javascript
const DEMO_MODE = false;
const API_URL = 'http://192.168.1.100:3000'; // Tu IP local
```

---

## 📞 Soporte

Si tienes dudas sobre algún cambio específico, revisa:
- `PANEL_ADMIN.md` - Uso del panel web
- `INSTRUCCIONES_APP.md` - Uso de la app móvil
- `COMO_USAR_EN_EXPO_SNACK.md` - Configuración en Expo

---

**¿Listo para producción?** Sigue el checklist y tendrás un sistema completamente funcional 🚀
