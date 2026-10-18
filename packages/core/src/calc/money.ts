// Exact money arithmetic. Prices are decimal strings with up to 12 decimals (schema), so amounts are held as integer
// "pico" units (1e-12 of the record's currency) in a bigint: no floating point, no rounding until display. The ledger
// and usage rows use whole micro-units (1e-6), converted here with round-half-up.

export const PICO_PER_UNIT = 1_000_000_000_000n;
export const PICO_PER_MICRO = 1_000_000n;

/** "2.50" -> 2_500_000_000_000n. Throws on anything that is not a plain non-negative decimal with at most 12 places. */
export function decimalToPico(decimal: string): bigint {
  const m = /^(\d+)(?:\.(\d{1,12}))?$/.exec(decimal);
  if (!m) throw new RangeError(`not a non-negative decimal with at most 12 decimal places: "${decimal}"`);
  const whole = BigInt(m[1] as string);
  const frac = (m[2] ?? '').padEnd(12, '0');
  return whole * PICO_PER_UNIT + BigInt(frac);
}

/** A finite non-negative JavaScript number (user input such as a monthly ceiling) to pico units, rounded to 6 places. */
export function numberToPico(n: number): bigint {
  if (!Number.isFinite(n) || n < 0) throw new RangeError(`not a finite non-negative number: ${n}`);
  return decimalToPico(n.toFixed(6));
}

/** Round half up to whole micro-units (for the ledger and usage rows). */
export function picoToMicro(pico: bigint): bigint {
  return (pico + PICO_PER_MICRO / 2n) / PICO_PER_MICRO;
}

/** Plain-decimal display, trimmed: 2_500_000_000_000n -> "2.5". Used for text that must match a record value (G3). */
export function formatPico(pico: bigint): string {
  const whole = pico / PICO_PER_UNIT;
  const frac = (pico % PICO_PER_UNIT).toString().padStart(12, '0').replace(/0+$/, '');
  return frac === '' ? whole.toString() : `${whole}.${frac}`;
}
