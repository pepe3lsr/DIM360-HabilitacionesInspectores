const express = require('express');
const cors = require('cors');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const twilio = require('twilio');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const sqlite3 = require('sqlite3').verbose();
const pdfParse = require('pdf-parse');
const bcrypt = require('bcryptjs');

const app = express();
const port = 3000;

// ============= CONFIGURACIÓN =============
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key';
const TWILIO_ACCOUNT_SID = process.env.TWILIO_SID || 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
const TWILIO_AUTH_TOKEN = process.env.TWILIO_TOKEN || 'your-token';
const TWILIO_PHONE = process.env.TWILIO_PHONE || '+1234567890';

// Inicializar Twilio solo si las credenciales son válidas
let client = null;
try {
  if (TWILIO_ACCOUNT_SID.startsWith('AC') && TWILIO_AUTH_TOKEN !== 'your-token') {
    client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
    console.log('Twilio inicializado correctamente');
  } else {
    console.log('Twilio no configurado - Modo de prueba sin SMS');
  }
} catch (err) {
  console.log('Error al inicializar Twilio:', err.message);
}

// BD SQLite persistente en archivo
const path = require('path');
const DB_PATH = path.join(__dirname, 'data', 'epen.db');
// Crear directorio data si no existe
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
const db = new sqlite3.Database(DB_PATH);
console.log(`Base de datos: ${DB_PATH}`);

app.use(express.json({ limit: '50mb' })); // Aumentar límite para imágenes base64
app.use(cors());
app.use(express.static('public', { setHeaders: (res, path) => {
  if (path.endsWith('.html')) res.setHeader('Content-Type', 'text/html; charset=utf-8');
}})); // Servir archivos estáticos desde /public
app.use('/data/captures', express.static(path.join(__dirname, 'data', 'captures'))); // Servir fotos y firmas

const upload = multer({ dest: 'uploads/' });

// ============= INICIALIZACIÓN BD =============
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY,
      email TEXT UNIQUE,
      password TEXT,
      role TEXT,
      name TEXT,
      zone TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY,
      citizen_name TEXT,
      citizen_phone TEXT,
      address TEXT,
      latitude REAL,
      longitude REAL,
      status TEXT DEFAULT 'pending',
      notifier_id INTEGER,
      photo_path TEXT,
      signature_path TEXT,
      token TEXT UNIQUE,
      qr_code TEXT,
      sms_sent BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      -- Campos EPEN
      nro_orden TEXT,
      suministro TEXT,
      nro_cliente TEXT,
      tipo_notificacion TEXT,
      nro_cronograma TEXT,
      correo TEXT,
      sucursal TEXT,
      zona TEXT,
      notified_at TIMESTAMP,
      import_batch_id INTEGER,
      FOREIGN KEY(notifier_id) REFERENCES users(id),
      FOREIGN KEY(import_batch_id) REFERENCES import_batches(id)
    )
  `);

  // Migration: add notified_at column if missing (for existing DBs)
  db.run(`ALTER TABLE notifications ADD COLUMN notified_at TIMESTAMP`, (err) => {
    // Ignore error if column already exists
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS import_batches (
      id INTEGER PRIMARY KEY,
      filename TEXT,
      nro_cronograma TEXT,
      correo TEXT,
      sucursal TEXT,
      total_records INTEGER,
      imported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS zones (
      id INTEGER PRIMARY KEY,
      name TEXT UNIQUE,
      description TEXT,
      localities TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS sync_queue (
      id INTEGER PRIMARY KEY,
      notification_id INTEGER,
      data TEXT,
      synced BOOLEAN DEFAULT FALSE,
      FOREIGN KEY(notification_id) REFERENCES notifications(id)
    )
  `);

  // Crear usuarios iniciales con contraseñas hasheadas
  const defaultUsers = [
    { id: 1, email: 'admin@epen.com', pass: 'admin123', role: 'admin', name: 'Administrador', zone: null },
    { id: 2, email: 'notifier@example.com', pass: 'demo123', role: 'notifier', name: 'Carlos Gómez', zone: 'PASO AGUERRE' },
    { id: 3, email: 'notifier2@example.com', pass: 'demo123', role: 'notifier', name: 'María López', zone: 'NEUQUEN CAPITAL' },
    { id: 4, email: 'notifier3@example.com', pass: 'demo123', role: 'notifier', name: 'Juan Rodríguez', zone: 'S. P. CHANAR' },
    { id: 5, email: 'notifier4@example.com', pass: 'demo123', role: 'notifier', name: 'Ana Fernández', zone: 'CENTENARIO' },
  ];
  for (const u of defaultUsers) {
    db.get('SELECT id, password FROM users WHERE id = ?', [u.id], (err, row) => {
      if (!row) {
        const hash = bcrypt.hashSync(u.pass, 10);
        db.run('INSERT INTO users (id, email, password, role, name, zone) VALUES (?,?,?,?,?,?)',
          [u.id, u.email, hash, u.role, u.name, u.zone]);
      } else if (row.password && !row.password.startsWith('$2')) {
        // Migrar contraseña plana a hash
        const hash = bcrypt.hashSync(row.password, 10);
        db.run('UPDATE users SET password = ? WHERE id = ?', [hash, row.id]);
      }
    });
  }

  // Zonas predeterminadas basadas en los PDFs
  db.run(`INSERT OR IGNORE INTO zones (id, name, description, localities) VALUES (1, 'PASO AGUERRE', 'Paso Aguerre y alrededores', 'PASO AGUERRE,PASO AGUER')`);
  db.run(`INSERT OR IGNORE INTO zones (id, name, description, localities) VALUES (2, 'NEUQUEN CAPITAL', 'Neuquén Capital', 'NEUQUEN,NEUQUÉN')`);
  db.run(`INSERT OR IGNORE INTO zones (id, name, description, localities) VALUES (3, 'S. P. CHANAR', 'San Patricio del Chañar y Centenario', 'S. P. CHANAR,CHAîAR,CHAÑAR,CENTENARIO')`);
  db.run(`INSERT OR IGNORE INTO zones (id, name, description, localities) VALUES (4, 'CENTENARIO', 'Centenario', 'CENTENARIO')`);
  db.run(`INSERT OR IGNORE INTO zones (id, name, description, localities) VALUES (5, 'C.A.B.A.', 'Capital Federal', 'C.A.B.A.')`);
});

