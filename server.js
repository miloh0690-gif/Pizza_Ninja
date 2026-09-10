// Importamos las librerías necesarias para levantar el servidor y leer variables seguras
const express = require('express');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware para permitir recibir datos JSON en las peticiones
app.use(express.json({ limit: '1mb' }));

// Servir los archivos estáticos de tu frontend (index.html, etc.)
app.use(express.static(__dirname));

// --- Verificación de variables de entorno al arrancar (te avisa si falta algo) ---
let BRANCHES = {};
let startupWarnings = [];

if (!process.env.SHEET_API_URL) startupWarnings.push('Falta SHEET_API_URL en tu .env');
if (!process.env.API_KEY) startupWarnings.push('Falta API_KEY en tu .env');
if (!process.env.BRANCHES_JSON) {
  startupWarnings.push('Falta BRANCHES_JSON en tu .env');
} else {
  try {
    BRANCHES = JSON.parse(process.env.BRANCHES_JSON);
    if (Object.keys(BRANCHES).length === 0) {
      startupWarnings.push('BRANCHES_JSON está vacío ({}) — no hay sucursales para mostrar');
    }
  } catch (err) {
    startupWarnings.push('BRANCHES_JSON no es un JSON válido: ' + err.message);
  }
}

if (startupWarnings.length > 0) {
  console.log('\n⚠️  ADVERTENCIAS DE CONFIGURACIÓN (revisa tu .env):');
  startupWarnings.forEach(w => console.log('   - ' + w));
  console.log('');
} else {
  console.log('✅ .env cargado correctamente. Sucursales encontradas:', Object.keys(BRANCHES).join(', '));
}

// Endpoint Proxy GET: Oculta la URL de Google Sheets y la API Key al cliente
app.get('/api/proxy', async (req, res) => {
  try {
    const action = req.query.action || 'productos';
    const sucursal = req.query.sucursal || 'all';

    // Construimos la URL privada usando las variables del archivo .env oculto
    const targetUrl = `${process.env.SHEET_API_URL}?action=${action}&sucursal=${encodeURIComponent(sucursal)}&key=${process.env.API_KEY}`;

    const response = await fetch(targetUrl);
    const data = await response.json();

    res.json(data);
  } catch (error) {
    console.error("Error en proxy GET:", error);
    res.status(500).json({ error: "Error al comunicarse con la base de datos de Google Sheets" });
  }
});

// Endpoint Proxy POST: Para registrar ventas de forma segura
app.post('/api/proxy', async (req, res) => {
  try {
    const payload = {
      action: req.body.action,
      key: process.env.API_KEY, // Inyectamos la clave secreta desde el servidor
      venta: req.body.venta
    };

    const response = await fetch(process.env.SHEET_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Error en proxy POST:", error);
    res.status(500).json({ error: "Error al registrar la venta en Google Sheets" });
  }
});

// Endpoint de sucursales: solo entrega nombre y rol, JAMÁS la contraseña
app.get('/api/branches', (req, res) => {
  const list = Object.keys(BRANCHES).map(name => ({
    name,
    role: BRANCHES[name].role
  }));
  res.json(list);
});

// Endpoint de login: el frontend manda sucursal + contraseña y el servidor
// hace la comparación aquí adentro, donde nadie puede verla.
app.post('/api/login', (req, res) => {
  const { branch, password } = req.body;
  const config = BRANCHES[branch];

  if (config && config.password === password) {
    res.json({ ok: true, role: config.role });
  } else {
    res.status(401).json({ error: 'Credenciales inválidas' });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor seguro de Pizza Ninja corriendo en http://localhost:${PORT}`);
});
