const express = require('express');
const cors = require('cors');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const app = express();
const port = process.env.PORT || 4000;

// ============= CONFIGURACIÓN =============
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key';

// BD SQLite persistente en archivo
const path = require('path');
const DB_PATH = path.join(__dirname, 'data', 'dim.db');
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
    CREATE TABLE IF NOT EXISTS inspections (
      id INTEGER PRIMARY KEY,
      numero_habilitacion TEXT,
      nombre_comercio TEXT,
      titular TEXT,
      cuit TEXT,
      direccion TEXT,
      rubro TEXT,
      tipo_habilitacion TEXT,
      zona TEXT,
      status TEXT DEFAULT 'pending',
      inspector_id INTEGER,
      photo_path TEXT,
      signature_path TEXT,
      detalle TEXT,
      latitude REAL,
      longitude REAL,
      token TEXT UNIQUE,
      qr_code TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      inspected_at TIMESTAMP,
      import_batch_id INTEGER,
      FOREIGN KEY(inspector_id) REFERENCES users(id),
      FOREIGN KEY(import_batch_id) REFERENCES import_batches(id)
    )
  `);

  // Migration: add inspected_at column if missing (for existing DBs)
  db.run(`ALTER TABLE inspections ADD COLUMN inspected_at TIMESTAMP`, (err) => {
    // Ignore error if column already exists
  });

  // Migration: add detalle column if missing
  db.run(`ALTER TABLE inspections ADD COLUMN detalle TEXT`, (err) => {
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
    { id: 1, email: 'admin@dim.gob.ar', pass: 'admin123', role: 'admin', name: 'Administrador', zone: null },
    { id: 2, email: 'inspector@example.com', pass: 'demo123', role: 'inspector', name: 'Carlos Gómez', zone: 'Distrito 1' },
    { id: 3, email: 'inspector2@example.com', pass: 'demo123', role: 'inspector', name: 'María López', zone: 'Distrito 5' },
    { id: 4, email: 'inspector3@example.com', pass: 'demo123', role: 'inspector', name: 'Juan Rodríguez', zone: 'Distrito 10' },
    { id: 5, email: 'inspector4@example.com', pass: 'demo123', role: 'inspector', name: 'Ana Fernández', zone: 'Distrito 15' },
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

  // Distritos oficiales de San Miguel de Tucumán (1 al 20)
  for (let i = 1; i <= 20; i++) {
    db.run(`INSERT OR IGNORE INTO zones (id, name, description, localities) VALUES (?, ?, ?, ?)`,
      [i, `Distrito ${i}`, `Distrito ${i} - San Miguel de Tucumán`, `DISTRITO ${i}`]);
  }
});

// ============= RUTA RAÍZ =============
app.get('/', (req, res) => {
  res.json({
    name: 'DIM360 - Sistema de Inspecciones de Habilitaciones',
    version: '2.0.0',
    status: 'running',
    location: 'San Miguel de Tucumán',
    endpoints: {
      auth: {
        login: 'POST /auth/login - Autenticación de usuario'
      },
      inspections: {
        assignments: 'GET /assignments - Obtener asignaciones (requiere token)',
        sync: 'POST /sync - Sincronizar inspección (requiere token)',
        report: 'GET /report - Descargar reporte CSV (requiere token)',
        resultados: 'GET /api/resultados - Resultados de inspecciones (para integración DIM360)'
      },
      import: {
        csv: 'POST /import/csv - Importar habilitaciones desde CSV'
      }
    },
    docs: 'Ver README.md para instrucciones de uso'
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

// ============= CARGA DE DATOS (CSV de Habilitaciones) =============
app.post('/import/csv', upload.single('file'), (req, res) => {
  const results = [];

  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', () => {
      results.forEach((row) => {
        db.run(
          `
            INSERT INTO inspections
            (numero_habilitacion, nombre_comercio, titular, cuit, direccion, rubro, tipo_habilitacion, zona, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [
            row.numero_habilitacion,
            row.nombre_comercio,
            row.titular,
            row.cuit,
            row.direccion,
            row.rubro,
            row.tipo_habilitacion,
            row.zona,
            'pending'
          ]
        );
      });

      fs.unlinkSync(req.file.path);
      res.json({
        message: `${results.length} habilitaciones importadas para inspección`,
        count: results.length
      });
    });
});