// ============= RUTA RAÍZ =============
app.get('/', (req, res) => {
  res.json({
    name: 'Sistema Integral de Notificaciones Presenciales',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      auth: {
        login: 'POST /auth/login - Autenticación de usuario'
      },
      notifications: {
        assignments: 'GET /assignments - Obtener asignaciones (requiere token)',
        sync: 'POST /sync - Sincronizar notificación (requiere token)',
        report: 'GET /report - Descargar reporte CSV (requiere token)'
      },
      import: {
        csv: 'POST /import/csv - Importar datos desde CSV'
      }
    },
    docs: 'Ver QUICKSTART.md para instrucciones de uso'
  });
});

// ============= AUTENTICACIÓN =============
app.post('/auth/login', (req, res) => {
  const { email, password } = req.body;

  db.get(
    'SELECT * FROM users WHERE email = ?',
    [email],
    async (err, user) => {
      if (err || !user) {
        return res.status(401).json({ error: 'Credenciales inválidas' });
      }

      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        return res.status(401).json({ error: 'Credenciales inválidas' });
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role, name: user.name },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.json({
        token,
        user: { id: user.id, email: user.email, role: user.role, name: user.name }
      });
    }
  );
});

// Middleware de autenticación
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token faltante' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Token inválido' });
  }
};

// Middleware: verificar rol admin
const verifyAdmin = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token faltante' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== 'admin') return res.status(403).json({ error: 'Acceso denegado: se requiere rol admin' });
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Token inválido' });
  }
};

// ============= CARGA DE DATOS =============
app.post('/import/csv', upload.single('file'), (req, res) => {
  const results = [];
  
  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', () => {
      results.forEach((row) => {
        db.run(
          `
            INSERT INTO notifications 
            (citizen_name, citizen_phone, address, latitude, longitude, status) 
            VALUES (?, ?, ?, ?, ?, ?)
          `,
          [
            row.nombre,
            row.telefono,
            row.direccion,
            parseFloat(row.lat) || 0,
            parseFloat(row.lng) || 0,
            'pending'
          ]
        );
      });

      fs.unlinkSync(req.file.path);
      res.json({ 
        message: `${results.length} registros importados`,
        count: results.length 
      });
    });
});

// ============= LISTADO DE NOTIFICACIONES PARA NOTIFICADOR =============
app.get('/assignments', verifyToken, (req, res) => {
  db.all(
    `
      SELECT id, citizen_name, citizen_phone, address, latitude, longitude, status,
             nro_orden, suministro, nro_cliente, tipo_notificacion, nro_cronograma, correo, sucursal, zona, created_at, notified_at, token
      FROM notifications
      WHERE notifier_id = ?
      ORDER BY CASE status WHEN 'pending' THEN 0 WHEN 'in_progress' THEN 1 ELSE 2 END, created_at ASC
    `,
    [req.user.id],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(rows || []);
    }
  );
});

// ============= GENERACIÓN DE TOKEN Y QR =============
const generateToken = (gpsData, timestamp, notificationId) => {
  const dataToSign = `${gpsData.lat}:${gpsData.lng}:${timestamp}:${notificationId}`;
  const token = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(dataToSign)
    .digest('hex');
  return token;
};

const generateQR = (token) => {
  // QR apunta a la página pública de verificación
  const verifyUrl = `http://localhost:${port}/verificar/${token}`;
  return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(verifyUrl)}`;
};

// ============= SINCRONIZACIÓN OFFLINE =============
app.post('/sync', verifyToken, (req, res) => {
  const { notification_id, gps_lat, gps_lng, timestamp, photo_base64, signature_base64 } = req.body;

  // Generar token único
  const token = generateToken({ lat: gps_lat, lng: gps_lng }, timestamp, notification_id);
  const qr_url = generateQR(token);

  // Actualizar notificación
  db.run(
    `
      UPDATE notifications 
      SET status = ?, token = ?, qr_code = ?, latitude = ?, longitude = ?
      WHERE id = ?
    `,
    ['synced', token, qr_url, gps_lat, gps_lng, notification_id],
    (err) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      // Obtener datos para SMS
      db.get(
        'SELECT citizen_phone, citizen_name FROM notifications WHERE id = ?',
        [notification_id],
        (err, row) => {
          if (row && row.citizen_phone) {
            // Enviar SMS con link de pago
            const paymentLink = `https://pago.ejemplo.com/notificacion/${token}`;

            if (client) {
              client.messages
                .create({
                  body: `Estimado ${row.citizen_name}, ha recibido una notificación. Pague aquí: ${paymentLink}`,
                  from: TWILIO_PHONE,
                  to: row.citizen_phone
                })
                .then((message) => {
                  db.run(
                    'UPDATE notifications SET sms_sent = 1 WHERE id = ?',
                    [notification_id]
                  );
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
            payment_link: `https://pago.ejemplo.com/notificacion/${token}`,
            citizen_name: row ? row.citizen_name : null,
            timestamp: new Date().toLocaleString('es-AR')
          });
        }
      );
    }
  );
});

