# 📱 Instrucciones de la App - Sistema de Notificaciones EPEN

## 🎯 Cambios Implementados

### 1. **Direcciones actualizadas a Neuquén**
✅ Todas las notificaciones ahora usan direcciones de la provincia de Neuquén:
- Neuquén Capital
- Plottier
- Centenario
- Cutral-Có
- Villa La Angostura
- San Martín de los Andes
- Zapala

### 2. **Captura de Firma Táctil**
✅ El ciudadano ahora firma directamente en la pantalla:
- Pantalla modal en blanco para firmar
- Dibuja con el dedo o stylus
- Botón "Limpiar" para rehacer la firma
- Botón "Guardar Firma" para confirmar
- Validación: no permite guardar firma vacía

### 3. **Captura de Foto con Cámara Real**
✅ Abre la cámara del dispositivo para tomar la foto:
- Solicita permisos de cámara automáticamente
- Permite editar/recortar la foto
- Calidad optimizada (80%)
- Formato 4:3

## 📋 Dependencias Necesarias en Expo Snack

Para que funcione correctamente, debes agregar esta dependencia en Expo Snack:

```
expo-image-picker
```

**Cómo agregar en Expo Snack:**
1. Ve al panel izquierdo
2. Click en "Dependencies" o el icono de paquete
3. Busca: `expo-image-picker`
4. Click en "Add to project"

## 🚀 Flujo de Uso de la App

### **1. Login**
- Email: `notifier@example.com`
- Password: `demo123`
- Validación de campos y formato

### **2. Lista de Notificaciones**
- 8 ciudadanos con direcciones de Neuquén
- Estadísticas: Pendientes vs Completadas
- Click en cualquier notificación para iniciar captura

### **3. Captura de Notificación**

#### 📍 **GPS (Automático)**
- Se captura automáticamente
- Coordenadas de Neuquén Capital: `-38.9516, -68.0591`
- Muestra checkmark verde ✓ cuando está listo

#### 📸 **Foto del Domicilio**
1. Click en "📸 Capturar Foto"
2. **Abre la cámara del dispositivo**
3. Toma la foto
4. Edita/recorta si es necesario
5. Confirma la foto
6. Preview se muestra debajo del botón

#### ✍️ **Firma del Ciudadano**
1. Click en "✍️ Capturar Firma"
2. **Abre pantalla modal para firmar**
3. Dibuja la firma con el dedo en el área blanca
4. Botones disponibles:
   - 🗑️ Limpiar: Borra todo y permite reiniciar
   - ✓ Guardar Firma: Confirma y cierra el modal
   - ✕ Cancelar: Cierra sin guardar

#### ✅ **Enviar Notificación**
- Botón se habilita solo cuando GPS, Foto y Firma están completos
- Envía todo al backend
- Genera token único HMAC-SHA256
- Muestra pantalla de confirmación

### **4. Confirmación**
- ✅ Mensaje de éxito
- 🔐 Token de verificación
- 📱 Código QR generado
- 💳 Link de pago (SMS enviado)
- Botón para volver a la lista

## 🔧 Diferencias: Modo Demo vs Modo Producción

### **Modo DEMO (actual - `DEMO_MODE = true`)**
- ✅ Cámara real funciona
- ✅ Firma táctil funciona
- ✅ GPS simulado (coordenadas fijas de Neuquén)
- ✅ No requiere backend
- ✅ Datos de prueba incluidos

### **Modo Producción (`DEMO_MODE = false`)**
- ✅ Cámara real funciona
- ✅ Firma táctil funciona
- 🌐 GPS real usando `expo-location`
- 🌐 Conecta al backend en `http://localhost:3000`
- 🌐 Requiere token JWT válido

## 📱 Probar en Dispositivo Físico

### **Opción 1: Expo Go (Recomendado)**
1. Descarga **Expo Go** desde:
   - [Google Play](https://play.google.com/store/apps/details?id=host.exp.exponent)
   - [App Store](https://apps.apple.com/app/expo-go/id982107779)

2. En Expo Snack:
   - Click en "My Device" en la barra inferior
   - Escanea el QR con Expo Go (Android) o Cámara (iOS)

3. La app se abre en tu teléfono con **cámara real funcionando**

### **Opción 2: Emulador**
- **Android Studio**: Emulador tiene cámara simulada
- **iOS Simulator**: Cámara limitada en simulador

## ⚠️ Permisos Necesarios

La app solicita automáticamente:
- ✅ **Cámara**: Para tomar fotos del domicilio
- ⏳ **Ubicación**: Solo en modo producción (GPS real)

Si los permisos son denegados:
- Muestra alerta informativa
- Permite reintentar la acción

## 🎨 Características de UX

### **Feedback Visual**
- Checkmarks verdes ✓ cuando se completa cada paso
- Botones cambian de color (azul → verde) al capturar
- Preview de la foto capturada
- Estadísticas en tiempo real

### **Validaciones**
- No permite login sin email válido
- No permite firma vacía
- Botón "Enviar" deshabilitado hasta completar todo
- Mensajes de error claros con emojis

### **Navegación Intuitiva**
- Botones "← Volver" en cada pantalla
- Modal de firma se cierra con "✕ Cancelar"
- Flujo lineal: Login → Lista → Captura → Confirmación

## 🔐 Datos de Prueba

### **8 Notificaciones Demo**
```
1. Juan Pérez - Av. Argentina 1234, Neuquén Capital - $15,000
2. María García - Calle San Martín 567, Plottier - $12,500
3. Carlos López - Rivadavia 890, Centenario - $8,750
4. Ana Rodríguez - Belgrano 234, Cutral-Có - $20,000
5. Roberto Fernández - Av. Olascoaga 456, Neuquén Capital - $9,500
6. Laura Martínez - Sarmiento 789, Villa La Angostura - $18,200
7. Diego Gómez - Mitre 123, San Martín de los Andes - $11,750
8. Silvia Romero - Córdoba 345, Zapala - $14,300
```

## 🐛 Troubleshooting

### **"Cannot find module 'expo-image-picker'"**
**Solución:** Agregar dependencia en Expo Snack (ver arriba)

### **"Camera permission denied"**
**Solución:**
- En Expo Go: Settings → Permissions → Camera → Allow
- En Android: Settings → Apps → Expo Go → Permissions → Camera

### **"Signature not saving"**
**Solución:** Asegúrate de dibujar algo en el canvas antes de "Guardar"

### **"GPS shows wrong location"**
**Solución:** En modo demo, GPS es fijo. Para GPS real, cambiar `DEMO_MODE = false` y usar `expo-location`

## 📞 Contacto y Soporte

Si encuentras algún problema:
1. Revisa que `expo-image-picker` esté instalado
2. Verifica permisos de cámara en tu dispositivo
3. Revisa la consola de Expo Snack para errores

---

**¡Listo!** La app ahora usa:
- ✅ Direcciones de Neuquén
- ✅ Cámara real del dispositivo
- ✅ Firma táctil en pantalla

**Para probar:** Copia [App.snack.jsx](App.snack.jsx) en https://snack.expo.dev/