// ============= LISTADO DE INSPECCIONES PARA INSPECTOR =============
app.get('/assignments', verifyToken, (req, res) => {
  db.all(
    `
      SELECT id, numero_habilitacion, nombre_comercio, titular, cuit, direccion, rubro,
             tipo_habilitacion, zona, status, latitude, longitude, created_at, inspected_at, token, detalle
      FROM inspections
      WHERE inspector_id = ?
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

// ============= SINCRONIZACIÓN DE INSPECCIÓN =============
app.post('/sync', verifyToken, (req, res) => {
  const { inspection_id, gps_lat, gps_lng, photo_base64, detalle } = req.body;

  // Guardar foto si se envía
  const capturesDir = path.join(__dirname, 'data', 'captures');
  if (!fs.existsSync(capturesDir)) fs.mkdirSync(capturesDir, { recursive: true });

  let photoPath = null;
  if (photo_base64) {
    const photoFile = `photo_${inspection_id}_${Date.now()}.jpg`;
    fs.writeFileSync(path.join(capturesDir, photoFile), Buffer.from(photo_base64, 'base64'));
    photoPath = `/data/captures/${photoFile}`;
  }

  // Generar token único para verificación de constancia
  const verificationToken = crypto.randomUUID();

  // Generar timestamp con hora de Argentina (UTC-3)
  const argentinaTimestamp = new Date().toLocaleString('sv-SE', {
    timeZone: 'America/Argentina/Buenos_Aires'
  }).replace(' ', 'T');

  // Actualizar inspección con token y timestamp de Argentina
  db.run(
    `
      UPDATE inspections
      SET status = 'completed', latitude = ?, longitude = ?, photo_path = COALESCE(?, photo_path), detalle = ?, token = ?, inspected_at = ?
      WHERE id = ?
    `,
    [gps_lat, gps_lng, photoPath, detalle || '', verificationToken, argentinaTimestamp, inspection_id],
    (err) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      // Obtener datos de la inspección
      db.get(
        'SELECT nombre_comercio, titular, direccion, token FROM inspections WHERE id = ?',
        [inspection_id],
        (err, row) => {
          res.json({
            success: true,
            inspection_id,
            nombre_comercio: row ? row.nombre_comercio : null,
            direccion: row ? row.direccion : null,
            token: row ? row.token : null,
            timestamp: new Date().toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })
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
        id, numero_habilitacion, nombre_comercio, titular, cuit, direccion, rubro,
        tipo_habilitacion, zona, status, token, created_at, inspected_at, detalle
      FROM inspections
      ORDER BY created_at DESC
    `,
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      // Generar CSV
      let csv = 'ID,Numero Habilitacion,Nombre Comercio,Titular,CUIT,Direccion,Rubro,Tipo,Zona,Estado,Token,Fecha Alta,Fecha Inspeccion,Detalle\n';
      rows.forEach((row) => {
        csv += `${row.id},"${row.numero_habilitacion || ''}","${row.nombre_comercio || ''}","${row.titular || ''}","${row.cuit || ''}","${row.direccion || ''}","${row.rubro || ''}","${row.tipo_habilitacion || ''}","${row.zona || ''}",${row.status},"${row.token || ''}","${row.created_at || ''}","${row.inspected_at || ''}","${row.detalle || ''}"\n`;
      });

      res.header('Content-Type', 'text/csv');
      res.header('Content-Disposition', 'attachment; filename="reporte-inspecciones.csv"');
      res.send(csv);
    }
  );
});

// ============= ACTUALIZAR ESTADO =============
app.patch('/inspection/:id', verifyToken, (req, res) => {
  const { status } = req.body;
  db.run(
    'UPDATE inspections SET status = ? WHERE id = ?',
    [status, req.params.id],
    (err) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ success: true });
    }
  );
});

// ============= PARSER DE CSV DE HABILITACIONES =============
// El CSV debe tener las columnas: numero_habilitacion, nombre_comercio, titular, cuit, direccion, rubro, tipo_habilitacion, zona

function parseCSVHabilitaciones(rows) {
  // Esta función recibe los rows ya parseados del CSV
  // y los normaliza para inserción en la BD
  const records = [];

  for (const row of rows) {
    records.push({
      numero_habilitacion: row.numero_habilitacion || '',
      nombre_comercio: row.nombre_comercio || '',
      titular: row.titular || '',
      cuit: row.cuit || '',
      direccion: row.direccion || '',
      rubro: row.rubro || '',
      tipo_habilitacion: row.tipo_habilitacion || '',
      zona: row.zona || ''
    });
  }

  return records;
}

