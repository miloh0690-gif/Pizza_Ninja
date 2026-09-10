# Pizza Ninja — Sistema de ventas (proxy seguro)

## Estructura del proyecto

```
pizza-ninja-proxy/
├── .env            <-- Tus claves privadas (NUNCA se sube a Git)
├── .gitignore       <-- Incluye .env y node_modules
├── package.json     <-- Dependencias de Node.js
├── server.js        <-- Servidor Proxy (esconde la URL y la clave de tu Excel)
└── index.html        <-- El frontend (caja registradora)
```

## 1. Instalación (una sola vez)

Desde la terminal, parado dentro de esta carpeta:

```bash
npm install
```

Esto crea `node_modules/` usando las dependencias de `package.json` (express, dotenv, node-fetch).

## 2. Configura tu `.env`

Abre `.env` y reemplaza `API_KEY` por la clave secreta real que pusiste en tu `Code.gs` de Apps Script (NO es una URL, es el texto que escribiste ahí, por ejemplo `const API_KEY = "clave123";` → tu valor sería `clave123`).

Cambia también las contraseñas de `BRANCHES_JSON` por las que realmente quieras usar en el local.

## 3. Arranca el servidor

```bash
npm start
```

Si todo está bien configurado verás:
```
✅ .env cargado correctamente. Sucursales encontradas: Sucursal Central, Sucursal Norte, Sucursal Sur, Gerencia (Reporte Consolidado)
Servidor seguro de Pizza Ninja corriendo en http://localhost:3000
```

Si falta algo, el servidor ahora te lo dice apenas arranca, por ejemplo:
```
⚠️  ADVERTENCIAS DE CONFIGURACIÓN (revisa tu .env):
   - Falta API_KEY en tu .env
```

## 4. Abre el sitio

Ve a `http://localhost:3000` en el navegador. Deberías ver el selector de sucursal ya lleno.

---

## Si las sucursales NO cargan — diagnóstico paso a paso

**Paso 1 — Revisa la terminal donde corre `npm start`.**
Si ves la advertencia de `BRANCHES_JSON`, el problema está en el `.env` (JSON mal escrito, comillas raras, etc.). Copia el `BRANCHES_JSON` de este proyecto tal cual y solo cambia los nombres/contraseñas, sin romper las llaves `{}` ni las comillas `"`.

**Paso 2 — Prueba el endpoint directo**, con el servidor corriendo, en otra terminal:
```bash
curl http://localhost:3000/api/branches
```
- Si responde `[]` (vacío) → tu `BRANCHES_JSON` no se está leyendo bien (ver Paso 1).
- Si responde con la lista de sucursales → el problema es del lado del navegador (revisa la consola del navegador con F12 → pestaña "Console" y "Network", busca el request a `/api/branches` y mira el error).
- Si da error de conexión → el servidor no está corriendo o estás en otro puerto.

**Paso 3 — Revisa que el `index.html` que se está sirviendo sea el actualizado.**
Si tenías una versión vieja del `index.html` (con las contraseñas escritas directo en el archivo), reemplázala por completo por la de esta carpeta.

---

## Sobre la sincronización con tu Excel (Google Sheets)

**No necesitas "crear una API" en ningún lado externo.** La URL que te da Apps Script cuando implementas tu `Code.gs` como aplicación web YA ES tu API — es exactamente el mismo flujo que ya conocías (Extensiones → Apps Script → Implementar → copiar URL). Lo único nuevo es que ahora esa URL y la clave secreta viven escondidas en el `.env` del servidor, en vez de estar escritas directamente en el `index.html` donde cualquiera las podía ver.

Este paquete ya incluye tu `Code.gs` con una clave real (`pizzaninja2026secreto`) puesta tanto ahí como en el `.env`, así que ya están enlazados. Para dejarlo funcionando:

1. Abre tu Google Sheet → Extensiones → Apps Script.
2. Borra todo el contenido de `Code.gs` y pega el `Code.gs` de este paquete completo.
3. **Implementar → Administrar implementaciones → ✏️ (editar) → Nueva versión → Implementar.**
   (Si prefieres, también puedes crear una implementación totalmente nueva, pero entonces la URL cambia y hay que actualizar el `.env`.)
4. Confirma que en el diálogo diga "Ejecutar como: Yo" y "Quién tiene acceso: Cualquier usuario".
5. Copia la URL (termina en `/exec`). Si es distinta a la que ya está en tu `.env`, reemplázala ahí en `SHEET_API_URL`.
6. Reinicia el servidor: `npm start`.

### Probar la conexión sin depender del navegador

Con el servidor corriendo, en otra terminal:

```bash
curl http://localhost:3000/api/proxy?action=productos
```
- Si responde con tus tamaños/sabores/combos → **ya está conectado, todo bien.**
- Si responde `{"error":"No autorizado"}` → la clave en tu `.env` no coincide con la de tu `Code.gs` (revisa que sea EXACTAMENTE la misma, sin espacios).
- Si responde `{"error":"Error al comunicarse con la base de datos..."}` → la `SHEET_API_URL` está mal, vieja, o el deploy no tiene acceso "Cualquier usuario".

### Estructura obligatoria de tu hoja "Ventas"

`registrarVenta` escribe las columnas en este orden exacto — tu pestaña "Ventas" debe tener los encabezados en la fila 1 en este mismo orden:

| ID | Fecha | Hora | Sucursal | AtendidoPor | Cliente | MetodoPago | Detalle | CantidadItems | Total |
|----|-------|------|----------|-------------|---------|------------|---------|----------------|-------|

Si los nombres o el orden de columnas no coinciden, las ventas se seguirán registrando (van por posición, no por nombre) pero podrían quedar en la columna equivocada.