// ============= REPORTE =============
app.get('/report', verifyToken, (req, res) => {
  db.all(
    `
      SELECT 
        id, citizen_name, citizen_phone, address, status, 
        token, sms_sent, created_at
      FROM notifications
      ORDER BY created_at DESC
    `,
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      // Generar CSV
      let csv = 'ID,Ciudadano,Teléfono,Dirección,Estado,Token,SMS Enviado,Fecha\n';
      rows.forEach((row) => {
        csv += `${row.id},"${row.citizen_name}","${row.citizen_phone}","${row.address}",${row.status},${row.token},${row.sms_sent},${row.created_at}\n`;
      });

      res.header('Content-Type', 'text/csv');
      res.header('Content-Disposition', 'attachment; filename="reporte.csv"');
      res.send(csv);
    }
  );
});

// ============= ACTUALIZAR ESTADO =============
app.patch('/notification/:id', verifyToken, (req, res) => {
  const { status } = req.body;
  db.run(
    'UPDATE notifications SET status = ? WHERE id = ?',
    [status, req.params.id],
    (err) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ success: true });
    }
  );
});

// ============= PARSER DE PDFs EPEN =============

function parseEPENPdf(text) {
  // Extraer metadatos del encabezado
  let nroCronograma = '';
  let correo = '';
  let sucursal = '';

  const cronMatch = text.match(/Nro\s+Cronograma\s+(\d+)/i);
  if (cronMatch) nroCronograma = cronMatch[1];

  const correoMatch = text.match(/Correo:\s*(\S+)/i);
  if (correoMatch) correo = correoMatch[1];

  // El header puede ser "Sucursal:" (vacío), "Sucursal:      Contratista" o "Sucursal:  NOMBRE"
  const sucMatch = text.match(/Sucursal:\s*([A-Za-z0-9][\w\s]*?)(?:\s{2,}|Tipo|Contratista|Cliente|\n|$)/i);
  if (sucMatch) sucursal = sucMatch[1].trim();

  // El formato real del PDF extraído es:
  // IN ORDENATIVO DE       2421429  142313  1   18719 AGRUPACION MAPUCHE M
  // A  PASO AGUERRE 1  (8313) - PASO AGUERRE, CE
  // INTIMACION
  // ___... (separadores)
  //
  // Estrategia: buscar "IN ORDENATIVO DE" seguido de números en la misma línea,
  // luego recolectar líneas hasta "INTIMACION"

  const records = [];
  const lines = text.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Buscar línea que empiece con "IN ORDENATIVO DE" seguida de números
    const startMatch = line.match(/IN\s+ORDENATIVO\s+DE\s+(\d{7})\s+(\d+)\s+(\d+)\s+(\d+)\s+(.+)/);
    if (!startMatch) continue;

    const nroOrden = startMatch[1];
    const suministro = startMatch[2];
    // startMatch[3] es cantidad
    const nroCliente = startMatch[4];
    let restText = startMatch[5].trim();

    // Recolectar líneas siguientes hasta encontrar "INTIMACION" o siguiente "IN ORDENATIVO"
    let j = i + 1;
    while (j < lines.length) {
      const nextLine = lines[j].trim();
      if (nextLine === 'INTIMACION' || nextLine.match(/^IN\s+ORDENATIVO\s+DE\s+\d/)) break;
      if (nextLine && !nextLine.match(/^_+$/) && !nextLine.match(/^-+$/) && !nextLine.match(/^Fecha/) && !nextLine.match(/^E\.P\.E\.N/) && !nextLine.match(/^Hoja/) && !nextLine.match(/^Listado/) && !nextLine.match(/^Tipo Notificacion/) && !nextLine.match(/^Total Notificacio/)) {
        restText += ' ' + nextLine;
      }
      j++;
    }

    // Limpiar underscores pero MANTENER espacios múltiples para separar nombre/dirección
    restText = restText.replace(/_+/g, '').trim();

    // Separar nombre del cliente y domicilio
    // El texto tiene formato: "NOMBRE CLIENTE  DIRECCIÓN (CP) - LOCALIDAD"
    // La separación nombre/dirección usa 2+ espacios en el PDF original
    let citizenName = '';
    let address = '';
    let zona = '';

    // Buscar código postal (4 dígitos entre paréntesis)
    const cpIdx = restText.search(/\(\d{4}\)/);
    if (cpIdx > 0) {
      const beforeCp = restText.substring(0, cpIdx);
      const afterCp = restText.substring(cpIdx);

      // Buscar separación por 2+ espacios (el separador natural del PDF)
      const sepMatch = beforeCp.match(/^(.+?)\s{2,}(.+)$/);
      if (sepMatch) {
        citizenName = sepMatch[1].replace(/\s+/g, ' ').trim();
        address = (sepMatch[2] + afterCp).replace(/\s+/g, ' ').trim();
      } else {
        // Sin separador claro - la dirección probablemente empieza con patrón conocido
        const addrStart = beforeCp.match(/^(.+?)\s+((?:SIN DATO|PASO|LIMAY|AV[.\s]|BARRIO|LOTEO|CALLE|LAGO|VOLCAN|CERRO|FRAY|INTENDENTE|MENDOZA|BOULEVARD|ARROYO|RIO|PEHUEN|COIHUE|COMPLEJO|VILLA|MALVINAS|PICADA|LOS\s|GREGORIO|BONPLAND|HIPOLITO|PTE\.|ING\.|QUILI|COSTA|ARRAYANES|2\sDE).+)/i);
        if (addrStart) {
          citizenName = addrStart[1].replace(/\s+/g, ' ').trim();
          address = (addrStart[2] + afterCp).replace(/\s+/g, ' ').trim();
        } else {
          citizenName = beforeCp.replace(/\s+/g, ' ').trim();
          address = afterCp.replace(/\s+/g, ' ').trim();
        }
      }
    } else {
      const sepMatch = restText.match(/^(.+?)\s{2,}(.+)$/);
      if (sepMatch) {
        citizenName = sepMatch[1].replace(/\s+/g, ' ').trim();
        address = sepMatch[2].replace(/\s+/g, ' ').trim();
      } else {
        citizenName = restText.replace(/\s+/g, ' ').trim();
      }
    }

    // Extraer zona de la dirección
    const zonaMatch = address.match(/\(\d{4}\)\s*-\s*(.+?)(?:,|$)/);
    if (zonaMatch) {
      zona = zonaMatch[1].trim();
      // Normalizar zonas truncadas por el formato del PDF
      // Normalizar zonas truncadas por el ancho de columna del PDF
      const zonaNorm = [
        { match: /^PASO\s+AGUE/i, value: 'PASO AGUERRE' },
        { match: /^S\.\s*P\.\s*C/i, value: 'S. P. CHANAR' },
        { match: /^S\.\s*P\b/i, value: 'S. P. CHANAR' },
        { match: /^C\.A\.B\.A/i, value: 'C.A.B.A.' },
        { match: /^CEN/i, value: 'CENTENARIO' },
        { match: /^NEUQUE/i, value: 'NEUQUEN CAPITAL' },
        { match: /^PLOTTIE/i, value: 'PLOTTIER' },
      ];
      for (const {match, value} of zonaNorm) {
        if (match.test(zona)) { zona = value; break; }
      }
    }

    if (citizenName) {
      records.push({
        nro_orden: nroOrden,
        suministro: suministro,
        nro_cliente: nroCliente,
        citizen_name: citizenName,
        address: address,
        tipo_notificacion: 'IN ORDENATIVO DE INTIMACION',
        zona: zona
      });
    }
  }

  return {
    metadata: {
      nro_cronograma: nroCronograma,
      correo: correo,
      sucursal: sucursal
    },
    records: records
  };
}

