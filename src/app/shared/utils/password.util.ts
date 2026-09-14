// Excluye caracteres visualmente ambiguos (0/O, 1/l/I).
const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';

// TODO: 8 caracteres por ahora; ajustar longitud/reglas cuando se defina
// la política real de contraseñas.
export function generateRandomPassword(length = 8): string {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += CHARSET[Math.floor(Math.random() * CHARSET.length)];
  }
  return result;
}
