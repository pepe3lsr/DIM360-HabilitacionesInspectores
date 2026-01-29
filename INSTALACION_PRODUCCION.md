# Guía de Instalación en Producción - DIM360

Guía completa para instalar el sistema DIM360 en los servidores de la Municipalidad de San Miguel de Tucumán.

---

## 1. Requisitos del Servidor

### Hardware Mínimo
- CPU: 2 cores
- RAM: 2 GB
- Disco: 20 GB (para base de datos y fotos de inspecciones)

### Software
- **Sistema Operativo**: Ubuntu 22.04 LTS / Windows Server 2019+
- **Node.js**: 18.x o superior (recomendado: 20 LTS)
- **npm**: incluido con Node.js
- **PM2**: para gestión de procesos (opcional pero recomendado)
- **Nginx**: como reverse proxy (opcional pero recomendado)

---

## 2. Instalación en Linux (Ubuntu/Debian)

### 2.1 Instalar Node.js

```bash
# Instalar Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verificar instalación
node --version  # Debe mostrar v20.x.x
npm --version
```

### 2.2 Instalar PM2 (gestor de procesos)

```bash
sudo npm install -g pm2
```

### 2.3 Crear usuario para la aplicación

```bash
sudo useradd -m -s /bin/bash dim360
sudo mkdir -p /opt/dim360
sudo chown dim360:dim360 /opt/dim360
```

### 2.4 Clonar/copiar el proyecto

```bash
# Opción 1: Clonar desde git
sudo -u dim360 git clone <URL_REPOSITORIO> /opt/dim360

# Opción 2: Copiar archivos manualmente
sudo cp -r /ruta/origen/* /opt/dim360/
sudo chown -R dim360:dim360 /opt/dim360
```

### 2.5 Instalar dependencias

```bash
cd /opt/dim360
sudo -u dim360 npm install --production
```

### 2.6 Configurar variables de entorno

```bash
# Crear archivo .env
sudo -u dim360 nano /opt/dim360/.env
```

Contenido del archivo `.env`:

```env
PORT=4000
JWT_SECRET=clave-secreta-muy-larga-y-segura-cambiar-en-produccion
NODE_ENV=production
```

**IMPORTANTE**: Cambiar `JWT_SECRET` por una clave segura única.

### 2.7 Crear directorios de datos

```bash
sudo -u dim360 mkdir -p /opt/dim360/data/captures
sudo -u dim360 mkdir -p /opt/dim360/uploads
```

### 2.8 Iniciar con PM2

```bash
cd /opt/dim360
sudo -u dim360 pm2 start server.js --name dim360

# Guardar configuración para reinicio automático
sudo -u dim360 pm2 save
sudo -u dim360 pm2 startup systemd -u dim360 --hp /home/dim360
```

### 2.9 Verificar que funciona

```bash
curl http://localhost:4000
# Debe responder con JSON del sistema
```

---

## 3. Configuración de Nginx (Reverse Proxy)

### 3.1 Instalar Nginx

```bash
sudo apt-get install -y nginx
```

### 3.2 Crear configuración del sitio

```bash
sudo nano /etc/nginx/sites-available/dim360
```

Contenido:

```nginx
server {
    listen 80;
    server_name dim360.smt.gob.ar;  # Cambiar por dominio real

    # Límite para subida de archivos (fotos)
    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 3.3 Activar sitio

```bash
sudo ln -s /etc/nginx/sites-available/dim360 /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 3.4 Configurar HTTPS con Let's Encrypt (recomendado)

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d dim360.smt.gob.ar
```

---

## 4. Instalación en Windows Server

### 4.1 Instalar Node.js

1. Descargar instalador desde https://nodejs.org/
2. Ejecutar instalador con opciones por defecto
3. Verificar en PowerShell:
   ```powershell
   node --version
   npm --version
   ```

### 4.2 Instalar PM2

```powershell
npm install -g pm2
```

### 4.3 Copiar archivos del proyecto

```powershell
# Crear directorio
mkdir C:\dim360

# Copiar archivos (ajustar ruta de origen)
xcopy /E /I "D:\proyecto\DIM-HabilitacionesInspectores" "C:\dim360"
```

### 4.4 Instalar dependencias

```powershell
cd C:\dim360
npm install --production
```

### 4.5 Configurar variables de entorno

Crear archivo `C:\dim360\.env`:

```env
PORT=4000
JWT_SECRET=clave-secreta-muy-larga-y-segura-cambiar-en-produccion
NODE_ENV=production
```

### 4.6 Iniciar con PM2

```powershell
cd C:\dim360
pm2 start server.js --name dim360