// ============= IMPORTACIÓN DE PDFs EPEN =============
app.post('/api/import/pdf', verifyAdmin, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se proporcionó archivo PDF' });
    }

    // Leer y parsear el PDF
    const dataBuffer = fs.readFileSync(req.file.path);
    const pdfData = await pdfParse(dataBuffer);
    const parsed = parseEPENPdf(pdfData.text);

    // Crear batch de importación
    const batchId = await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO import_batches (filename, nro_cronograma, correo, sucursal, total_records)
         VALUES (?, ?, ?, ?, ?)`,
        [
          req.file.originalname,
          parsed.metadata.nro_cronograma,
          parsed.metadata.correo,
          parsed.metadata.sucursal,
          parsed.records.length
        ],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });

    // Insertar registros
    let inserted = 0;
    let duplicates = 0;

    for (const record of parsed.records) {
      try {
        await new Promise((resolve, reject) => {
          // Verificar duplicados por nro_orden
          db.get(
            'SELECT id FROM notifications WHERE nro_orden = ?',
            [record.nro_orden],
            (err, existing) => {
              if (err) return reject(err);

              if (existing) {
                duplicates++;
                return resolve();
              }

              db.run(
                `INSERT INTO notifications
                 (citizen_name, address, status, nro_orden, suministro, nro_cliente,
                  tipo_notificacion, nro_cronograma, correo, sucursal, zona, import_batch_id)
                 VALUES (?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                  record.citizen_name,
                  record.address,
                  record.nro_orden,
                  record.suministro,
                  record.nro_cliente,
                  record.tipo_notificacion,
                  parsed.metadata.nro_cronograma,
                  parsed.metadata.correo,
                  parsed.metadata.sucursal,
                  record.zona,
                  batchId
                ],
                function(err) {
                  if (err) reject(err);
                  else { inserted++; resolve(); }
                }
              );
            }
          );
        });
      } catch (e) {
        console.error('Error insertando registro:', e);
      }
    }

    // Limpiar archivo temporal
    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      batch_id: batchId,
      metadata: parsed.metadata,
      total_parsed: parsed.records.length,
      inserted: inserted,
      duplicates: duplicates,
      records_preview: parsed.records.slice(0, 5) // Preview de primeros 5
    });
  } catch (error) {
    console.error('Error procesando PDF:', error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: 'Error procesando el PDF: ' + error.message });
  }
});

