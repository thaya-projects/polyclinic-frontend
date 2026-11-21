// Tabla de abreviaturas estándar ("Quintales" -> "qq"), no un cálculo. Sin match
// conocido no se inventa nada: el usuario lo completa a mano.
const KNOWN_UNIT_CODES: Record<string, string> = {
  quintal: 'qq', quintales: 'qq',
  kilogramo: 'kg', kilogramos: 'kg', kilo: 'kg', kilos: 'kg',
  gramo: 'g', gramos: 'g',
  miligramo: 'mg', miligramos: 'mg',
  tonelada: 't', toneladas: 't',
  litro: 'l', litros: 'l',
  mililitro: 'ml', mililitros: 'ml',
  centilitro: 'cl', centilitros: 'cl',
  metro: 'm', metros: 'm',
  centimetro: 'cm', centimetros: 'cm',
  milimetro: 'mm', milimetros: 'mm',
  unidad: 'u', unidades: 'u',
  caja: 'cj', cajas: 'cj',
  paquete: 'paq', paquetes: 'paq',
  docena: 'dz', docenas: 'dz',
  par: 'par', pares: 'par',
  frasco: 'fco', frascos: 'fco',
  ampolla: 'amp', ampollas: 'amp',
  tableta: 'tab', tabletas: 'tab',
  comprimido: 'comp', comprimidos: 'comp',
  capsula: 'cap', capsulas: 'cap',
  sobre: 'sob', sobres: 'sob',
  rollo: 'rl', rollos: 'rl',
  galon: 'gal', galones: 'gal',
};

function normalize(name: string): string {
  return name
    .trim()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

export function suggestUnitCode(name: string): string | null {
  return KNOWN_UNIT_CODES[normalize(name)] ?? null;
}
