# Control DM · Importación de dispositivos médicos (BPA / DIGEMID)

PWA local-first para el control de importación de dispositivos médicos desde la
óptica de un Director Técnico aplicando Buenas Prácticas de Almacenamiento (BPA)
según DIGEMID: ingresos, salidas, cuarentena/liberación, kardex por lote,
registros sanitarios con alerta de vencimiento, y respaldo en Google Drive.

🔗 **App publicada:** https://lancaster2995.github.io/ControlImport/

## Qué es y qué no es

- Toda la información (ingresos, salidas, registros sanitarios) se guarda en
  el propio navegador (IndexedDB). No hay servidor ni base de datos propia.
- Es instalable como app (PWA): "Agregar a pantalla de inicio" / "Instalar"
  desde el navegador, y funciona offline gracias al *service worker*.
- El respaldo en Google Drive es **opcional**. Si no lo activas, la app
  funciona igual, 100% local.
- No reemplaza los procedimientos, registros físicos ni obligaciones
  documentarias exigidas por DIGEMID — es una herramienta de apoyo al
  control interno.

## Estructura del repositorio

```
index.html              shell de la app (referencia styles.css y app.js)
styles.css               todos los estilos
app.js                    toda la lógica (estado, vistas, IndexedDB, Drive)
manifest.webmanifest      manifest de la PWA
sw.js                     service worker (caché del shell, offline)
favicon.ico
icons/
  icon.svg               fuente vectorial del ícono
  icon-512.png, icon-192.png, icon-180.png, icon-32.png, icon-16.png
```

No hay paso de build: son archivos estáticos servidos tal cual por GitHub Pages.

## Configurar el respaldo en Google Drive (obligatorio para esa función)

El botón **"Conectar Google Drive"** (pestaña *Exportar*) usa OAuth de Google
directamente desde el navegador (Google Identity Services), sin backend ni
client secret. El Client ID ya está en `app.js`:

```
270114483470-mo9q7kleiv625ajsu5vianf9p8thpoun.apps.googleusercontent.com
```

Para que funcione en tu dominio de GitHub Pages, en
[Google Cloud Console](https://console.cloud.google.com/) → el proyecto dueño
de ese Client ID:

1. **APIs y servicios → Biblioteca** → habilita **Google Drive API**.
2. **APIs y servicios → Credenciales** → abre ese OAuth Client ID (tipo
   *Aplicación web*) → en **Orígenes de JavaScript autorizados** agrega:
   ```
   https://lancaster2995.github.io
   ```
   (solo el origen, sin `/ControlImport/` al final).
3. **Pantalla de consentimiento OAuth**: si el proyecto está en modo
   *Testing*, agrega como **Usuario de prueba** la cuenta de Google con la
   que vayas a usar la app (si no, Google bloqueará el login).
4. Verifica que la carpeta de Drive
   ([abrir carpeta](https://drive.google.com/drive/folders/11vzDBygg7XxzlxQXv9NBXNafEQSG8U2w))
   pertenezca a (o esté compartida con permiso de edición a) esa misma
   cuenta de Google, porque la app crea ahí el archivo `respaldo_bpa.json`.

La app pide permiso solo sobre el archivo que ella misma crea (scope
`drive.file`), nunca acceso al resto del Drive del usuario.

**Limitación conocida:** el token de acceso dura ~1 hora. Si lo dejas
abierto más tiempo y sigues registrando movimientos, la sincronización en
segundo plano puede fallar silenciosamente (se loggea en consola); basta con
tocar **"Sincronizar ahora"** para renovar la sesión y seguir.

## Desarrollo local

No requiere instalar nada; sirve los archivos estáticos con cualquier
servidor simple (el *service worker* y el login de Google necesitan
`http://localhost` o HTTPS, no funcionan abriendo el HTML con `file://`):

```bash
python3 -m http.server 8000
# abrir http://localhost:8000
```

## Actualizar el catálogo de productos

El selector de "Producto" en Ingresos/Salidas usa un catálogo estático
embebido en `app.js` (`PRODUCT_CATALOG`), generado a partir de un Excel de
registros DIGEMID vigentes. Para actualizarlo, regenera ese arreglo desde el
Excel de origen y reemplázalo en `app.js`.

## Publicar una actualización

GitHub Pages sirve el contenido tal cual al hacer push a la rama
configurada. Si cambias `index.html`, `styles.css`, `app.js` o los íconos,
sube también la versión de caché en `sw.js` (`CACHE_VERSION`) para que los
usuarios con la PWA ya instalada reciban la actualización.
