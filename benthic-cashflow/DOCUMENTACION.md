# Benthic Cashflow — Documentación Técnica Completa

> Última actualización: 2026-07-16  
> Proyecto: Benthic Cashflow Dashboard  
> Empresa: Benthic OPS SpA

---

## 📋 Índice

1. [Descripción del Proyecto](#descripción-del-proyecto)
2. [Stack Tecnológico](#stack-tecnológico)
3. [Estructura de Archivos](#estructura-de-archivos)
4. [Variables de Entorno y API Keys](#variables-de-entorno-y-api-keys)
5. [Instalación y Puesta en Marcha](#instalación-y-puesta-en-marcha)
6. [Arquitectura y Flujo de Integración](#arquitectura-y-flujo-de-integración)
7. [Endpoints del Backend](#endpoints-del-backend)
8. [Funcionalidades Implementadas](#funcionalidades-implementadas)
9. [Limitaciones Conocidas de Fintoc (Chile)](#limitaciones-conocidas-de-fintoc-chile)
10. [Repositorio Git](#repositorio-git)
11. [Historial de Bugs Resueltos](#historial-de-bugs-resueltos)

---

## 📌 Descripción del Proyecto

**Benthic Cashflow** es una aplicación web de monitoreo de cuentas bancarias en tiempo real, construida para **Benthic OPS SpA**. Permite conectar múltiples cuentas bancarias chilenas a través de la API de **Fintoc** y visualizar saldos, movimientos históricos y análisis consolidado de cashflow en un dashboard con diseño temático oceánico.

---

## 🛠 Stack Tecnológico

| Componente | Tecnología |
|---|---|
| **Frontend** | HTML5, Vanilla CSS, Vanilla JavaScript |
| **Backend** | Node.js + Express.js |
| **API bancaria** | Fintoc API v1 (REST directo, sin SDK) |
| **Widget bancario** | Fintoc.js Widget (cargado desde `js.fintoc.com`) |
| **Almacenamiento** | JSON local (`db.json`) |
| **Fuente tipográfica** | Space Grotesk (Google Fonts) |
| **Repositorio** | GitHub — `jordicv/benthic-ops` |

---

## 📁 Estructura de Archivos

```
Benthic Cashflow/
├── server.js           ← Backend Node.js/Express (todos los endpoints)
├── db.json             ← Base de datos local (links conectados)
├── .env                ← Variables de entorno con API keys (NO subir a git)
├── package.json
├── public/
│   ├── index.html      ← SPA principal
│   ├── style.css       ← Design system completo (tema oceánico)
│   └── app.js          ← Toda la lógica frontend (multi-banco)
└── DOCUMENTACION.md    ← Este archivo
```

---

## 🔑 Variables de Entorno y API Keys

### Archivo `.env` (en la raíz del proyecto)

```env
# ── Fintoc — Modo TEST (sandbox) ─────────────────────────────────────────────
FINTOC_PUBLIC_KEY_TEST=pk_test_UC5aJmvtXDpapgsxCx7xBdBmgRgFuvxU1ukfiPpLaqU_1
FINTOC_SECRET_KEY_TEST=sk_test_UC5aJmvtXDpapgsxCx7xBdBmgRgFuvxU1ukfiPpLaqU

# ── Fintoc — Modo LIVE (producción) ──────────────────────────────────────────
FINTOC_PUBLIC_KEY_LIVE=pk_live_TbYzzyqR1J4sgah8gFFspqyF5Ls2kx4Xs8otCCn6R_c
FINTOC_SECRET_KEY_LIVE=sk_live_Jg-qiY_usfxxLTY1uqobTfjJNc-SUHsjmX2ytkQztUQ

# ── Modo activo ───────────────────────────────────────────────────────────────
# Cambiar a "test" para usar el sandbox de Fintoc
FINTOC_MODE=live

# ── Puerto del servidor ───────────────────────────────────────────────────────
PORT=3000
```

> ⚠️ **IMPORTANTE**: El archivo `.env` está en el `.gitignore` y NUNCA debe subirse a GitHub. Las keys de producción (`live`) dan acceso real a cuentas bancarias.

### Cómo cambiar entre TEST y LIVE

| Variable | Valor para TEST | Valor para LIVE |
|---|---|---|
| `FINTOC_MODE` | `test` | `live` |

El servidor lee `FINTOC_MODE` y automáticamente usa las keys correspondientes.

### Credenciales de TEST de Fintoc (sandbox Chile)

Para probar sin banco real, usar estas credenciales en el widget:

| Campo | Valor |
|---|---|
| Usuario (RUT) | `41614850-3` |
| Contraseña | `jonsnow` |

También válidos: `40427672-7 / jonsnow` y `41579263-8 / jonsnow`

---

## 🚀 Instalación y Puesta en Marcha

### Requisitos previos
- Node.js v18+
- Cuenta en [Fintoc](https://app.fintoc.com/) con API keys

### Pasos

```bash
# 1. Clonar el repositorio
git clone https://github.com/jordicv/benthic-ops.git
cd benthic-ops/benthic-cashflow

# 2. Instalar dependencias
npm install

# 3. Crear archivo .env con las keys (ver sección anterior)

# 4. Iniciar el servidor con auto-reload
node --watch server.js

# 5. Abrir en el navegador
# http://localhost:3000
```

> ⚠️ **El widget de Fintoc NO carga en Brave Browser** ni con extensiones AdBlock/uBlock Origin activas. Usar Firefox o Chrome con bloqueadores desactivados para `localhost`.

---

## 🏗 Arquitectura y Flujo de Integración

### Flujo completo de conexión bancaria (Link Intent Flow)

```
1. Usuario hace clic en "Conectar Banco" o "+ Agregar Banco"
       │
       ▼
2. Frontend → POST /api/link-intent
       │  El backend llama a:
       │  POST https://api.fintoc.com/v1/link_intents
       │  body: { product: "movements", holder_type: "individual", country: "cl" }
       │  Respuesta: { widget_token: "li_xxx_sec_yyy" }
       │
       ▼
3. Frontend abre el Widget de Fintoc (Fintoc.js)
       │  Fintoc.create({ publicKey, widgetToken })
       │  El usuario ingresa sus credenciales bancarias
       │
       ▼
4. onSuccess(result) → extrae result.exchangeToken
       │  Formato: "li_XXXX_exchange_token_YYYY"
       │
       ▼
5. Frontend → POST /api/exchange-token { exchangeToken }
       │  El backend llama a:
       │  GET https://api.fintoc.com/v1/links/exchange?exchange_token=...
       │  *** Esta es la ÚNICA llamada que devuelve el link_token permanente ***
       │  Respuesta: { id, link_token, accounts, institution, ... }
       │
       ▼
6. Backend guarda en db.json:
       │  { id, linkToken, institution, username, connectedAt }
       │
       ▼
7. Dashboard muestra chips de bancos + cuentas consolidadas + movimientos
```

### Autenticación de la API de Fintoc

```
Header:  Authorization: sk_live_...   (sin prefijo "Bearer")
Base URL: https://api.fintoc.com/v1
```

---

## 🔌 Endpoints del Backend

### `GET /api/config`
Devuelve la public key de Fintoc al frontend.
```json
{ "publicKey": "pk_live_..." }
```

### `GET /api/links`
Lista todos los bancos conectados guardados en `db.json`.
```json
[
  {
    "id": "link_XXX",
    "linkToken": "link_XXX_token_YYY",
    "institution": "Banco de Chile",
    "username": "12345678-9",
    "connectedAt": "2026-07-16T11:38:55.196Z"
  }
]
```

### `POST /api/link-intent`
Crea un Link Intent en Fintoc y devuelve el `widgetToken`.
```json
{ "id": "li_xxx", "widgetToken": "li_xxx_sec_yyy" }
```

### `POST /api/exchange-token`
Intercambia el `exchangeToken` del widget por el `link_token` permanente.
```json
// Body
{ "exchangeToken": "li_xxx_exchange_token_yyy" }
// Response
{ "id": "link_XXX", "linkToken": "link_XXX_token_YYY", "institution": "Banco de Chile", ... }
```

### `GET /api/accounts?linkId=XXX`
Retorna las cuentas del link dado.
```json
[{
  "id": "acc_XXX",
  "name": "Cuenta Corriente",
  "number": "2256726402",
  "balance": { "available": 2063, "current": 2063, "currency": "CLP" },
  "type": "checking_account"
}]
```

### `GET /api/accounts/:accountId/movements?linkId=XXX`
Retorna hasta 50 movimientos del account dado.
```json
[{
  "id": "mov_XXX",
  "amount": -200000,
  "postDate": "2026-07-09",
  "description": "Traspaso De:Localpayment Sra",
  "type": "debit",
  "currency": "CLP",
  "pending": false
}]
```

### `DELETE /api/links/:linkId`
Desconecta un banco del panel (borra de `db.json`).
```json
{ "success": true }
```

---

## ✅ Funcionalidades Implementadas

### Dashboard Multi-Banco
- Conexión de múltiples bancos simultáneamente
- Chips con indicador verde por cada banco conectado
- Botón individual de desconexión por banco (✕ en cada chip)
- Botón **"+ Agregar Banco"** persistente en el dashboard
- Saldo total consolidado de todas las cuentas

### Visualización de Cuentas
- Grid de tarjetas con todas las cuentas de todos los bancos
- Nombre de institución en cada tarjeta
- Saldo disponible en CLP

### Historial de Movimientos
- Selector de cuenta agrupado por banco (`<optgroup>`)
- Tabla con fecha, descripción, tipo (entrada/salida) y monto
- Colores: verde para entradas, rojo para salidas

### Resumen de Cashflow
- Total entradas (créditos)
- Total salidas (débitos)
- Diferencia neta con color dinámico

### UX / Diseño
- Tema oceánico profundo (azul oscuro, cyan, burbujas animadas)
- Depth Meter Widget (medidor de profundidad según scroll)
- Auto-reload del servidor con `node --watch`
- Modo TEST y LIVE controlado por `.env`

---

## ⚠️ Limitaciones Conocidas de Fintoc (Chile)

### Productos soportados (Chile, producto `movements`)

| Banco | Cuenta Corriente | Cuenta Vista | Tarjeta Crédito |
|---|---|---|---|
| Banco de Chile | ✅ 24 meses | ✅ | ❌ No soportado |
| Banco Santander | ✅ 24 meses | ✅ | ❌ No soportado |
| Banco Itaú | ✅ 24 meses | ✅ | ❌ No soportado |
| Banco BICE | ✅ 12 meses | ✅ | ❌ No soportado |
| Scotiabank | ✅ 12 meses | ✅ | ❌ No soportado |
| Banco BCI | ✅ 12 meses | ✅ | ❌ No soportado |
| Banco Estado | ✅ 12 meses | ✅ | ❌ No soportado |
| Banco Security | ✅ 12 meses | ✅ | ❌ No soportado |

> **Las tarjetas de crédito NO están soportadas por Fintoc en Chile.** Esta es una limitación de la plataforma, no de nuestra app.

### Comportamiento del `link_token`
- Solo se devuelve en la respuesta de `GET /v1/links/exchange?exchange_token=...`
- En cualquier otro endpoint (listado, actualización) siempre es `null`
- Debe guardarse de forma segura (aquí en `db.json`)

---

## 📦 Repositorio Git

```
URL:    https://github.com/jordicv/benthic-ops
Branch: main
Subpath: benthic-cashflow/
```

### Push al repositorio
```bash
cd C:\Users\Jose Valdes\Desktop\benthic-ops
git add .
git commit -m "descripcion del cambio"
git push origin main
```

---

## 🐛 Historial de Bugs Resueltos

### Bug 1: `POST /v1/link_intents/exchange` — Unrecognized request
**Causa:** Endpoint inventado que no existe en la API de Fintoc.  
**Fix:** Eliminado. El exchange correcto es `GET /v1/links/exchange?exchange_token=...`

### Bug 2: `Invalid link access token: *kdxy`
**Causa:** Se usaba el `exchange_token` del widget como path param en `GET /v1/links/{id}`.  
**Fix:** Pasarlo como query parameter al endpoint `/links/exchange`.

### Bug 3: `Invalid link access token: null`
**Causa:** `GET /v1/links?exchange_token=...` (endpoint de listado) devuelve `link_token: null` siempre.  
**Fix:** Usar el endpoint dedicado `GET /v1/links/exchange?exchange_token=...`.

### Bug 4: `exchangeToken is required`
**Causa:** El frontend enviaba el campo vacío o con nombre incorrecto.  
**Fix:** Verificar que el `onSuccess` del widget extrae `result.exchangeToken` (camelCase primero, luego `result.exchange_token`).

### Bug 5: Contraseña incorrecta en el widget
**Causa:** Usando `FINTOC_MODE=test` con credenciales reales de banco.  
**Fix:** Cambiar `FINTOC_MODE=live` en `.env` para conectar banco real.

---

## 🤖 Contexto para Continuar en Otra IA

Si vas a continuar este proyecto con otro LLM, comparte este archivo y los siguientes puntos clave:

1. **El endpoint de exchange** es `GET /v1/links/exchange?exchange_token=...` — no POST, no path param
2. **El `link_token`** solo viene en esa respuesta — en cualquier otro endpoint es `null`
3. **Movimientos** → `GET /v1/accounts/{accountId}/movements?link_token={linkToken}`
4. **Autenticación** Fintoc → header `Authorization: sk_live_...` (sin "Bearer")
5. **Chile**: solo Cuentas Corrientes y Vista — tarjetas de crédito no soportadas por Fintoc
6. **El widget** requiere `publicKey` (pk_) y `widgetToken` del link_intent — NO la secret key
7. **db.json** guarda los links con su `linkToken` para futuras consultas
8. **Navegador**: usar Firefox/Chrome. Brave y AdBlock bloquean `js.fintoc.com`
