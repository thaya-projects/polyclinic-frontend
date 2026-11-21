// Genera el código de material a partir del nombre: sin acentos, mayúsculas, separado por guiones.
// No es aleatorio ni numerado — si dos materiales comparten nombre, el backend devuelve 409 (código duplicado).
export function generateMaterialCode(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 30);
}