# Configurar inicio automático con Windows
pm2 save
pm2-startup install
```

### 4.7 Configurar Firewall

```powershell
# Permitir puerto 4000 (o el que use)
New-NetFirewallRule -DisplayName "DIM360" -Direction Inbound -LocalPort 4000 -Protocol TCP -Action Allow
```

---

## 5. Configuración de la App Móvil

### 5.1 Cambiar URL del servidor

En el archivo `App.snack.jsx`, buscar y modificar:

```javascript
const API_URL = 'https://dim360.smt.gob.ar';  // URL de producción
```

### 5.2 Compilar para distribución

La app está diseñada para Expo Snack. Para distribución:

1. Crear cuenta en https://expo.dev
2. Importar el proyecto
3. Generar APK/IPA desde Expo

---

## 6. Primer Uso del Sistema

### 6.1 Acceder al Panel de Administración

1. Abrir navegador: `https://dim360.smt.gob.ar/admin.html`
2. Iniciar sesión:
   - Email: `admin@dim.gob.ar`
   - Contraseña: `admin123`

### 6.2 Cambiar contraseña del administrador

**IMPORTANTE**: Cambiar la contraseña por defecto inmediatamente:

1. Ir a la pestaña "Inspectores"
2. Editar el usuario "Administrador"
3. Establecer nueva contraseña segura

### 6.3 Crear inspectores

1. Ir a pestaña "Inspectores"
2. Click en "Nuevo Inspector"
3. Completar datos (email, nombre, zona asignada)

### 6.4 Importar habilitaciones

1. Preparar archivo CSV con el formato requerido
2. Ir a pestaña "Importación"
3. Seleccionar archivo y cargar

---

## 7. Mantenimiento

### 7.1 Backup de la Base de Datos

```bash
# Linux
cp /opt/dim360/data/dim.db /backup/dim360_$(date +%Y%m%d).db

# Windows PowerShell
Copy-Item C:\dim360\data\dim.db C:\backup\dim360_$(Get-Date -Format "yyyyMMdd").db
```

**Recomendación**: Configurar backup automático diario con cron (Linux) o Task Scheduler (Windows).

### 7.2 Backup de Fotos

```bash
# Linux
tar -czf /backup/captures_$(date +%Y%m%d).tar.gz /opt/dim360/data/captures/

# Windows PowerShell
Compress-Archive -Path C:\dim360\data\captures\* -DestinationPath C:\backup\captures_$(Get-Date -Format "yyyyMMdd").zip
```

### 7.3 Ver logs

```bash
# PM2 logs
pm2 logs dim360

# Últimas 100 líneas
pm2 logs dim360 --lines 100
```

### 7.4 Reiniciar servicio

```bash
pm2 restart dim360
```

### 7.5 Actualizar el sistema

```bash
cd /opt/dim360
git pull origin main
npm install --production
pm2 restart dim360
```

---

## 8. Monitoreo

### 8.1 Estado del servicio

```bash
pm2 status
pm2 monit  # Monitor interactivo
```

### 8.2 Uso de recursos

```bash
pm2 info dim360
```

---

## 9. Solución de Problemas

### El servidor no inicia

```bash
# Ver logs de error
pm2 logs dim360 --err

# Verificar puerto en uso
netstat -tlnp | grep 4000  # Linux
netstat -ano | findstr :4000  # Windows
```

### Error de permisos en la base de datos

```bash
# Linux
sudo chown -R dim360:dim360 /opt/dim360/data
chmod 755 /opt/dim360/data
chmod 644 /opt/dim360/data/dim.db
```

### La app móvil no conecta

1. Verificar que la URL en `API_URL` sea correcta
2. Verificar que el servidor responda: `curl https://dim360.smt.gob.ar`
3. Verificar certificado SSL válido
4. Verificar que el firewall permita el tráfico

### Error "EADDRINUSE"

El puerto ya está en uso. Solución:

```bash
# Linux - encontrar proceso y terminarlo
lsof -i :4000
kill -9 <PID>

# Windows
netstat -ano | findstr :4000
taskkill /PID <PID> /F
```

---

## 10. Seguridad

### Checklist de Seguridad

- [ ] Cambiar `JWT_SECRET` en producción
- [ ] Cambiar contraseña del admin por defecto
- [ ] Configurar HTTPS con certificado válido
- [ ] Configurar firewall (solo puertos necesarios)
- [ ] Configurar backups automáticos
- [ ] Mantener Node.js actualizado
- [ ] Revisar logs periódicamente

### Puertos requeridos

| Puerto | Servicio | Dirección |
|--------|----------|-----------|
| 80 | HTTP (Nginx) | Entrante |
| 443 | HTTPS (Nginx) | Entrante |
| 4000 | Node.js (local) | Solo local |

---

## 11. Contacto y Soporte

Para soporte técnico contactar al equipo de desarrollo.

---

**DIM360** - Dirección de Ingresos Municipales | Municipalidad de San Miguel de Tucumán
