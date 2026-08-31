const WALLET_MIN = 1;
const WALLET_MAX = 840;

// Normaliza texto libre a un walletNumber válido de 3 dígitos
// ("001".."840"), o null si no cae en rango. Mismo criterio que
// IsWalletNumber en el backend (src/common/validators/is-wallet-number.validator.ts).
export function padWallet(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return null;

  const numeric = Number(digits);
  if (numeric < WALLET_MIN || numeric > WALLET_MAX) {
    return null;
  }

  return String(numeric).padStart(3, '0');
}
