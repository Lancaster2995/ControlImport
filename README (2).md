# Control DM · Importación BPA

App web (PWA instalable) para control local de importación de dispositivos
médicos según Buenas Prácticas de Almacenamiento (BPA) DIGEMID: ingresos,
salidas, cuarentena, kardex y registros sanitarios.

## Estructura del proyecto

```
.
├── index.html                     punto de entrada
├── manifest.webmanifest           manifest de la PWA
└── assets/
    ├── css/
    │   └── styles.css             estilos
    ├── js/
    │   ├── theme-init.js          aplica tema claro/oscuro antes del render
    │   ├── pwa-register.js        registra el Service Worker (offline/cache)
    │   ├── pwa-install-banner.js  banner "Instalar app"
    │   └── app.js                 lógica principal (vistas, datos, auth)
    └── icons/                     íconos PNG + favicon
```

Todo es HTML/CSS/JS plano, sin build step ni dependencias de npm. Los únicos
scripts externos son Firebase (auth + Firestore) y Google Identity Services,
cargados por CDN en `index.html`.

## Funcionalidad

- Login con correo/contraseña o Google (Firebase Auth).
- Permiso de Google Drive para adjuntar DUA/Guía/Invoice.
- Vistas: Panel, Ingresos, Salidas, Clientes/Proveedores, Cuarentena.
- Tema claro/oscuro persistente (`localStorage`).
- Instalable como PWA (manifest + Service Worker con cache offline del shell).

## Configuración

La config de Firebase está en `assets/js/app.js` (búsca `firebaseConfig` /
`apiKey`). Si vas a usar tu propio proyecto de Firebase, reemplázala ahí.

Las claves `apiKey` de Firebase para apps web son públicas por diseño; la
seguridad real se controla con las reglas de Firestore/Auth, no ocultando
la key.

## Cómo correrlo local

No requiere servidor especial, pero para que el Service Worker y el manifest
funcionen bien conviene servirlo por HTTP (no `file://`):

```bash
python3 -m http.server 8000
# abrir http://localhost:8000
```

## Deploy

Estático puro → sirve directo con GitHub Pages, Netlify, Vercel o cualquier
hosting estático. Solo asegúrate de subir la carpeta `assets/` completa junto
al `index.html` y `manifest.webmanifest`, manteniendo la misma estructura de
rutas (son relativas).

## Notas

- Antes el manifest y los íconos venían embebidos en base64 dentro del propio
  `index.html` (pesaba ~1.5MB). Se separaron en archivos reales bajo
  `assets/` y se optimizaron los PNG, bajando el peso total a ~460KB sin
  cambiar la funcionalidad.
