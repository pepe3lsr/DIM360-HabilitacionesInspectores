# Guia para Pasar a Produccion

## Estado Actual del Sistema

### Ya implementado y funcionando

| Componente | Estado | Detalle |
|---|---|---|
| BD SQLite persistente | OK | Archivo `data/epen.db` (persiste entre reinicios) |
| API REST completa | OK | 25+ endpoints con Express |
| Autenticacion JWT | OK | Login, middleware `verifyToken` y `verifyAdmin` |
| Passwords hasheados | OK | bcryptjs |
| Importacion CSV | OK | Carga masiva con campos EPEN |
| Asignacion por zona | OK | Individual y masiva |
| Panel Admin completo | OK | Dashboard, CRUD, paginacion, filtros, exportacion |
| App movil (Expo Snack) | OK | Login, listado, filtros, busqueda, detalle |
| Captura de foto | OK | Camara real con `expo-image-picker` |
| Captura GPS | OK | `expo-location` con alta precision |
| Firma digital tactil | OK | Canvas SVG con PanResponder |
| Constancia publica | OK | `/verificar/:token` con QR, foto, firma, GPS |
| Fecha/hora Argentina | OK | Timezone `America/Argentina/Buenos_Aires` |
| Fotos y firmas | OK | Base64 completo en BD + archivos en `data/captures/` |

### Pendiente para produccion

| Item | Prioridad | Detalle |
|---|---|---|
| DEMO_MODE = false | Alta | Desactivar modo demo en la app |
| API_URL real | Alta | Apuntar la app al servidor de produccion |
| JWT_SECRET seguro | Alta | Cambiar clave por defecto en `.env` |
| Credenciales admin | Alta | Cambiar admin/admin123 por defecto |
| HTTPS / SSL | Alta | Certificado para el dominio |
| SMS con Twilio | Media | Configurar credenciales reales |
| Rate limiting | Media | Proteccion contra fuerza bruta |
| CORS restrictivo | Media | Limitar origenes permitidos |
| Backups automaticos | Media | Copia periodica de `data/epen.db` |
| Compilar APK | Baja | Build con EAS para distribucion |

---

## Paso 1: Configurar el Servidor

### 1.1 Variables de entorno

Crear archivo `.env` en la raiz del proyecto:

```bash
# Seguridad
JWT_SECRET=clave-secreta-de-al-menos-32-caracteres-aqui
NODE_ENV=production

# Twilio (opcional, para SMS)
TWILIO_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_TOKEN=tu-auth-token-real
TWILIO_PHONE=+5491112345678

# Puerto (opcional, default 3000)
PORT=3000
```

El servidor ya carga variables de entorno con `process.env`. El `.env` ya esta en `.gitignore`.

### 1.2 Instalar PM2 (process manager)

```bash
npm install -g pm2

# Iniciar el servidor
pm2 start server.js --name epen-notificaciones

# Que arranque con el sistema
pm2 startup
pm2 save

# Comandos utiles
pm2 status          # Ver estado
pm2 logs epen-notificaciones  # Ver logs
pm2 restart epen-notificaciones  # Reiniciar
```

### 1.3 Configurar Nginx como reverse proxy

Instalar Nginx y crear configuracion:

```nginx
# /etc/nginx/sites-available/epen
server {
    listen 80;
    server_name tu-dominio.com;

    # Redirigir a HTTPS
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name tu-dominio.com;

    ssl_certificate /etc/letsencrypt/live/tu-dominio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tu-dominio.com/privkey.pem;

    client_max_body_size 50M;  # Para fotos base64

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/epen /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 1.4 Certificado SSL con Let's Encrypt

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d tu-dominio.com
# Se renueva automaticamente
```

---

## Paso 2: Conectar la App Movil

### 2.1 Desactivar modo demo

En `App.snack.jsx`, cambiar linea 21:

```javascript
const DEMO_MODE = false;
```

### 2.2 Configurar URL del backend

En `App.snack.jsx`, cambiar linea 20:

```javascript
// Desarrollo local (misma red WiFi):
const API_URL = 'http://192.168.1.100:3000';

// Produccion (con dominio y HTTPS):
const API_URL = 'https://tu-dominio.com';
```

Para obtener tu IP local en desarrollo:
- Windows: `ipconfig` (buscar IPv4)
- Linux/Mac: `hostname -I`