// ============= GESTIÓN DE IMPORTACIONES =============
app.get('/api/import/batches', verifyAdmin, (req, res) => {
  db.all(
    `SELECT ib.*,
       (SELECT COUNT(*) FROM notifications WHERE import_batch_id = ib.id) as actual_records,
       (SELECT COUNT(*) FROM notifications WHERE import_batch_id = ib.id AND status != 'pending') as processed
     FROM import_batches ib
     ORDER BY ib.imported_at DESC`,
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows || []);
    }
  );
});

// ============= GESTIÓN DE NOTIFICADORES =============
// Listar todos los usuarios (con stats para notificadores)
app.get('/api/notifiers', verifyAdmin, (req, res) => {
  db.all(
    `SELECT u.id, u.email, u.name, u.zone, u.role,
       (SELECT COUNT(*) FROM notifications WHERE notifier_id = u.id AND status IN ('pending','in_progress')) as pending_count,
       (SELECT COUNT(*) FROM notifications WHERE notifier_id = u.id AND status IN ('synced','completed')) as completed_count
     FROM users u
     ORDER BY u.role, u.name`,
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows || []);
    }
  );
});

app.post('/api/notifiers', verifyAdmin, (req, res) => {
  const { email, password, name, zone, role } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ error: 'email, password y name son obligatorios' });
  }

  const hash = bcrypt.hashSync(password, 10);
  const userRole = role === 'admin' ? 'admin' : 'notifier';

  db.run(
    `INSERT INTO users (email, password, role, name, zone) VALUES (?, ?, ?, ?, ?)`,
    [email, hash, userRole, name, zone || null],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE')) {
          return res.status(400).json({ error: 'Ya existe un usuario con ese email' });
        }
        return res.status(500).json({ error: err.message });
      }
      res.json({ success: true, id: this.lastID });
    }
  );
});

// Editar usuario
app.put('/api/notifiers/:id', verifyAdmin, (req, res) => {
  const { email, name, zone, role, password } = req.body;
  const id = req.params.id;

  // No permitir editar al propio admin para no quedarse sin acceso
  db.get('SELECT * FROM users WHERE id = ?', [id], (err, user) => {
    if (err || !user) return res.status(404).json({ error: 'Usuario no encontrado' });

    const newEmail = email || user.email;
    const newName = name || user.name;
    const newZone = zone !== undefined ? zone : user.zone;
    const newRole = role || user.role;
    const newPass = password ? bcrypt.hashSync(password, 10) : user.password;

    db.run(
      `UPDATE users SET email = ?, name = ?, zone = ?, role = ?, password = ? WHERE id = ?`,
      [newEmail, newName, newZone, newRole, newPass, id],
      function(err) {
        if (err) {
          if (err.message.includes('UNIQUE')) return res.status(400).json({ error: 'Email ya en uso' });
          return res.status(500).json({ error: err.message });
        }
        res.json({ success: true });
      }
    );
  });
});

app.delete('/api/notifiers/:id', verifyAdmin, (req, res) => {
  const id = req.params.id;
  // No permitir borrar al admin logueado
  if (parseInt(id) === req.user.id) {
    return res.status(400).json({ error: 'No puedes eliminar tu propio usuario' });
  }
  db.run(
    `DELETE FROM users WHERE id = ?`,
    [id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
      // Desasignar notificaciones
      db.run(`UPDATE notifications SET notifier_id = NULL, status = 'pending' WHERE notifier_id = ?`, [id]);
      res.json({ success: true });
    }
  );
});

// Desasignar notificaciones de un notificador (o por zona, o individuales)
app.post('/api/unassign', verifyAdmin, (req, res) => {
  const { notifier_id, notification_ids, zone } = req.body;

  let sql, params;
  if (notification_ids && notification_ids.length > 0) {
    const placeholders = notification_ids.map(() => '?').join(',');
    sql = `UPDATE notifications SET notifier_id = NULL, status = 'pending' WHERE id IN (${placeholders})`;
    params = notification_ids;
  } else if (notifier_id) {
    sql = `UPDATE notifications SET notifier_id = NULL, status = 'pending' WHERE notifier_id = ?`;
    params = [notifier_id];
    if (zone) {
      sql += ` AND zona = ?`;
      params.push(zone);
    }
  } else {
    return res.status(400).json({ error: 'Indicar notifier_id o notification_ids' });
  }

  db.run(sql, params, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, unassigned: this.changes });
  });
});

// Recorridos: ver asignaciones agrupadas por notificador
app.get('/api/recorridos', verifyAdmin, (req, res) => {
  db.all(`
    SELECT u.id as notifier_id, u.name, u.email, u.zone,
      COUNT(n.id) as total,
      SUM(CASE WHEN n.status = 'pending' THEN 1 ELSE 0 END) as pendientes,
      SUM(CASE WHEN n.status = 'in_progress' THEN 1 ELSE 0 END) as en_curso,
      SUM(CASE WHEN n.status = 'completed' THEN 1 ELSE 0 END) as completadas,
      GROUP_CONCAT(DISTINCT n.zona) as zonas
    FROM users u
    LEFT JOIN notifications n ON n.notifier_id = u.id
    WHERE u.role = 'notifier'
    GROUP BY u.id
    ORDER BY u.name
  `, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
});

// Detalle de recorrido de un notificador
app.get('/api/recorridos/:notifier_id', verifyAdmin, (req, res) => {
  db.all(`
    SELECT id, citizen_name, address, zona, status, nro_orden, suministro, nro_cliente
    FROM notifications
    WHERE notifier_id = ?
    ORDER BY zona, citizen_name
  `, [req.params.notifier_id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
});

// ============= GESTIÓN DE ZONAS =============
app.get('/api/zones', verifyAdmin, (req, res) => {
  db.all(
    `SELECT z.*,
       (SELECT COUNT(*) FROM notifications WHERE zona LIKE '%' || z.name || '%') as notification_count
     FROM zones z ORDER BY z.name`,
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows || []);
    }
  );
});

app.post('/api/zones', verifyAdmin, (req, res) => {
  const { name, description, localities } = req.body;
  if (!name) return res.status(400).json({ error: 'El nombre es obligatorio' });

  db.run(
    `INSERT INTO zones (name, description, localities) VALUES (?, ?, ?)`,
    [name, description || '', localities || ''],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, id: this.lastID });
    }
  );
});

