# Optimización de rendimiento — Benthic OPS

> Auditoría y optimización del sitio (Astro 7 + Tailwind 4).
> Fecha: **2026-07-01**

---

## 📊 Resumen ejecutivo

| Métrica | Antes | Después | Mejora |
|---|---|---|---|
| **Carga inicial de la home** | ~4.8 MB | **~1.3 MB** | **−73 %** |
| …antes de que entre el vídeo hero | — | **~460 KB** | — |
| Fondos (3 imágenes) | ~2.36 MB JPG | **~172 KB** WebP | −93 % |
| Logo + favicon | 163 KB PNG | **~3 KB** | −98 % |
| Google Fonts (render-blocking, 3rd party) | Sí | **No** (auto-hospedadas) | — |
| Vídeo medusas en carga inicial | 1.5 MB (eager) | **0** (bajo demanda) | −100 % |
| `public/` (repo) | 13.8 MB | 8.6 MB | −38 % |
| Assets muertos en el deploy | ~5.8 MB | 0 | — |

**Diagnóstico:** el sitio tenía muy buen diseño pero estaba mal optimizado — priorizaba el efecto visual (vídeos, blur, animaciones) sobre el rendimiento. Se auditó con un proceso multi-agente que produjo **49 hallazgos verificados**; se resolvieron los de **prioridad alta**.

---

## 🔍 Diagnóstico inicial (auditoría)

Auditoría por dimensiones con verificación adversarial de cada hallazgo (49 confirmados, 2 descartados).

### Prioridad ALTA (resueltos ✅)
1. **~5.8 MB de assets muertos** enviados al build (nunca referenciados).
2. **4 JPG de fondo sin optimizar** (~3.1 MB) servidos a resolución completa, sin WebP/AVIF.
3. **Vídeo medusas (1.5 MB) autoplay eager** en 4 páginas aunque está bajo el pliegue.
4. **Sin optimización de imágenes de Astro** (`astro:assets`/`<Image>` sin usar).
5. **Google Fonts render-blocking** (9 pesos, 2 orígenes de terceros).
6. **PNG de 163 KB** usado como favicon y logo 48×48 (era un original de 1024×1024).
7. **Handler de scroll sin throttle** → `querySelectorAll` + `getBoundingClientRect` + escrituras en cada evento (*layout thrashing*).
8. **`prefers-reduced-motion` ignorado** → ~18 animaciones infinitas + vídeos siempre activos.

### Prioridad MEDIA / BAJA (pendientes ⏳)
- `backdrop-filter: blur()` en 7+ capas, incl. navbar con blur durante el scroll.
- Animación `box-shadow` infinita en el botón de WhatsApp (repinta cada frame).
- `will-change` permanente en decenas de elementos `.reveal`.
- Canvas NeuralNetwork: bucle O(n²) (~1128 cálculos/frame) + `createRadialGradient` por frame; DPR sin capar.
- Sin `prefetch` ni view transitions entre páginas.
- Sin `@astrojs/sitemap` ni `site` configurado.
- Sin headers de caché/compresión (depende del host).
- `onsubmit` inline + global en `window` en los formularios (frágil / hostil a CSP).
- **El formulario de contacto no tiene backend** (`// UI demo — no backend yet`): no envía nada.

### Descartados (falsos positivos)
- "Layout shift (CLS) por vídeos/fondos sin dimensiones" → **no ocurre**: los `.section-bg` son `position:absolute` y no desplazan contenido. **El sitio no tiene problema de CLS.**

---

## 🛠️ Cambios aplicados

### 1. Assets muertos eliminados (~5.8 MB)
Borrados por estar sin referenciar en el código:
- `public/videos/orca-swim.webm` (4.9 MB) y `orca-swim.mp4` (era una página HTML de error, no un vídeo)
- `public/orca-black.png` (108 KB)
- `public/bg-contact.jpg` (784 KB) + su regla CSS huérfana `.section-bg-contact`
- `public/favicon.ico` y `public/favicon.svg` (placeholders por defecto de Astro)

### 2. Imágenes optimizadas con `sharp`
Regeneradas a WebP (los fondos van tras overlays oscuros, admiten compresión agresiva):

| Asset nuevo | Origen | Peso |
|---|---|---|
| `bg-hero.webp` | bg-hero.jpg (731 KB) | **56.6 KB** |
| `bg-bio.webp` | bg-bio.jpg (897 KB) | **76.8 KB** |
| `bg-abyss.webp` | bg-abyss.jpg (736 KB) | **38.6 KB** |
| `orca-logo.webp` (96 px) | orca-color.png (163 KB) | **2.3 KB** |
| `favicon-32.png` | orca-color.png | **0.9 KB** |
| `apple-touch-icon.png` | orca-color.png | **11.2 KB** |
| `poster-ocean.webp` | bg-abyss.jpg | **12.3 KB** |

> Los JPG originales se conservan como *fallback* en `image-set()`; ningún navegador moderno los descarga.

### 3. Fondos CSS → `image-set()` (`src/styles/global.css`)
```css
.section-bg-hero {
  background-image: url('/bg-hero.jpg');                       /* fallback */
  background-image: image-set(url('/bg-hero.webp') type('image/webp'),
                              url('/bg-hero.jpg')  type('image/jpeg'));
}
/* idem bio, abyss */
```

### 4. Favicon y logo (`src/layouts/Layout.astro`)
- `rel="icon"` → `favicon-32.png` (+ `apple-touch-icon`).
- Logo del navbar → `orca-logo.webp` (2.3 KB en vez de 163 KB).