// ============= IMPORTACIÓN DE CSV DE HABILITACIONES =============
app.post('/api/import/csv', verifyAdmin, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se proporcionó archivo CSV' });
    }

    // Leer y parsear el CSV
    const results = [];
    await new Promise((resolve, reject) => {
      fs.createReadStream(req.file.path)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', resolve)
        .on('error', reject);
    });

    const parsed = parseCSVHabilitaciones(results);

    // Metadata del batch
    const batchMetadata = {
      nro_cronograma: 'CSV-' + Date.now(),
      correo: '',
      sucursal: 'San Miguel de Tucumán'
    };

    // Crear batch de importación
    const batchId = await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO import_batches (filename, nro_cronograma, correo, sucursal, total_records)
         VALUES (?, ?, ?, ?, ?)`,
        [
          req.file.originalname,
          batchMetadata.nro_cronograma,
          batchMetadata.correo,
          batchMetadata.sucursal,
          parsed.length
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

    for (const record of parsed) {
      try {
        await new Promise((resolve, reject) => {
          // Verificar duplicados por numero_habilitacion
          db.get(
            'SELECT id FROM inspections WHERE numero_habilitacion = ?',
            [record.numero_habilitacion],
            (err, existing) => {
              if (err) return reject(err);

              if (existing && record.numero_habilitacion) {
                duplicates++;
                return resolve();
              }

              db.run(
                `INSERT INTO inspections
                 (numero_habilitacion, nombre_comercio, titular, cuit, direccion, rubro,
                  tipo_habilitacion, zona, status, import_batch_id)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
                [
                  record.numero_habilitacion,
                  record.nombre_comercio,
                  record.titular,
                  record.cuit,
                  record.direccion,
                  record.rubro,
                  record.tipo_habilitacion,
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
      total_parsed: parsed.length,
      inserted: inserted,
      duplicates: duplicates,
      records_preview: parsed.slice(0, 5), // Preview de primeros 5
      metadata: batchMetadata
    });
  } catch (error) {
    console.error('Error procesando CSV:', error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: 'Error procesando el CSV: ' + error.message });
  }
});

// ============= GESTIÓN DE IMPORTACIONES =============
app.get('/api/import/batches', verifyAdmin, (req, res) => {
  db.all(
    `SELECT ib.*,
       (SELECT COUNT(*) FROM inspections WHERE import_batch_id = ib.id) as actual_records,
       (SELECT COUNT(*) FROM inspections WHERE import_batch_id = ib.id AND status != 'pending') as processed
     FROM import_batches ib
     ORDER BY ib.imported_at DESC`,
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows || []);
    }
  );
});

// ============= GESTIÓN DE INSPECTORES =============
// Listar todos los usuarios (con stats para inspectores)
app.get('/api/inspectors', verifyAdmin, (req, res) => {
  db.all(
    `SELECT u.id, u.email, u.name, u.zone, u.role,
       (SELECT COUNT(*) FROM inspections WHERE inspector_id = u.id AND status IN ('pending','in_progress')) as pending_count,
       (SELECT COUNT(*) FROM inspections WHERE inspector_id = u.id AND status IN ('synced','completed')) as completed_count
     FROM users u
     ORDER BY u.role, u.name`,
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows || []);
    }
  );
});

app.post('/api/inspectors', verifyAdmin, (req, res) => {
  const { email, password, name, zone, role } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ error: 'email, password y name son obligatorios' });
  }

  const hash = bcrypt.hashSync(password, 10);
  const userRole = role === 'admin' ? 'admin' : 'inspector';

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
app.put('/api/inspectors/:id', verifyAdmin, (req, res) => {
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

app.delete('/api/inspectors/:id', verifyAdmin, (req, res) => {
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
      // Desasignar inspecciones
      db.run(`UPDATE inspections SET inspector_id = NULL, status = 'pending' WHERE inspector_id = ?`, [id]);
      res.json({ success: true });
    }
  );
});