// ============= ASIGNACIÓN DE NOTIFICACIONES =============
app.post('/api/assign', verifyAdmin, (req, res) => {
  const { notifier_id, notification_ids, zone } = req.body;

  if (!notifier_id) {
    return res.status(400).json({ error: 'notifier_id es obligatorio' });
  }

  // Si se pasan IDs específicos, asignarlos directamente
  if (notification_ids && notification_ids.length > 0) {
    const placeholders = notification_ids.map(() => '?').join(',');
    db.run(
      `UPDATE notifications SET notifier_id = ?, status = 'in_progress'
       WHERE id IN (${placeholders}) AND status = 'pending'`,
      [notifier_id, ...notification_ids],
      function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, assigned: this.changes });
      }
    );
  }
  // Si se pasa una zona, asignar todas las pendientes de esa zona
  else if (zone) {
    db.run(
      `UPDATE notifications SET notifier_id = ?, status = 'in_progress'
       WHERE status = 'pending' AND zona LIKE ?`,
      [notifier_id, `%${zone}%`],
      function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, assigned: this.changes, zone: zone });
      }
    );
  }
  else {
    return res.status(400).json({ error: 'Debes enviar notification_ids o zone' });
  }
});

// Obtener zonas detectadas en las notificaciones pendientes
app.get('/api/notifications/zones', verifyAdmin, (req, res) => {
  db.all(
    `SELECT zona, COUNT(*) as count
     FROM notifications
     WHERE zona IS NOT NULL AND zona != ''
     GROUP BY zona
     ORDER BY zona ASC`,
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows || []);
    }
  );
});

// ============= API PARA PANEL DE ADMINISTRACIÓN =============

// Obtener estadísticas
app.get('/api/notifications/stats', verifyAdmin, (req, res) => {
  db.get(
    `
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'pending' OR status = 'in_progress' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'synced' OR status = 'completed' THEN 1 ELSE 0 END) as completed
      FROM notifications
    `,
    (err, row) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({
        total: row.total || 0,
        pending: row.pending || 0,
        completed: row.completed || 0
      });
    }
  );
});

// Obtener todas las notificaciones (con límite opcional)
app.get('/api/notifications', verifyAdmin, (req, res) => {
  const limit = req.query.limit ? parseInt(req.query.limit) : 1000;

  db.all(
    `
      SELECT
        id, citizen_name, citizen_phone, address,
        latitude, longitude, status, token, qr_code,
        sms_sent, photo_path, signature_path, created_at,
        nro_orden, suministro, nro_cliente, tipo_notificacion,
        nro_cronograma, correo, sucursal, zona, import_batch_id,
        notifier_id
      FROM notifications
      ORDER BY created_at DESC
      LIMIT ?
    `,
    [limit],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(rows || []);
    }
  );
});

// Obtener una notificación por ID
app.get('/api/notifications/:id', verifyToken, (req, res) => {
  db.get(
    `
      SELECT
        id, citizen_name, citizen_phone, address,
        latitude, longitude, status, token, qr_code,
        sms_sent, photo_path, signature_path, created_at, notified_at,
        notifier_id, nro_orden, suministro, nro_cliente,
        tipo_notificacion, nro_cronograma, correo, sucursal, zona
      FROM notifications
      WHERE id = ?
    `,
    [req.params.id],
    (err, row) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (!row) {
        return res.status(404).json({ error: 'Notificación no encontrada' });
      }
      res.json(row);
    }
  );
});

// Crear nueva notificación
app.post('/api/notifications', verifyAdmin, (req, res) => {
  const { citizen_name, citizen_phone, address, latitude, longitude, amount } = req.body;

  // Validaciones
  if (!citizen_name || !citizen_phone || !address) {
    return res.status(400).json({
      error: 'Los campos citizen_name, citizen_phone y address son obligatorios'
    });
  }

  db.run(
    `
      INSERT INTO notifications
      (citizen_name, citizen_phone, address, latitude, longitude, status)
      VALUES (?, ?, ?, ?, ?, 'pending')
    `,
    [
      citizen_name,
      citizen_phone,
      address,
      latitude || null,
      longitude || null
    ],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({
        success: true,
        id: this.lastID,
        message: 'Notificación creada exitosamente'
      });
    }
  );
});