### 2.3 Compilar APK para distribucion (opcional)

Si queres distribuir la app fuera de Expo Go:

```bash
npm install -g eas-cli
eas login
eas build --platform android --profile preview
```

Esto genera un APK que se puede instalar directamente en los celulares de los notificadores.

---

## Paso 3: Seguridad

### 3.1 Cambiar credenciales por defecto

Al iniciar por primera vez, el servidor crea un admin con `admin@epen.gov.ar / admin123`. Cambia la contrasena inmediatamente desde el panel o la base de datos.

### 3.2 Rate limiting

Instalar y configurar en `server.js`:

```bash
npm install express-rate-limit
```

```javascript
const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10, // maximo 10 intentos
  message: { error: 'Demasiados intentos, intente en 15 minutos' }
});

app.use('/auth/login', loginLimiter);
```

### 3.3 CORS restrictivo

En `server.js`, reemplazar `app.use(cors())` por:

```javascript
app.use(cors({
  origin: ['https://tu-dominio.com', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

### 3.4 Firewall

```bash
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP (redirige a HTTPS)
sudo ufw allow 443   # HTTPS
sudo ufw enable
```

---

## Paso 4: Backups

### 4.1 Script de backup

Crear `backup.sh`:

```bash
#!/bin/bash
BACKUP_DIR="/home/epen/backups"
DB_PATH="/home/epen/notificadores/data/epen.db"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR
cp $DB_PATH "$BACKUP_DIR/epen_$DATE.db"

# Mantener solo los ultimos 30 backups
ls -t $BACKUP_DIR/epen_*.db | tail -n +31 | xargs rm -f 2>/dev/null

echo "Backup completado: epen_$DATE.db"
```

### 4.2 Programar con cron

```bash
chmod +x backup.sh
crontab -e
# Agregar: backup diario a las 3 AM
0 3 * * * /home/epen/notificadores/backup.sh
```

---

## Paso 5: SMS con Twilio (opcional)

1. Crear cuenta en https://www.twilio.com/
2. Obtener Account SID, Auth Token y un numero de telefono
3. Configurar en `.env`:
   ```
   TWILIO_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   TWILIO_TOKEN=tu-auth-token
   TWILIO_PHONE=+5491112345678
   ```
4. Reiniciar el servidor. Twilio se activa automaticamente si las credenciales son validas.

---

## Checklist de Deploy

### Pre-deploy
- [ ] Crear archivo `.env` con `JWT_SECRET` seguro
- [ ] Cambiar credenciales admin por defecto
- [ ] Verificar que `.env` esta en `.gitignore`
- [ ] Probar importacion CSV con datos reales

### Servidor
- [ ] Instalar Node.js >= 16 en el servidor
- [ ] Clonar repo: `git clone https://github.com/pepe3lsr/notificadores.git`
- [ ] `npm install`
- [ ] Crear `.env` con variables de produccion
- [ ] Configurar PM2
- [ ] Configurar Nginx + SSL
- [ ] Configurar firewall
- [ ] Configurar backups automaticos

### App Movil
- [ ] Cambiar `DEMO_MODE = false`
- [ ] Configurar `API_URL` con dominio/IP real
- [ ] Probar login contra backend real
- [ ] Probar captura completa (foto + GPS + firma)
- [ ] Verificar que la constancia se genera correctamente
- [ ] (Opcional) Compilar APK con EAS Build

### Post-deploy
- [ ] Verificar acceso al panel admin
- [ ] Importar primer lote de notificaciones reales
- [ ] Crear usuarios notificadores reales
- [ ] Probar ciclo completo: importar -> asignar -> notificar -> verificar
- [ ] Configurar Twilio si se necesita SMS

---

## Arquitectura en Produccion

```
Internet
    |
    v
[Nginx + SSL]  (puerto 443)
    |
    v
[Node.js + Express]  (puerto 3000, solo localhost)
    |
    v
[SQLite: data/epen.db]
[Capturas: data/captures/]
```

## Documentacion Relacionada

- [README.md](README.md) - Documentacion general del proyecto
- [PANEL_ADMIN.md](PANEL_ADMIN.md) - Guia del panel de administracion
- [INSTRUCCIONES_APP.md](INSTRUCCIONES_APP.md) - Guia de la app movil
- [QUICKSTART.md](QUICKSTART.md) - Inicio rapido