// Desasignar inspecciones de un inspector (o por zona, o individuales)
app.post('/api/unassign', verifyAdmin, (req, res) => {
  const { inspector_id, inspection_ids, zone } = req.body;

  let sql, params;
  if (inspection_ids && inspection_ids.length > 0) {
    const placeholders = inspection_ids.map(() => '?').join(',');
    sql = `UPDATE inspections SET inspector_id = NULL, status = 'pending' WHERE id IN (${placeholders})`;
    params = inspection_ids;
  } else if (inspector_id) {
    sql = `UPDATE inspections SET inspector_id = NULL, status = 'pending' WHERE inspector_id = ?`;
    params = [inspector_id];
    if (zone) {
      sql += ` AND zona = ?`;
      params.push(zone);
    }
  } else {
    return res.status(400).json({ error: 'Indicar inspector_id o inspection_ids' });
  }

  db.run(sql, params, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, unassigned: this.changes });
  });
});

// Recorridos: ver asignaciones agrupadas por inspector
app.get('/api/recorridos', verifyAdmin, (req, res) => {
  db.all(`
    SELECT u.id as inspector_id, u.name, u.email, u.zone,
      COUNT(i.id) as total,
      SUM(CASE WHEN i.status = 'pending' THEN 1 ELSE 0 END) as pendientes,
      SUM(CASE WHEN i.status = 'in_progress' THEN 1 ELSE 0 END) as en_curso,
      SUM(CASE WHEN i.status = 'completed' OR i.status = 'synced' THEN 1 ELSE 0 END) as completadas,
      GROUP_CONCAT(DISTINCT i.zona) as zonas
    FROM users u
    LEFT JOIN inspections i ON i.inspector_id = u.id
    WHERE u.role = 'inspector'
    GROUP BY u.id
    ORDER BY u.name
  `, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
});

// Detalle de recorrido de un inspector
app.get('/api/recorridos/:inspector_id', verifyAdmin, (req, res) => {
  db.all(`
    SELECT id, nombre_comercio, direccion, zona, status, numero_habilitacion, titular, cuit
    FROM inspections
    WHERE inspector_id = ?
    ORDER BY zona, nombre_comercio
  `, [req.params.inspector_id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
});

// ============= GESTIÓN DE ZONAS =============
app.get('/api/zones', verifyAdmin, (req, res) => {
  db.all(
    `SELECT z.*,
       (SELECT COUNT(*) FROM inspections WHERE zona LIKE '%' || z.name || '%') as inspection_count
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

// ============= ASIGNACIÓN DE INSPECCIONES =============
app.post('/api/assign', verifyAdmin, (req, res) => {
  const { inspector_id, inspection_ids, zone } = req.body;

  if (!inspector_id) {
    return res.status(400).json({ error: 'inspector_id es obligatorio' });
  }

  // Si se pasan IDs específicos, asignarlos directamente
  if (inspection_ids && inspection_ids.length > 0) {
    const placeholders = inspection_ids.map(() => '?').join(',');
    db.run(
      `UPDATE inspections SET inspector_id = ?, status = 'in_progress'
       WHERE id IN (${placeholders}) AND status = 'pending'`,
      [inspector_id, ...inspection_ids],
      function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, assigned: this.changes });
      }
    );
  }
  // Si se pasa una zona, asignar todas las pendientes de esa zona
  else if (zone) {
    db.run(
      `UPDATE inspections SET inspector_id = ?, status = 'in_progress'
       WHERE status = 'pending' AND zona LIKE ?`,
      [inspector_id, `%${zone}%`],
      function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, assigned: this.changes, zone: zone });
      }
    );
  }
  else {
    return res.status(400).json({ error: 'Debes enviar inspection_ids o zone' });
  }
});

// Obtener zonas detectadas en las inspecciones pendientes
app.get('/api/inspections/zones', verifyAdmin, (req, res) => {
  db.all(
    `SELECT zona, COUNT(*) as count
     FROM inspections
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
app.get('/api/inspections/stats', verifyAdmin, (req, res) => {
  db.get(
    `
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'pending' OR status = 'in_progress' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'synced' OR status = 'completed' THEN 1 ELSE 0 END) as completed
      FROM inspections
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

// Obtener todas las inspecciones (con límite opcional)
app.get('/api/inspections', verifyAdmin, (req, res) => {
  const limit = req.query.limit ? parseInt(req.query.limit) : 1000;

  db.all(
    `
      SELECT
        i.id, i.numero_habilitacion, i.nombre_comercio, i.titular, i.cuit,
        i.direccion, i.rubro, i.tipo_habilitacion, i.zona, i.status,
        i.latitude, i.longitude, i.token, i.qr_code, i.photo_path, i.signature_path,
        i.detalle, i.created_at, i.inspected_at, i.import_batch_id,
        i.inspector_id, u.name as inspector_name, u.email as inspector_email
      FROM inspections i
      LEFT JOIN users u ON i.inspector_id = u.id
      ORDER BY i.created_at DESC
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

// Obtener una inspección por ID
app.get('/api/inspections/:id', verifyToken, (req, res) => {
  db.get(
    `
      SELECT
        id, numero_habilitacion, nombre_comercio, titular, cuit,
        direccion, rubro, tipo_habilitacion, zona, status,
        latitude, longitude, token, qr_code, photo_path, signature_path,
        detalle, created_at, inspected_at, inspector_id
      FROM inspections
      WHERE id = ?
    `,
    [req.params.id],
    (err, row) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (!row) {
        return res.status(404).json({ error: 'Inspección no encontrada' });
      }
      res.json(row);
    }
  );
});

// Crear nueva inspección manual
app.post('/api/inspections', verifyAdmin, (req, res) => {
  const { numero_habilitacion, nombre_comercio, titular, cuit, direccion, rubro, tipo_habilitacion, zona } = req.body;

  // Validaciones
  if (!nombre_comercio || !direccion) {
    return res.status(400).json({
      error: 'Los campos nombre_comercio y direccion son obligatorios'
    });
  }

  db.run(
    `
      INSERT INTO inspections
      (numero_habilitacion, nombre_comercio, titular, cuit, direccion, rubro, tipo_habilitacion, zona, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `,
    [
      numero_habilitacion || '',
      nombre_comercio,
      titular || '',
      cuit || '',
      direccion,
      rubro || '',
      tipo_habilitacion || '',
      zona || ''
    ],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({
        success: true,
        id: this.lastID,
        message: 'Inspección creada exitosamente'
      });
    }
  );
});

// ============= EDITAR INSPECCIÓN =============
app.put('/api/inspections/:id', verifyAdmin, (req, res) => {
  const { numero_habilitacion, nombre_comercio, titular, cuit, direccion, rubro, tipo_habilitacion, zona } = req.body;
  const fields = [];
  const values = [];
  if (numero_habilitacion !== undefined) { fields.push('numero_habilitacion = ?'); values.push(numero_habilitacion); }
  if (nombre_comercio !== undefined) { fields.push('nombre_comercio = ?'); values.push(nombre_comercio); }
  if (titular !== undefined) { fields.push('titular = ?'); values.push(titular); }
  if (cuit !== undefined) { fields.push('cuit = ?'); values.push(cuit); }
  if (direccion !== undefined) { fields.push('direccion = ?'); values.push(direccion); }
  if (rubro !== undefined) { fields.push('rubro = ?'); values.push(rubro); }
  if (tipo_habilitacion !== undefined) { fields.push('tipo_habilitacion = ?'); values.push(tipo_habilitacion); }
  if (zona !== undefined) { fields.push('zona = ?'); values.push(zona); }
  if (fields.length === 0) return res.status(400).json({ error: 'No hay campos para actualizar' });
  values.push(req.params.id);
  db.run(`UPDATE inspections SET ${fields.join(', ')} WHERE id = ?`, values, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Inspección no encontrada' });
    res.json({ success: true, message: 'Inspección actualizada' });
  });
});

app.delete('/api/inspections/:id', verifyAdmin, (req, res) => {
  db.run(
    'DELETE FROM inspections WHERE id = ?',
    [req.params.id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Inspección no encontrada' });
      }
      res.json({ success: true, message: 'Inspección eliminada' });
    }
  );
});

// Actualizar inspección con datos de captura (foto, GPS, detalle/observaciones)
app.post('/api/inspections/:id/capture', verifyToken, (req, res) => {
  const { photo_base64, gps_lat, gps_lng, detalle } = req.body;
  const inspectionId = req.params.id;

  // Guardar foto como archivo en disco
  const capturesDir = path.join(__dirname, 'data', 'captures');
  if (!fs.existsSync(capturesDir)) fs.mkdirSync(capturesDir, { recursive: true });

  let photoPath = null;
  if (photo_base64) {
    const photoFile = `photo_${inspectionId}_${Date.now()}.jpg`;
    fs.writeFileSync(path.join(capturesDir, photoFile), Buffer.from(photo_base64, 'base64'));
    photoPath = `/data/captures/${photoFile}`;
  }

  // Generar token único para verificación de constancia
  const verificationToken = crypto.randomUUID();

  // Generar timestamp con hora de Argentina (UTC-3)
  const argentinaTimestamp = new Date().toLocaleString('sv-SE', {
    timeZone: 'America/Argentina/Buenos_Aires'
  }).replace(' ', 'T');

  db.run(
    `
      UPDATE inspections
      SET status = 'completed',
          latitude = ?,
          longitude = ?,
          photo_path = COALESCE(?, photo_path),
          detalle = ?,
          token = ?,
          inspected_at = ?
      WHERE id = ?
    `,
    [gps_lat, gps_lng, photoPath, detalle || '', verificationToken, argentinaTimestamp, inspectionId],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      // Obtener datos de la inspección
      db.get(
        'SELECT nombre_comercio, titular, direccion, token FROM inspections WHERE id = ?',
        [inspectionId],
        (err, row) => {
          res.json({
            success: true,
            inspection_id: inspectionId,
            nombre_comercio: row ? row.nombre_comercio : null,
            direccion: row ? row.direccion : null,
            token: row ? row.token : null,
            timestamp: new Date().toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })
          });
        }
      );
    }
  );
});

// ============= API DE RESULTADOS PARA INTEGRACIÓN DIM360 =============
app.get('/api/resultados', verifyToken, (req, res) => {
  // Devuelve las inspecciones completadas para integración con sistema DIM360 externo
  const limit = req.query.limit ? parseInt(req.query.limit) : 1000;
  const desde = req.query.desde || null; // Fecha desde (formato ISO)

  let sql = `
    SELECT
      i.id, i.numero_habilitacion, i.nombre_comercio, i.titular, i.cuit,
      i.direccion, i.rubro, i.tipo_habilitacion, i.zona, i.status,
      i.latitude, i.longitude, i.token, i.photo_path, i.signature_path,
      i.detalle, i.created_at, i.inspected_at,
      u.name as inspector_name
    FROM inspections i
    LEFT JOIN users u ON i.inspector_id = u.id
    WHERE i.status IN ('synced', 'completed')
  `;
  const params = [];

  if (desde) {
    sql += ` AND i.inspected_at >= ?`;
    params.push(desde);
  }

  sql += ` ORDER BY i.inspected_at DESC LIMIT ?`;
  params.push(limit);

  db.all(sql, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({
      total: rows.length,
      resultados: rows || []
    });
  });
});

// ============= VERIFICACIÓN PÚBLICA POR QR (sin login) =============
app.get('/verificar/:token', (req, res) => {
  const { token } = req.params;
  db.get(
    `SELECT id, numero_habilitacion, nombre_comercio, titular, cuit, direccion, rubro,
            tipo_habilitacion, zona, status, latitude, longitude, token, qr_code,
            photo_path, signature_path, detalle, created_at, inspected_at
     FROM inspections WHERE token = ?`,
    [token],
    (err, i) => {
      if (err || !i) {
        return res.status(404).send('<html><body><h1>Inspección no encontrada</h1></body></html>');
      }
      const tzOpts = { timeZone: 'America/Argentina/Buenos_Aires', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };
      const fecha = i.created_at ? new Date(i.created_at).toLocaleString('es-AR', tzOpts) : '-';
      const fechaInsp = i.inspected_at ? new Date(i.inspected_at).toLocaleString('es-AR', tzOpts) : '-';
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verificación de Inspección - DIM360</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; background: #f5f5f5; color: #333; }
    .header { background: #fff; padding: 20px; text-align: center; border-bottom: 3px solid #0066ff; }
    .header img { max-height: 80px; }
    .container { max-width: 800px; margin: 0 auto; background: #fff; box-shadow: 0 2px 12px rgba(0,0,0,0.1); }
    .content { padding: 30px; }
    .doc-title { text-align: center; font-size: 18px; font-weight: bold; color: #0052cc; border-bottom: 2px solid #0066ff; padding-bottom: 12px; margin-bottom: 20px; }
    .section { margin-bottom: 20px; }
    .section-title { font-size: 13px; font-weight: bold; color: #0066ff; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; border-bottom: 1px solid #e0e0e0; padding-bottom: 4px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; }
    .field { margin-bottom: 6px; }
    .field-label { font-size: 11px; color: #888; text-transform: uppercase; }
    .field-value { font-size: 14px; color: #1a1a1a; font-weight: 500; }
    .full-width { grid-column: 1 / -1; }
    .img-section img { max-width: 100%; border: 1px solid #ddd; border-radius: 4px; margin-top: 4px; }
    .signature-img { max-height: 150px; background: #fff; }
    .status-badge { display: inline-block; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: 600; }
    .status-synced, .status-completed { background: #e6f0ff; color: #0052cc; }
    .status-pending { background: #fff3cd; color: #856404; }
    .footer { text-align: center; padding: 16px; font-size: 11px; color: #999; border-top: 1px solid #e0e0e0; }
    .token-display { font-family: monospace; font-size: 10px; color: #666; word-break: break-all; background: #f9f9f9; padding: 8px; border-radius: 4px; }
    .detalle-box { background: #f8f9fa; padding: 12px; border-radius: 6px; border-left: 4px solid #0066ff; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="/img/logo-dim360.png" alt="DIM360">
      <div style="margin-top: 8px; font-size: 12px; color: #666;">Municipalidad de San Miguel de Tucumán</div>
    </div>
    <div class="content">
      <div class="doc-title">CONSTANCIA DE INSPECCIÓN DE HABILITACIÓN</div>

      <div class="section">
        <div class="section-title">Datos de la Habilitación</div>
        <div class="grid">
          <div class="field"><div class="field-label">Nro. Habilitación</div><div class="field-value">${i.numero_habilitacion || '-'}</div></div>
          <div class="field"><div class="field-label">Tipo</div><div class="field-value">${i.tipo_habilitacion || '-'}</div></div>
          <div class="field full-width"><div class="field-label">Nombre del Comercio</div><div class="field-value" style="font-size:16px;">${i.nombre_comercio || '-'}</div></div>
          <div class="field"><div class="field-label">Titular</div><div class="field-value">${i.titular || '-'}</div></div>
          <div class="field"><div class="field-label">CUIT</div><div class="field-value">${i.cuit || '-'}</div></div>
          <div class="field full-width"><div class="field-label">Dirección</div><div class="field-value">${i.direccion || '-'}</div></div>
          <div class="field"><div class="field-label">Rubro</div><div class="field-value">${i.rubro || '-'}</div></div>
          <div class="field"><div class="field-label">Zona</div><div class="field-value">${i.zona || '-'}</div></div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Datos de la Inspección</div>
        <div class="grid">
          <div class="field"><div class="field-label">Estado</div><div class="field-value"><span class="status-badge status-${i.status}">${i.status === 'synced' || i.status === 'completed' ? 'INSPECCIONADO' : i.status === 'pending' ? 'PENDIENTE' : i.status}</span></div></div>
          <div class="field"><div class="field-label">Fecha de Alta</div><div class="field-value">${fecha}</div></div>
          <div class="field full-width"><div class="field-label">Fecha y Hora de Inspección</div><div class="field-value" style="font-weight:700;color:#0052cc;">${fechaInsp}</div></div>
        </div>
      </div>

      ${i.detalle ? `
      <div class="section">
        <div class="section-title">Detalle / Observaciones del Inspector</div>
        <div class="detalle-box">${i.detalle}</div>
      </div>` : ''}

      ${i.latitude && i.longitude ? `
      <div class="section">
        <div class="section-title">Geolocalización</div>
        <div class="grid">
          <div class="field"><div class="field-label">Latitud</div><div class="field-value">${i.latitude}</div></div>
          <div class="field"><div class="field-label">Longitud</div><div class="field-value">${i.longitude}</div></div>
        </div>
      </div>` : ''}

      ${i.photo_path ? `
      <div class="section img-section">
        <div class="section-title">Fotografía del Establecimiento</div>
        <img src="${i.photo_path}" alt="Foto del establecimiento">
      </div>` : ''}

      ${i.signature_path ? `
      <div class="section img-section">
        <div class="section-title">Firma del Inspector</div>
        <img src="${i.signature_path}" class="signature-img" alt="Firma">
      </div>` : ''}

      ${i.token ? `
      <div class="section">
        <div class="section-title">Token de Verificación</div>
        <div class="token-display">${i.token}</div>
      </div>` : ''}
    </div>
    <div class="footer">
      DIM360 - Dirección de Ingresos Municipales | Municipalidad de San Miguel de Tucumán — Documento generado automáticamente — ${new Date().toLocaleDateString('es-AR')}
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
