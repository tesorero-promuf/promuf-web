# Sistema Gremial PROMUF 🎵

Portal único de la **Asociación Civil de Profesionales de la Música del Estado Falcón (PROMUF)**. Un solo enlace para los agremiados: tesorería transparente, carnet digital y los módulos de gestión que vayan naciendo.

**URL pública:** `https://tesorero-promuf.github.io/promuf-web/`

---

## Arquitectura

```
promuf-web/
├── index.html            Shell del sistema (cabecera + navegación + pie)
├── css/estilos.css       Sistema de diseño compartido (variables PROMUF)
├── js/shell.js           Router por hash + render de Inicio + carga de módulos
├── modulos.json          REGISTRO de módulos → la navegación se genera sola
├── config.json           Config central: Firebase, avisos
├── data/                 Datos CSV de respaldo (movimientos, fondos, conciliación)
├── scripts/sync_data.mjs Sincronización con Firebase Firestore
├── docs/                 Documentos oficiales (acta y reglamentos en PDF)
└── modulos/              Cada módulo es una carpeta autocontenida
    ├── inicio/           (lo renderiza el shell, no es un iframe)
    └── tesoreria/        Dashboard de Tesorería y Transparencia
```

- **Todo el sistema es estático** (GitHub Pages) y los datos viven en **Firebase Firestore**.
- **`modulos.json` es el corazón escalable**: agregar un módulo nuevo = crear su carpeta + agregar una línea aquí. La navegación, el Inicio y los enlaces se generan automáticamente.
- Cada módulo es **autocontenido** (HTML + CSS + JS propio) y se carga en un iframe del shell con auto-alto; usa las variables del design system (`css/estilos.css`) para mantener la identidad visual.

## Cómo agregar un módulo nuevo (patrón en 3 pasos)

1. **Crea la carpeta** `modulos/<id>/index.html` con tu app (puede tener su propio `<style>` y `<script>`, como la tesorería).
2. **Regístrala en `modulos.json`**:
   ```json
   {"id": "mi_modulo", "nombre": "Mi Módulo", "icono": "📦",
    "estado": "listo", "color": "#3fd0c9", "desc": "Qué hace"},
   ```
   - `estado: "proximamente"` la muestra como "pronto" (deshabilitada).
3. **Publica** por PR (la rama `main` está protegida) y ya aparece en la navegación.

Acceso: los módulos listos se abren en `#/<id>` (ej. `#/tesoreria`). El módulo `inicio` es especial: lo dibuja el shell.

## Config central (`config.json`)

- `firebase`: configuración del proyecto **Firebase** (projectId, credenciales).
- `avisos`: anuncios editables **sin tocar código** (tipos: `aviso`, `novedad`, `importante`, `evento`). Se muestran en el Inicio (máx. 5, los más recientes).
- `live`: activa/desactiva la escucha en tiempo real de Firestore.

## Acceso público vs privado

- Cualquiera que abra el sistema ve la versión **pública** (solo lectura) — Transparencia Radical (Art. 4.1 R.CC).
- El Tesorero usa `?priv=1` en la URL para ver su vista administrativa:
  `https://tesorero-promuf.github.io/promuf-web/?priv=1#/tesoreria`

## Módulo: Pagos de Membresía (`modulos-pagos/`)

Permite a cualquier socio reportar el pago de su mensualidad (banco, referencia, fecha y monto) sin necesidad de crear una cuenta. El Tesorero valida cada reporte desde un panel dentro del mismo módulo.

**Flujo:**
1. El socio llena el formulario → se guarda en Firestore (`pagos_membresia`) con `estado: "pendiente"`.
2. El sistema le da un código de referencia (el ID del documento) que puede usar en la pestaña "Mis reportes" para ver el estado más adelante, desde el mismo navegador.
3. El Tesorero (autenticado igual que en Tesorería) ve la cola de pendientes en "Panel del Tesorero" y **Aprueba** o **Rechaza** (con motivo).
4. Al aprobar, el socio ve en "Mis reportes": **"Su pago fue procesado exitosamente"**.

**Cómo se protege sin que el socio tenga cuenta:** el navegador abre una sesión anónima de Firebase Auth (invisible, sin pantalla de login) apenas carga el módulo. Eso le da un UID técnico que las reglas usan para permitir: crear su propio reporte (siempre en `pendiente`, nunca puede auto-aprobarse) y leer solo lo que él mismo creó. Solo una cuenta que esté en la colección `admins` (la del Tesorero) puede ver todos los reportes y cambiar su estado — mismo mecanismo que ya protege Tesorería.

### Puesta en marcha del módulo de Pagos (una sola vez, en la consola de Firebase)

1. **Habilitar acceso anónimo** — *Authentication* → *Sign-in method* → activa **Anónimo**. Esto es lo que permite a cualquier socio reportar un pago sin crear cuenta.
2. **Volver a publicar `firestore.rules`** — ya lo hiciste una vez para Tesorería; este archivo ahora incluye también las colecciones `pagos_membresia` y `socios`, así que hay que publicarlo de nuevo con la versión actualizada.
3. Los mismos usuarios de la colección `admins` (ver sección de Tesorería más abajo) son quienes ven el "Panel del Tesorero" en este módulo — no hace falta configurar nada adicional para el Tesorero.

## Colección `socios`: el vínculo entre Pagos y Carnetización

