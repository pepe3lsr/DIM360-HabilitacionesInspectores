# 🚀 Cómo Usar la App en Expo Snack

## Método 1: Copiar y Pegar con Dependencias Incluidas

### Paso 1: Ir a Expo Snack
Abre tu navegador y ve a: **https://snack.expo.dev/**

### Paso 2: Reemplazar App.js
1. En el panel izquierdo, busca el archivo `App.js`
2. **Borra** todo su contenido
3. **Copia** todo el contenido de `App.snack.jsx`
4. **Pega** en `App.js`

### Paso 3: Agregar package.json
1. En el panel izquierdo, busca `package.json`
2. Click para abrirlo
3. Busca la sección `"dependencies":`
4. Agrega esta línea dentro de las dependencias:

```json
"expo-image-picker": "~15.0.7"
```

**Ejemplo de cómo debería verse:**

```json
{
  "dependencies": {
    "react-native-paper": "4.9.2",
    "@expo/vector-icons": "^13.0.0",
    "expo-image-picker": "~15.0.7",
    "react-native-screens": "~3.22.0"
  }
}
```

### Paso 4: Guardar y Esperar
1. Expo Snack instalará automáticamente la dependencia
2. Verás un mensaje "Installing dependencies..."
3. Espera a que termine (10-30 segundos)

### Paso 5: ¡Probar!
- La app se cargará automáticamente en el preview
- Usa las credenciales: `notifier@example.com` / `demo123`

---

## Método 2: Copiar package.json Completo

### Opción más rápida:

1. Ve a https://snack.expo.dev/
2. Abre `package.json` en Snack
3. **Reemplaza TODO** el contenido con este:

```json
{
  "name": "epen-notificaciones",
  "version": "1.0.0",
  "dependencies": {
    "expo-image-picker": "~15.0.7"
  }
}
```

4. Luego reemplaza `App.js` con el contenido de `App.snack.jsx`
5. ¡Listo!

---

## Método 3: URL Directa (Si tienes cuenta en Expo)

Si ya subiste el código a Expo Snack:

1. Ve a tu Snack
2. Click en "Share"
3. Copia el link
4. Compártelo con quien quieras

Ejemplo: `https://snack.expo.dev/@tu-usuario/epen-notificaciones`

---

## 📱 Probar en tu Teléfono

### Android:

1. Descarga **Expo Go** desde Google Play Store
2. En Expo Snack, busca el QR en la parte inferior
3. Abre Expo Go → "Scan QR Code"
4. Escanea el QR
5. ¡La app se abre en tu teléfono!

### iOS:

1. Descarga **Expo Go** desde App Store
2. En Expo Snack, busca el QR
3. Abre la app Cámara de iOS
4. Apunta al QR
5. Toca la notificación que aparece
6. Se abre en Expo Go

---

## ✅ Checklist de Verificación

Antes de probar, verifica que:

- [ ] `expo-image-picker` está en package.json
- [ ] No hay errores en la consola de Snack (parte inferior)
- [ ] La app se ve en el preview del navegador
- [ ] El modo DEMO está activado (`DEMO_MODE = true` en línea 19)

---

## 🎯 Funcionalidades Disponibles en Expo Snack

### ✅ Funcionan Perfectamente:
- Login con validación
- Lista de 8 notificaciones
- Navegación entre pantallas
- Captura de GPS (simulado)
- **Firma táctil en pantalla** ← Dibuja con el mouse/dedo
- **Cámara** ← Solo en dispositivo físico con Expo Go

### ⚠️ Limitaciones en Preview Web:
- Cámara: No funciona en preview web, solo en Expo Go
- GPS Real: Requiere dispositivo físico

### 💡 Recomendación:
**Para probar TODO completo, usa Expo Go en tu teléfono**

---

## 🐛 Solución de Problemas

### Error: "Cannot find module 'expo-image-picker'"

**Solución:**
```json
// En package.json, agrega:
"expo-image-picker": "~15.0.7"
```

### Error: "Syntax Error" o código no funciona

**Solución:**
1. Verifica que copiaste TODO el código de App.snack.jsx
2. No debe haber código extra al inicio o final
3. Debe empezar con: `import React, { useState...`
4. Debe terminar con: `});` (del StyleSheet)

### La app no carga en el preview

**Solución:**
1. Verifica la consola (panel inferior) para ver errores
2. Revisa que package.json tiene `expo-image-picker`
3. Espera a que termine de instalar dependencias
4. Refresca la página de Snack (F5)

### Cámara no funciona

**Normal en preview web**
- La cámara solo funciona en dispositivo físico con Expo Go
- En el preview web mostrará error
- Usa Expo Go en tu teléfono para probarla

---

## 📋 Código Completo de package.json para Copiar

```json
{
  "name": "epen-notificaciones-app",
  "version": "1.0.0",
  "description": "App móvil EPEN Neuquén",
  "main": "App.js",
  "dependencies": {
    "expo-image-picker": "~15.0.7"
  }
}
```

---

## 🎉 ¡Todo Listo!

Ahora deberías poder:

1. ✅ Hacer login
2. ✅ Ver lista de notificaciones de Neuquén
3. ✅ Seleccionar una notificación
4. ✅ Capturar GPS (automático)
5. ✅ **Tomar foto con la cámara** (en Expo Go)
6. ✅ **Firmar en pantalla con el dedo**
7. ✅ Enviar notificación
8. ✅ Ver confirmación con QR

---

**Credenciales de prueba:**
- Email: `notifier@example.com`
- Password: `demo123`

**¡Disfruta la app!** 🚀
