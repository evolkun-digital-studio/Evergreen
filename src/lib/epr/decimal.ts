/**
 * Exact decimal arithmetic for the EPR calculator: a BigInt scaled by 10^scale.
 * Multiplication is exact, so values never drift; rounding happens only in `toFixed`.
 */
export class Dec {
  private constructor(
    readonly units: bigint,
    readonly scale: number,
  ) {}

  static readonly ZERO = new Dec(0n, 0);

  /** Parses a non-negative decimal string such as "32", "32.0000" or "0.00157". */
  static parse(input: string): Dec {
    const s = input.trim();
    if (!/^\d+(\.\d+)?$/.test(s)) throw new Error(`Not a non-negative decimal: "${input}"`);
    const [int, frac = ""] = s.split(".");
    return new Dec(BigInt(int + frac), frac.length);
  }

  static int(n: number): Dec {
    if (!Number.isSafeInteger(n) || n < 0) throw new Error(`Not a non-negative integer: ${n}`);
    return new Dec(BigInt(n), 0);
  }

  mul(other: Dec): Dec {
    return new Dec(this.units * other.units, this.scale + other.scale);
  }

  /** Divides by 100 exactly (a percentage). */
  percent(): Dec {
    return new Dec(this.units, this.scale + 2);
  }

  isZero(): boolean {
    return this.units === 0n;
  }

  /** Rounds half-up to `dp` decimals and returns plain digits, e.g. "22.4000". */
  toFixed(dp = 4): string {
    let units = this.units;
    if (this.scale > dp) {
      const div = 10n ** BigInt(this.scale - dp);
      const rem = units % div;
      units = units / div + (rem * 2n >= div ? 1n : 0n);
    } else {
      units = units * 10n ** BigInt(dp - this.scale);
    }
    if (dp === 0) return units.toString();
    const digits = units.toString().padStart(dp + 1, "0");
    return `${digits.slice(0, -dp)}.${digits.slice(-dp)}`;
  }

  /** Exact value without trailing zeros, e.g. "1.256". */
  toString(): string {
    if (this.scale === 0) return this.units.toString();
    const digits = this.units.toString().padStart(this.scale + 1, "0");
    const out = `${digits.slice(0, -this.scale)}.${digits.slice(-this.scale)}`;
    return out.replace(/\.?0+$/, "");
  }
}

/** "1234567.8900" → "12,34,567.8900" (Indian digit grouping). */
export function groupIndian(fixed: string): string {
  const [int, frac] = fixed.split(".");
  const last3 = int.slice(-3);
  const rest = int.slice(0, -3);
  const grouped = rest ? `${rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",")},${last3}` : last3;
  return frac === undefined ? grouped : `${grouped}.${frac}`;
}