// Actualizar notificación
app.put('/api/notifications/:id', verifyAdmin, (req, res) => {
  const { citizen_name, citizen_phone, address, latitude, longitude, status } = req.body;

  db.run(
    `
      UPDATE notifications
      SET citizen_name = ?,
          citizen_phone = ?,
          address = ?,
          latitude = ?,
          longitude = ?,
          status = ?
      WHERE id = ?
    `,
    [citizen_name, citizen_phone, address, latitude, longitude, status, req.params.id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Notificación no encontrada' });
      }
      res.json({ success: true, message: 'Notificación actualizada' });
    }
  );
});

// Eliminar notificación
// ============= EDITAR NOTIFICACIÓN =============
app.put('/api/notifications/:id', verifyAdmin, (req, res) => {
  const { citizen_name, citizen_phone, address, nro_orden, suministro, nro_cliente, tipo_notificacion, nro_cronograma, correo, sucursal, zona } = req.body;
  const fields = [];
  const values = [];
  if (citizen_name !== undefined) { fields.push('citizen_name = ?'); values.push(citizen_name); }
  if (citizen_phone !== undefined) { fields.push('citizen_phone = ?'); values.push(citizen_phone); }
  if (address !== undefined) { fields.push('address = ?'); values.push(address); }
  if (nro_orden !== undefined) { fields.push('nro_orden = ?'); values.push(nro_orden); }
  if (suministro !== undefined) { fields.push('suministro = ?'); values.push(suministro); }
  if (nro_cliente !== undefined) { fields.push('nro_cliente = ?'); values.push(nro_cliente); }
  if (tipo_notificacion !== undefined) { fields.push('tipo_notificacion = ?'); values.push(tipo_notificacion); }
  if (nro_cronograma !== undefined) { fields.push('nro_cronograma = ?'); values.push(nro_cronograma); }
  if (correo !== undefined) { fields.push('correo = ?'); values.push(correo); }
  if (sucursal !== undefined) { fields.push('sucursal = ?'); values.push(sucursal); }
  if (zona !== undefined) { fields.push('zona = ?'); values.push(zona); }
  if (fields.length === 0) return res.status(400).json({ error: 'No hay campos para actualizar' });
  values.push(req.params.id);
  db.run(`UPDATE notifications SET ${fields.join(', ')} WHERE id = ?`, values, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Notificación no encontrada' });
    res.json({ success: true, message: 'Notificación actualizada' });
  });
});

app.delete('/api/notifications/:id', verifyAdmin, (req, res) => {
  db.run(
    'DELETE FROM notifications WHERE id = ?',
    [req.params.id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Notificación no encontrada' });
      }
      res.json({ success: true, message: 'Notificación eliminada' });
    }
  );
});

// Actualizar notificación con datos de captura (foto, firma, GPS)
app.post('/api/notifications/:id/capture', verifyToken, (req, res) => {
  const { photo_base64, signature_base64, gps_lat, gps_lng } = req.body;
  const notificationId = req.params.id;

  // Generar token único
  const timestamp = new Date().toISOString();
  const token = generateToken({ lat: gps_lat, lng: gps_lng }, timestamp, notificationId);
  const qr_url = generateQR(token);

  // Guardar imágenes como archivos en disco
  const capturesDir = path.join(__dirname, 'data', 'captures');
  if (!fs.existsSync(capturesDir)) fs.mkdirSync(capturesDir, { recursive: true });

  let photoPath = null;
  let signaturePath = null;

  if (photo_base64) {
    const photoFile = `photo_${notificationId}_${Date.now()}.jpg`;
    fs.writeFileSync(path.join(capturesDir, photoFile), Buffer.from(photo_base64, 'base64'));
    photoPath = `/data/captures/${photoFile}`;
  }
  if (signature_base64) {
    const sigFile = `firma_${notificationId}_${Date.now()}.svg`;
    fs.writeFileSync(path.join(capturesDir, sigFile), Buffer.from(signature_base64, 'base64'));
    signaturePath = `/data/captures/${sigFile}`;
  }
  // Por ahora las guardamos como datos en la BD o las convertimos a archivos

  db.run(
    `
      UPDATE notifications
      SET status = 'synced',
          token = ?,
          qr_code = ?,
          latitude = ?,
          longitude = ?,
          photo_path = ?,
          signature_path = ?,
          notified_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    [
      token,
      qr_url,
      gps_lat,
      gps_lng,
      photoPath,
      signaturePath,
      notificationId
    ],
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
            payment_link: `https://pago.ejemplo.com/notificacion/${token}`,
            citizen_name: row ? row.citizen_name : null,
            timestamp: new Date().toLocaleString('es-AR')
          });
        }
      );
    }
  );
});

