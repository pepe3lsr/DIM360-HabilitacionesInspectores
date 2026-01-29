# DIM360 Inspecciones - App Móvil

Aplicación móvil para inspectores del sistema DIM360 de la Municipalidad de San Miguel de Tucumán.

---

## Requisitos Previos

- Node.js 18+ instalado
- Cuenta en [Expo.dev](https://expo.dev) (gratuita)
- (Opcional) Android Studio para emulador local

---

## Instalación

```bash
cd mobile-app

# Instalar dependencias
npm install

# Instalar EAS CLI globalmente
npm install -g eas-cli
```

---

## Configuración

### 1. Configurar URL del Servidor

Editar el archivo `config.js`:

```javascript
// Para desarrollo (usar IP de tu PC en la red local)
export const API_URL = 'http://192.168.1.100:4000';

// Para producción
export const API_URL = 'https://dim360.smt.gob.ar';
```

### 2. Iniciar sesión en Expo

```bash
eas login
```

### 3. Configurar proyecto en Expo

```bash
eas build:configure
```

Esto generará un `projectId` único. Actualizar `app.json` con el ID:

```json
"extra": {
  "eas": {
    "projectId": "tu-project-id-aqui"
  }
}
```

---

## Compilación

### Opción 1: Generar APK para pruebas (Recomendado para empezar)

```bash
npm run build:android:apk
```

o directamente:

```bash
eas build --platform android --profile preview
```

Esto genera un archivo `.apk` que se puede instalar directamente en cualquier dispositivo Android.

### Opción 2: Generar App Bundle para Play Store

```bash
npm run build:android
```

o:

```bash
eas build --platform android --profile production
```

Genera un `.aab` para subir a Google Play Store.

### Opción 3: Compilación Local (requiere Android Studio)

```bash
npx expo run:android
```

---

## Proceso de Build con EAS

1. El build se ejecuta en los servidores de Expo (cloud)
2. Tarda aproximadamente 10-15 minutos
3. Al finalizar, recibirás un link para descargar el APK
4. También puedes ver el estado en: https://expo.dev/accounts/TU_USUARIO/projects/dim360-inspecciones/builds

---

## Distribución a los Inspectores

### Método 1: Instalación directa del APK

1. Generar el APK con `eas build --platform android --profile preview`
2. Descargar el APK desde el link que proporciona EAS
3. Enviar el APK a los inspectores (email, Drive, etc.)
4. Los inspectores deben habilitar "Instalar desde fuentes desconocidas" en su dispositivo
5. Instalar el APK

### Método 2: Expo Go (para pruebas rápidas)

1. Los inspectores instalan **Expo Go** desde Play Store
2. Ejecutar `npx expo start` en la PC
3. Escanear el código QR con Expo Go
4. La app se carga directamente (requiere estar en la misma red WiFi)

### Método 3: Google Play Store (producción)

1. Generar App Bundle: `eas build --platform android --profile production`
2. Crear cuenta de desarrollador en Google Play ($25 USD única vez)
3. Subir el `.aab` a Google Play Console
4. Los inspectores instalan desde Play Store

---

## Actualizaciones

### Actualización OTA (Over-The-Air)

Para cambios de JavaScript sin recompilar:

```bash
eas update --branch production
```

Los usuarios reciben la actualización automáticamente.

### Nueva versión completa

1. Incrementar `version` en `app.json`
2. Incrementar `versionCode` en `app.json` > `android`
3. Ejecutar nuevo build
4. Distribuir nuevo APK o subir a Play Store

---

## Desarrollo Local

### Iniciar servidor de desarrollo

```bash
npm start
```

### Probar en emulador Android

```bash
npm run android
```

### Probar en dispositivo físico

1. Instalar Expo Go en el celular
2. Ejecutar `npm start`
3. Escanear QR con Expo Go

---

## Estructura de Archivos

```
mobile-app/
├── App.js              # Código principal de la app
├── config.js           # Configuración (API_URL)
├── app.json            # Configuración de Expo
├── eas.json            # Configuración de EAS Build
├── package.json        # Dependencias
├── babel.config.js     # Configuración de Babel
└── assets/
    ├── icon.png        # Icono de la app
    ├── splash.png      # Pantalla de carga
    └── adaptive-icon.png
```

---

## Solución de Problemas

### Error "Network request failed"

- Verificar que el servidor esté corriendo
- Verificar que `API_URL` en `config.js` sea correcto
- Si usas IP local, verificar que el celular esté en la misma red WiFi

### Error al compilar

```bash
# Limpiar cache
npx expo start -c

# Reinstalar dependencias
rm -rf node_modules
npm install
```

### La app no se instala en el celular

- Verificar que "Instalar desde fuentes desconocidas" esté habilitado
- En Android 8+: Configuración > Apps > Permisos especiales > Instalar apps desconocidas

---

## Personalización

### Cambiar icono de la app

1. Crear imagen PNG de 1024x1024 píxeles
2. Reemplazar `assets/icon.png`
3. Recompilar la app

### Cambiar colores

Editar los estilos en `App.js`, sección `StyleSheet.create({...})`

---

## Contacto

Para soporte técnico contactar al equipo de desarrollo.

---

**DIM360** - Dirección de Ingresos Municipales | Municipalidad de San Miguel de Tucumán
