import {
  ToothCondition, buildOdontogramPaint, faceForSurface, isValidFdiForDentition, surfaceForFace,
} from './tooth-condition.model';

describe('tooth-condition.model', () => {
  it('isValidFdiForDentition: permanente 11-18/21-28/31-38/41-48, temporal 51-55/61-65/71-75/81-85, mixta ambas', () => {
    const permanent = [1, 2, 3, 4].flatMap(q => Array.from({ length: 8 }, (_, i) => q * 10 + i + 1));
    const temporary = [5, 6, 7, 8].flatMap(q => Array.from({ length: 5 }, (_, i) => q * 10 + i + 1));
    const all = Array.from({ length: 100 }, (_, i) => i);
    expect(all.filter(f => isValidFdiForDentition(f, 'permanent'))).toEqual(permanent);
    expect(all.filter(f => isValidFdiForDentition(f, 'temporary'))).toEqual(temporary);
    expect(all.filter(f => isValidFdiForDentition(f, 'mixed'))).toEqual([...permanent, ...temporary]);
    expect(isValidFdiForDentition(11.5, 'mixed')).toBe(false);
  });

  it('surfaceForFace: vestibular afuera, palatino/lingual adentro, mesial hacia la línea media', () => {
    // 16: superior derecho (mitad izquierda de la pantalla), posterior.
    expect(['top', 'bottom', 'left', 'right', 'center'].map(f => surfaceForFace(16, f as never)))
      .toEqual(['vestibular', 'palatino', 'distal', 'mesial', 'oclusal']);
    // 31: inferior izquierdo (mitad derecha de la pantalla), anterior.
    expect(['top', 'bottom', 'left', 'right', 'center'].map(f => surfaceForFace(31, f as never)))
      .toEqual(['lingual', 'vestibular', 'mesial', 'distal', 'incisal']);
  });

  it('faceForSurface es la inversa; whole y cervical no son una cara', () => {
    for (const fdi of [16, 21, 31, 46, 54, 75]) {
      for (const face of ['top', 'bottom', 'left', 'right', 'center'] as const) {
        expect(faceForSurface(fdi, surfaceForFace(fdi, face))).toBe(face);
      }
    }
    expect(faceForSurface(16, 'whole')).toBeNull();
    expect(faceForSurface(16, 'cervical')).toBeNull();
  });

  it('buildOdontogramPaint: whole de fondo, caras encima, cervical aparte; gana la más reciente', () => {
    const mark = (id: string, fdi: number, surface: ToothCondition['surface'], conditionId: string, at: string): ToothCondition =>
      ({ id, odontogram_id: 'o', tooth_fdi: fdi, surface, condition_id: conditionId, state: 'existing', note: null,
        created_at: at, created_by: 'u' });
    const colors: Record<string, string | null> = { a: '#111111', b: '#222222', c: null };
    const paint = buildOdontogramPaint([
      mark('2', 16, 'oclusal', 'b', '2026-01-02'),
      mark('1', 16, 'oclusal', 'a', '2026-01-01'),
      mark('3', 16, 'whole', 'a', '2026-01-03'),
      mark('4', 16, 'cervical', 'b', '2026-01-04'),
      mark('5', 21, 'mesial', 'c', '2026-01-05'),
    ], id => colors[id]);
    expect(paint[16]).toEqual({ whole: '#111111', cervical: '#222222', faces: { center: '#222222' } });
    expect(paint[21].faces).toEqual({ left: '#9E9E9E' });
  });
});