// ============= VERIFICACIÓN PÚBLICA POR QR (sin login) =============
app.get('/verificar/:token', (req, res) => {
  const { token } = req.params;
  db.get(
    `SELECT id, citizen_name, citizen_phone, address, latitude, longitude, status, token, qr_code,
            photo_path, signature_path, created_at, notified_at, nro_orden, suministro, nro_cliente,
            tipo_notificacion, nro_cronograma, correo, sucursal, zona
     FROM notifications WHERE token = ?`,
    [token],
    (err, n) => {
      if (err || !n) {
        return res.status(404).send('<html><body><h1>Notificación no encontrada</h1></body></html>');
      }
      const tzOpts = { timeZone: 'America/Argentina/Buenos_Aires', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };
      const fecha = n.created_at ? new Date(n.created_at).toLocaleString('es-AR', tzOpts) : '-';
      const fechaNotif = n.notified_at ? new Date(n.notified_at).toLocaleString('es-AR', tzOpts) : '-';
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verificación de Notificación - EPEN</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; background: #f5f5f5; color: #333; }
    .header-img { width: 100%; max-height: 120px; object-fit: cover; display: block; }
    .container { max-width: 800px; margin: 0 auto; background: #fff; box-shadow: 0 2px 12px rgba(0,0,0,0.1); }
    .content { padding: 30px; }
    .doc-title { text-align: center; font-size: 18px; font-weight: bold; color: #1b5e20; border-bottom: 2px solid #2e7d32; padding-bottom: 12px; margin-bottom: 20px; }
    .section { margin-bottom: 20px; }
    .section-title { font-size: 13px; font-weight: bold; color: #2e7d32; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; border-bottom: 1px solid #e0e0e0; padding-bottom: 4px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; }
    .field { margin-bottom: 6px; }
    .field-label { font-size: 11px; color: #888; text-transform: uppercase; }
    .field-value { font-size: 14px; color: #1a1a1a; font-weight: 500; }
    .full-width { grid-column: 1 / -1; }
    .img-section img { max-width: 100%; border: 1px solid #ddd; border-radius: 4px; margin-top: 4px; }
    .signature-img { max-height: 150px; background: #fff; }
    .status-badge { display: inline-block; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: 600; }
    .status-synced, .status-completed { background: #e8f5e9; color: #2e7d32; }
    .status-pending { background: #fff3cd; color: #856404; }
    .footer { text-align: center; padding: 16px; font-size: 11px; color: #999; border-top: 1px solid #e0e0e0; }
    .token-display { font-family: monospace; font-size: 10px; color: #666; word-break: break-all; background: #f9f9f9; padding: 8px; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="container">
    <img src="https://www.epen.gov.ar/wp-content/uploads/2025/05/head-nuevo2.png" class="header-img" alt="EPEN">
    <div class="content">
      <div class="doc-title">CONSTANCIA DE NOTIFICACIÓN PRESENCIAL</div>

      <div class="section">
        <div class="section-title">Datos de la Notificación</div>
        <div class="grid">
          <div class="field"><div class="field-label">Nro. Orden</div><div class="field-value">${n.nro_orden || '-'}</div></div>
          <div class="field"><div class="field-label">Suministro</div><div class="field-value">${n.suministro || '-'}</div></div>
          <div class="field"><div class="field-label">Nro. Cliente</div><div class="field-value">${n.nro_cliente || '-'}</div></div>
          <div class="field"><div class="field-label">Tipo</div><div class="field-value">${n.tipo_notificacion || '-'}</div></div>
          <div class="field"><div class="field-label">Cronograma</div><div class="field-value">${n.nro_cronograma || '-'}</div></div>
          <div class="field"><div class="field-label">Zona / Sucursal</div><div class="field-value">${n.zona || '-'} / ${n.sucursal || '-'}</div></div>
          <div class="field"><div class="field-label">Estado</div><div class="field-value"><span class="status-badge status-${n.status}">${n.status === 'synced' || n.status === 'completed' ? 'Completada' : n.status === 'pending' ? 'Pendiente' : n.status}</span></div></div>
          <div class="field"><div class="field-label">Fecha de Alta</div><div class="field-value">${fecha}</div></div>
          <div class="field"><div class="field-label">Fecha y Hora de Notificación</div><div class="field-value" style="font-weight:700;color:#1b5e20;">${fechaNotif}</div></div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Datos del Ciudadano</div>
        <div class="grid">
          <div class="field"><div class="field-label">Nombre</div><div class="field-value">${n.citizen_name || '-'}</div></div>
          <div class="field"><div class="field-label">Teléfono</div><div class="field-value">${n.citizen_phone || '-'}</div></div>
          <div class="field full-width"><div class="field-label">Domicilio</div><div class="field-value">${n.address || '-'}</div></div>
          <div class="field"><div class="field-label">Correo</div><div class="field-value">${n.correo || '-'}</div></div>
        </div>
      </div>

      ${n.latitude && n.longitude ? `
      <div class="section">
        <div class="section-title">Geolocalización</div>
        <div class="grid">
          <div class="field"><div class="field-label">Latitud</div><div class="field-value">${n.latitude}</div></div>
          <div class="field"><div class="field-label">Longitud</div><div class="field-value">${n.longitude}</div></div>
        </div>
      </div>` : ''}

      ${n.photo_path ? `
      <div class="section img-section">
        <div class="section-title">Fotografía del Domicilio</div>
        <img src="${n.photo_path}" alt="Foto del domicilio">
      </div>` : ''}

      ${n.signature_path ? `
      <div class="section img-section">
        <div class="section-title">Firma</div>
        <img src="${n.signature_path}" class="signature-img" alt="Firma">
      </div>` : ''}

      ${n.token ? `
      <div class="section">
        <div class="section-title">Token de Verificación</div>
        <div class="token-display">${n.token}</div>
      </div>` : ''}
    </div>
    <div class="footer">
      Ente Provincial de Energía del Neuquén (EPEN) — Documento generado automáticamente — ${new Date().toLocaleDateString('es-AR')}
    </div>
  </div>
</body>
</html>`);
    }
  );
});

app.listen(port, () => {
  console.log(`Servidor ejecutándose en http://localhost:${port}`);
  console.log(`Panel de administración: http://localhost:${port}/admin.html`);
});