### 5. Vídeos: carga diferida + reproducción por visibilidad
- `preload="none"` + `poster="/poster-ocean.webp"` en hero (`index.astro`) y medusas (`ContactForm.astro`).
- Se eliminó `autoplay`; ahora `IntersectionObserver` reproduce/pausa según visibilidad:
  - **Hero:** se pausa al salir de pantalla (ahorro de batería).
  - **Medusas:** `rootMargin: '1200px'` → se precarga **antes** de ser visible (llega con el búfer lleno, sin tirones) y no se descarga en la carga inicial de la home.

### 6. Fuentes auto-hospedadas (`Fontsource`)
- Añadidas `@fontsource/inter` y `@fontsource/space-grotesk` (deps).
- Importadas en el frontmatter de `Layout.astro`; se quitó el `<link>` render-blocking de Google Fonts + los `preconnect`.
- Resultado: mismos pesos, same-origin, sin bloqueo de render, solo el subset latino se descarga.

### 7. Handler de scroll optimizado (`src/layouts/Layout.astro`)
- NodeList `.section-bg` cacheado (antes se re-consultaba en cada evento).
- Listener `{ passive: true }`, trabajo coalescido en un único `requestAnimationFrame` con guard.
- Separadas las **lecturas** (medidas) de las **escrituras** → se elimina el *layout thrashing*.

### 8. `prefers-reduced-motion` (`global.css` + JS)
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.001ms !important;
  }
  .load-fade-in, .reveal { opacity: 1 !important; transform: none !important; } /* no ocultar contenido */
}
```
- Gate en JS: el canvas de NeuralNetwork dibuja un frame estático (sin bucle rAF), el parallax y los vídeos no arrancan.

### 9. Fluidez del vídeo de medusas (ajuste posterior)
Con `ffprobe` se comparó con el vídeo hero (que va perfecto):

| | Hero (orca) | Medusas |
|---|---|---|
| FPS del archivo | **60 fps** | **30 fps** |
| Velocidad | 0.55x | 0.30x → **0.80x** |
| **FPS visibles** | ~33 fps ✅ | ~9 fps ❌ → **~24 fps ✅** |

**Causa:** el hero puede ralentizarse a 0.55x y verse suave porque tiene 60 fps; medusas (30 fps) a 0.30x caía a ~9 fps = a saltos. **Arreglo:** `playbackRate` 0.30 → **0.80** (24 fps, fluido nivel cine) + fundido de bucle restaurado como el hero. (`ContactForm.astro`)

### Extra
- Corregidos 2 errores de tipo preexistentes en el CTA de WhatsApp (optional chaining) → `astro check` limpio.

---

## 📁 Archivos tocados

```
 M package.json                       (+ @fontsource/inter, @fontsource/space-grotesk)
 M src/layouts/Layout.astro           (fuentes, favicon, logo, scroll rAF)
 M src/styles/global.css              (image-set, prefers-reduced-motion, -contact)
 M src/pages/index.astro              (vídeo hero: preload/poster/IO)
 M src/components/ContactForm.astro   (vídeo medusas: preload/poster/IO/velocidad/fade)
 M src/components/NeuralNetwork.astro (gate de reduced-motion en el rAF)
 D public/bg-contact.jpg, orca-black.png, favicon.ico, favicon.svg,
   videos/orca-swim.{webm,mp4}
 + public/bg-{hero,bio,abyss}.webp, orca-logo.webp, favicon-32.png,
   apple-touch-icon.png, poster-ocean.webp
```

---

## ✅ Verificación
- `npm run build` → OK (6 páginas).
- `npx astro check` → **0 errores, 0 warnings**.
- Preview en vivo: consola sin errores, sin peticiones fallidas.
- Red confirmada: 0 llamadas a Google Fonts, solo subset latino, fondos en WebP, medusas no se descarga hasta hacer scroll.

---

## 📦 Peso final del despliegue (`dist/`)

- **Total:** 10.0 MB — de los cuales **5.78 MB son vídeos** (bajo demanda) y **~2.36 MB son los JPG de respaldo** que los navegadores modernos no descargan.
- **Carga real de la home:** ~460 KB antes del vídeo, ~1.3 MB con el vídeo hero.

**Opción pendiente:** borrar los JPG de respaldo (`bg-*.jpg`) — WebP tiene ~99 % de soporte — dejaría el deploy en **~7.6 MB** sin afectar a ningún visitante.

---

## 🔧 Notas técnicas

### Regenerar imágenes optimizadas
Con `sharp` (ya instalado). Ejemplo para un fondo:
```js
import sharp from 'sharp';
await sharp('public/bg-hero.jpg')
  .resize({ width: 1920, withoutEnlargement: true })
  .webp({ quality: 60 })
  .toFile('public/bg-hero.webp');
```

### Ajustar velocidad del vídeo de medusas
En `src/components/ContactForm.astro`: `video.playbackRate = 0.8;`
- `0.8` = 24 fps (recomendado) · `1.0` = 30 fps (velocidad real).
- Por debajo de ~0.8x vuelve a saltar (el archivo es de 30 fps). Para un slow-motion más marcado y fluido haría falta un clip de origen a 60 fps.

---

## ⏳ Trabajo pendiente sugerido (prioridad media/baja)
1. Reducir el radio de `backdrop-filter: blur()` y evitar el blur del navbar durante el scroll.
2. Sustituir la animación `box-shadow` del botón WhatsApp por `transform`/`opacity`.
3. Quitar el `will-change` permanente de `.reveal` (aplicarlo solo durante la animación).
4. Canvas NeuralNetwork: capar `devicePixelRatio` a 2 y cachear los gradientes.
5. Activar `prefetch` de Astro y considerar view transitions.
6. Añadir `@astrojs/sitemap` + `site` en `astro.config.mjs`.
7. Conectar el formulario de contacto a un backend real (hoy es solo UI).
8. (Opcional) Borrar los JPG de respaldo para aligerar el deploy.
