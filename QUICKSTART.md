# 🚀 Quick Start - 5 Minutos a Producción

## 1️⃣ INSTALACIÓN DEL BACKEND (2 min)

```bash
# Clonar/descargar los archivos
mkdir notificaciones-mvp
cd notificaciones-mvp

# Copiar archivos:
# - server.js
# - package.json
# - .env.example → .env

# Instalar dependencias
npm install

# Verificar que Twilio está configurado
# Editar .env con tus credenciales de Twilio
nano .env
```

**Variables críticas a configurar:**
```
TWILIO_SID=ACxxxxxxxxxxxxxxxxxxx
TWILIO_TOKEN=your_auth_token
TWILIO_PHONE=+1234567890
JWT_SECRET=tu-secret-mega-seguro
```

## 2️⃣ INICIAR EL BACKEND

```bash
npm start
# Deberías ver:
# Servidor ejecutándose en http://localhost:3000
```

**Verificar que funciona:**
```bash
# Terminal nueva - probar endpoint
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"notifier@example.com","password":"demo123"}'

# Respuesta esperada:
# {"token":"eyJhbGciOiJIUzI1NiIs...","user":{"id":1,"email":"notifier@example.com","role":"notifier"}}
```

✅ Backend listo

---

## 3️⃣ INSTALACIÓN DE LA APP (React Native)

```bash
# Instalar React Native CLI global (si no lo tienes)
npm install -g react-native-cli

# Crear nuevo proyecto RN
npx react-native init notificacionesApp
cd notificacionesApp

# Instalar dependencias
npm install \
  react-native-geolocation-service \
  react-native-signature-canvas \
  react-native-qrcode-svg \
  @react-native-community/netinfo \
  @react-native-async-storage/async-storage \
  axios \
  uuid \
  crypto-js

# En Windows/Mac - instalar dependencias nativas
npm install --save-dev @react-native-community/cli

# Copiar App.jsx a ./
cp App.jsx ./
```

## 4️⃣ CONFIGURAR CONECTIVIDAD

**Cambiar API_URL en App.jsx:**

```javascript
// Línea ~21 en App.jsx
const API_URL = 'http://192.168.1.100:3000'; // Cambia a tu IP local
```

Para obtener tu IP:
```bash
# macOS/Linux
ifconfig | grep "inet " | grep -v 127.0.0.1

# Windows
ipconfig | findstr "IPv4"
```

## 5️⃣ EJECUTAR LA APP

**Android:**
```bash
npx react-native run-android
```

**iOS:**
```bash
npx react-native run-ios
```

### Si todo funciona, deberías ver:
✅ Pantalla de login
✅ Login con notifier@example.com / demo123
✅ Lista de notificaciones
✅ Flujo de captura

---

## 📋 TESTING RÁPIDO (Sin App)

**Si prefieres probar primero sin React Native:**

```bash
# 1. Crear usuario y obtener token
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"notifier@example.com","password":"demo123"}' > token.json

# Guardar el token (aparecerá como "token":"eyJ...")

# 2. Importar datos (opcional, hay datos demo)
curl -X POST http://localhost:3000/assignments \
  -H "Authorization: Bearer TU_TOKEN_AQUI"

# 3. Simular captura y sincronización
curl -X POST http://localhost:3000/sync \
  -H "Authorization: Bearer TU_TOKEN_AQUI" \
  -H "Content-Type: application/json" \
  -d '{
    "notification_id": 1,
    "gps_lat": -26.8213,
    "gps_lng": -65.2038,
    "timestamp": "2024-01-15T10:30:00Z",
    "photo_base64": "data:image/jpeg;base64,...",
    "signature_base64": "data:image/png;base64,..."
  }'

# 4. Descargar reporte
curl -X GET http://localhost:3000/report \
  -H "Authorization: Bearer TU_TOKEN_AQUI" \
  -o reporte.csv
```

---

## ✅ CHECKLIST DE INICIO

- [ ] Backend instalado y ejecutándose en port 3000
- [ ] Credenciales Twilio configuradas en .env
- [ ] npm start funciona sin errores
- [ ] /auth/login devuelve token válido
- [ ] App RN instalada y apunta a IP correcta
- [ ] Permisos de ubicación y cámara otorgados
- [ ] Login funciona en la app
- [ ] Se ve listado de notificaciones
- [ ] Flujo de captura completo funciona
- [ ] SMS llega al teléfono después de captura

---

## 🆘 TROUBLESHOOTING COMÚN

### "Cannot find module 'express'"
```bash
npm install
rm -rf node_modules package-lock.json
npm install
```

### "Error: EACCES: permission denied"
```bash
# macOS/Linux
sudo npm install
# o
npm install --prefix /usr/local
```

### "Twilio error: Invalid auth"
```bash
# Verificar credenciales en .env
echo $TWILIO_SID
echo $TWILIO_TOKEN

# Probar credenciales en https://www.twilio.com/console
```

### "Cannot connect to localhost:3000 desde app"
```bash
# 1. Verificar que backend está corriendo
lsof -i :3000

# 2. Cambiar API_URL a tu IP local, NO localhost
# En App.jsx: const API_URL = '192.168.1.100:3000'

# 3. Verificar que Android/iOS puede alcanzar esa IP
adb shell ping 192.168.1.100
```

### "GPS no funciona en emulador"
```bash
# Android Studio -> Emulator settings -> Extended controls -> Location
# Enviar coordenadas test: -26.8213, -65.2038

# O en CLI:
adb emu geo fix -26.8213 -65.2038
```

---

## 📊 FLUJO DE USO BÁSICO

```
1. [Notificador] Abre app
2. [Notificador] Login con notifier@example.com / demo123
3. [Notificador] Ve lista de 50 próximas notificaciones
4. [Notificador] Selecciona una y toca "Ir"
5. [Notificador] 
   - 📸 Captura foto (o URL fake en emulador)
   - ✍️ Dibuja firma en pantalla
   - 📍 GPS se captura automáticamente
6. [Notificador] Toca "✓ Enviar Notificación"
7. [Backend] Genera token + QR único
8. [Twilio] Envía SMS al ciudadano con link de pago
9. [Notificador] Ve confirmación con QR y link
10. [Admin] Descarga reporte CSV con auditoría completa
```

---

## 🎯 PRÓXIMAS ACCIONES

Cuando todo funcione:

1. **Capacitar operadores** (1 día)
2. **Testing con datos reales** (3 días)
3. **Ajustes basados en feedback** (2-3 días)
4. **Go-live** (1 semana)

Fase 2 (si es necesario):
- Motor de rutas inteligente
- Dashboard admin en tiempo real
- Integraciones adicionales

---

## 📞 EN CASO DE PROBLEMAS

Recopila y comparte:
1. Versión de Node.js: `node --version`
2. Error exacto con stack trace
3. Tu IP local: `ipconfig` (Windows) o `ifconfig` (Mac/Linux)
4. ¿Dónde falló? (Backend/App/Twilio)

```bash
# Exportar logs para debugging
npm start 2>&1 | tee backend.log
```

---

**¡Listo! Deberías tener un sistema funcional en 15-20 minutos.**

Cualquier duda, los archivos de código están bien documentados. 🚀
