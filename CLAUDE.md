# MedConnect Frontend — Convenciones

## Estructura de carpetas de componentes

Cada componente vive en su **propia carpeta**, con su `.ts` y su `.html` (y su `.css` si aplica) juntos ahí adentro. No se amontonan varios componentes sueltos dentro de una carpeta de feature compartida.

Patrón de referencia: `src/app/feature/auth/login/` y `src/app/feature/auth/superadmin-login/` — cada pantalla tiene su propia carpeta.

Mal ejemplo (no repetir): `src/app/feature/superadmin/tenants/` tenía ~7 componentes (`tenants-page`, `tenants-table`, `tenants-filters`, `create-tenant-form`, `edit-tenant-form`, `tenant-detail-page`, `subscription-status-badge`) todos sueltos directamente dentro de `tenants/`, sin sub-carpeta propia cada uno.

Al crear un componente nuevo: `feature/<area>/<nombre-componente>/<nombre-componente>.ts` + `.html`.

## Estilos: Tailwind puro

Usar clases de Tailwind directamente en el template. Solo si es estrictamente necesario un CSS custom (algo que Tailwind no puede resolver con utilidades), ese CSS debe vivir en su **propio archivo `.css`** referenciado vía `styleUrl`/`styleUrls` — nunca inline con `styles: [...]` en el decorador del componente.