`socios/{cedula}` (documento clave = cédula normalizada) es la ficha central de cada agremiado. Se llena desde dos lugares distintos:

- **Automáticamente**, cuando el Tesorero aprueba un pago en el módulo de Pagos: se actualiza (o crea) el campo `mes_pagado_hasta` con el mes más reciente cubierto. Esto ocurre dentro de la misma transacción que registra el movimiento contable, así que nunca queda desincronizado.
- **A mano**, desde el módulo de Carnetización (`modulos-carnet/`), donde el Tesorero completa los datos que no vienen de un pago: nombre, cargo, número de carnet, período de vigencia y foto.

La membresía **no se marca como "activa/inactiva" de forma fija** — se calcula al momento de mostrarla, comparando `mes_pagado_hasta` contra el mes actual. Esto evita el bug típico de un campo que nunca se "desactiva" solo si el socio deja de pagar.

## Módulo: Carnetización Digital (`modulos-carnet/`)

Reemplaza el flujo anterior (Google Apps Script + Google Sheets + fotos como archivos sueltos en `carnet-digital/assets/fotos/`) por el mismo esquema de Firebase que ya usan Tesorería y Pagos — **sin usar Firebase Storage**, porque el proyecto está en el plan gratuito (Spark) y Storage requiere el plan de pago (Blaze).

**Cómo se evita Storage:** la foto se redimensiona y comprime en el propio navegador (canvas a ~320px, JPEG calidad 0.6) y se guarda como texto base64 **dentro del mismo documento** de `socios`. Un documento de Firestore admite hasta 1 MB; una foto de carnet comprimida así ronda 20–80 KB, muy por debajo del límite.

**Tres vistas dentro del mismo módulo:**
1. **Mi carnet** (pública): el socio escribe su cédula, ve su carnet y puede descargarlo como PDF con el tamaño exacto de una tarjeta PVC (CR80, 54×85.6mm) para imprimir.
2. **Gestión de socios** (solo Tesorero, mismo login que en los otros módulos): crea o edita la ficha de un socio — nombre, cargo, número de carnet, vigencia y foto.
3. **Verificación pública** (`?verificar=<cedula>`, es el enlace que codifica el QR del carnet): cualquiera que escanee el carnet físico ve, sin iniciar sesión, si el carnet está vigente y si el socio está al día con su membresía — sin poder editar nada.

### Puesta en marcha del módulo de Carnetización

No hace falta activar nada nuevo en Firebase: usa la misma autenticación anónima y la misma cuenta de `admins` que ya configuraste para Pagos. Solo asegúrate de haber publicado la versión más reciente de `firestore.rules` (incluye la colección `socios`).

**Nota:** el repositorio anterior `carnet-digital` (Google Apps Script) queda como respaldo histórico; no se migran automáticamente las fichas ni las fotos que ya existían ahí — hay que recargarlas a mano una vez en "Gestión de socios".

## Repos de origen (respaldo)

- [promuf-transparencia](https://github.com/tesorero-promuf/promuf-transparencia) — dashboard original de tesorería (migrado a `modulos/tesoreria/`).
- [carnet-digital](https://github.com/tesorero-promuf/carnet-digital) — pendiente de migrar.

## Seguridad

- Rama `main` protegida: todo cambio pasa por Pull Request (sin push directo ni force-push).
- **Firestore con reglas reales** (`firestore.rules` en la raíz): lectura pública (transparencia), escritura solo para el Tesorero autenticado. Antes solo estaban las reglas de prueba por defecto de Firebase (abiertas a cualquiera y con fecha de expiración) — quedaron reemplazadas.
- **Autenticación real con Firebase Auth**: el módulo de Tesorería ya no distingue "público" de "administrativo" por un parámetro de la URL (`?priv=1` era solo una capa visual, no una protección). Ahora arranca siempre en modo público de solo lectura y solo se desbloquea la vista administrativa con una sesión válida de Firebase Auth, verificada además del lado del servidor por las reglas de Firestore.
- Módulo de Tesorería con **Auditoría de integridad**: detecta eliminaciones o modificaciones en la base de datos entre cargas.

### Puesta en marcha del acceso del Tesorero (una sola vez, desde la consola de Firebase)

1. **Habilitar el método de acceso** — Firebase Console → *Authentication* → *Sign-in method* → activa **Correo electrónico/contraseña**. Desactiva el auto-registro público si aparece esa opción; las cuentas se crean a mano.
2. **Crear la cuenta del Tesorero** — *Authentication* → *Users* → *Add user*, con el correo y una contraseña fuerte. Copia el **UID** que se genera.
3. **Autorizar ese UID como admin** — *Firestore Database* → crea la colección `admins` → documento con **ID = el UID copiado** → cualquier campo, p. ej. `{ rol: "tesorero" }`.
4. **Publicar las reglas** — *Firestore Database* → *Rules* → pega el contenido de `firestore.rules` de este repo → *Publish*. Debe hacerse **antes del 4 de octubre de 2026**, fecha en la que expiran las reglas de prueba actuales y Firestore empezará a rechazar todas las peticiones (lectura incluida).
5. En el sitio, entra a `#/tesoreria` y usa el botón **🔑 Iniciar sesión (Tesorero)** con ese correo y contraseña.

Si alguien inicia sesión con una cuenta que no está en `admins`, la sesión es válida pero Firestore rechazará cualquier escritura (permission-denied): la protección real vive en las reglas, no en la interfaz.
