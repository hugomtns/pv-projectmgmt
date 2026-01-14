/**
 * Financial Functions Module
 *
 * Pure TypeScript implementations of core financial calculations
 * Ported from pvfinance calculator
 */

/**
 * Calculate Net Present Value (NPV)
 *
 * @param rate - Discount rate (decimal, e.g., 0.08 for 8%)
 * @param values - Array of cash flows, starting with year 0
 * @returns NPV of the cash flow series
 */
export function npv(rate: number, values: number[]): number {
  return values.reduce((sum, val, i) => {
    return sum + val / Math.pow(1 + rate, i);
  }, 0);
}

/**
 * Calculate Internal Rate of Return (IRR) using Newton's method
 *
 * @param values - Array of cash flows, starting with year 0 (typically negative for initial investment)
 * @param guess - Initial guess for IRR (default 0.1 = 10%)
 * @returns IRR as decimal (e.g., 0.0824 for 8.24%)
 */
export function irr(values: number[], guess: number = 0.1): number {
  const npvAtRate = (rate: number): number => {
    return values.reduce((sum, val, i) => {
      return sum + val / Math.pow(1 + rate, i);
    }, 0);
  };

  const npvDerivative = (rate: number): number => {
    return values.reduce((sum, val, i) => {
      return sum - i * val / Math.pow(1 + rate, i + 1);
    }, 0);
  };

  let rate = guess;

  for (let iteration = 0; iteration < 100; iteration++) {
    const npvVal = npvAtRate(rate);

    if (Math.abs(npvVal) < 1e-6) {
      return rate;
    }

    const npvDeriv = npvDerivative(rate);

    if (Math.abs(npvDeriv) < 1e-10) {
      break;
    }

    rate = rate - npvVal / npvDeriv;
  }

  return rate;
}

/**
 * Calculate periodic payment for a loan (PMT)
 *
 * @param rate - Interest rate per period (decimal)
 * @param nper - Number of periods
 * @param pv - Present value (loan principal, typically positive)
 * @param fv - Future value (default 0)
 * @returns Periodic payment amount (negative indicates outflow)
 */
export function pmt(
  rate: number,
  nper: number,
  pv: number,
  fv: number = 0
): number {
  if (rate === 0) {
    return -(pv + fv) / nper;
  }

  return -rate * (pv * Math.pow(1 + rate, nper) + fv) / (Math.pow(1 + rate, nper) - 1);
}

/**
 * Calculate present value of annuity (PV)
 *
 * @param rate - Interest rate per period (decimal)
 * @param nper - Number of periods
 * @param pmtValue - Payment per period
 * @param fv - Future value (default 0)
 * @returns Present value (negative indicates investment)
 */
export function pv(
  rate: number,
  nper: number,
  pmtValue: number,
  fv: number = 0
): number {
  if (rate === 0) {
    return -(pmtValue * nper + fv);
  }

  const annuity = pmtValue * (Math.pow(1 + rate, nper) - 1) / rate;
  return -(annuity + fv) / Math.pow(1 + rate, nper);
}
