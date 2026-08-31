import { describe, expect, it } from 'vitest';
import { padWallet } from './wallet';

describe('padWallet', () => {
  it('rellena con ceros a la izquierda hasta 3 dígitos', () => {
    expect(padWallet('7')).toBe('007');
    expect(padWallet('42')).toBe('042');
    expect(padWallet('120')).toBe('120');
  });

  it('extrae solo los dígitos de texto libre', () => {
    expect(padWallet('cartera 7')).toBe('007');
  });

  it('devuelve null para texto vacío o sin dígitos', () => {
    expect(padWallet('')).toBeNull();
    expect(padWallet('abc')).toBeNull();
  });

  it('devuelve null fuera de rango (0 o mayor a 840)', () => {
    expect(padWallet('0')).toBeNull();
    expect(padWallet('841')).toBeNull();
    expect(padWallet('9999')).toBeNull();
  });

  it('acepta los límites del rango', () => {
    expect(padWallet('1')).toBe('001');
    expect(padWallet('840')).toBe('840');
  });
});
