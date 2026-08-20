# Sistema Gremial PROMUF 🎵

Portal único de la **Asociación Civil de Profesionales de la Música del Estado Falcón (PROMUF)**.
Un solo enlace para los agremiados: tesorería transparente, carnet digital y los módulos de gestión que vayan naciendo.

**URL pública:** `https://tesorero-promuf.github.io/promuf-web/`

---

## Arquitectura

```
promuf-web/
├── index.html            Shell del sistema (cabecera + navegación + pie)
├── css/estilos.css       Sistema de diseño compartido (variables PROMUF)
├── js/shell.js           Router por hash + render de Inicio + carga de módulos
├── modulos.json          REGISTRO de módulos → la navegación se genera sola
├── config.json           Config central: URLs de hojas, API, token y avisos
├── docs/                 Documentos oficiales (acta y reglamentos en PDF)
└── modulos/              Cada módulo es una carpeta autocontenida
    ├── inicio/           (lo renderiza el shell, no es un iframe)
    └── tesoreria/        Dashboard de Tesorería y Transparencia
```

- **Todo el sistema es estático** (GitHub Pages) y los datos viven en **Google Sheets** + **Apps Script**.
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

- `avisos`: anuncios editables **sin tocar código** (tipos: `aviso`, `novedad`, `importante`, `evento`). Se muestran en el Inicio (máx. 5, los más recientes).
- `mov` / `fondos` / `conc`: URLs publicadas (CSV) de las pestañas de la hoja.
- `api` / `api_token`: API Apps Script de la tesorería y su token de blindaje.

## Acceso público vs privado

- Cualquiera que abra el sistema ve la versión **pública** (solo lectura) — Transparencia Radical (Art. 4.1 R.CC).
- El Tesorero usa `?priv=1` en la URL para ver su vista administrativa:
  `https://tesorero-promuf.github.io/promuf-web/?priv=1#/tesoreria`

## Repos de origen (respaldo)

- [promuf-transparencia](https://github.com/tesorero-promuf/promuf-transparencia) — dashboard original de tesorería (migrado a `modulos/tesoreria/`).
- [carnet-digital](https://github.com/tesorero-promuf/carnet-digital) — pendiente de migrar.

## Seguridad

- Rama `main` protegida: todo cambio pasa por Pull Request (sin push directo ni force-push).
- API con token de acceso + validación de campos; la hoja conserva historial de versiones.
- Módulo de Tesorería con **Auditoría de integridad**: detecta eliminaciones o modificaciones en la hoja entre cargas.