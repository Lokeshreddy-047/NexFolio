import { describe, it, expect } from 'vitest';
import {
  formatINR,
  formatPercentage,
  calculateRealizedPnL,
  calculateEffectiveTax,
} from '../lib/formatters';

describe('Financial Math & Formatter Suite', () => {
  it('formats INR currency with Indian grouping commas', () => {
    const formatted = formatINR(125000);
    // Should format as ₹1,25,000 (or localized equivalent)
    expect(formatted).toContain('1,25,000');
  });

  it('formats percentages correctly with positive prefix', () => {
    expect(formatPercentage(15.456, 2)).toBe('+15.46%');
    expect(formatPercentage(-8.2, 2)).toBe('-8.20%');
    expect(formatPercentage(0, 2)).toBe('0.00%');
  });

  it('calculates realized PnL and percentage accurately', () => {
    // 100 shares sold at 200 with cost basis 150 -> PnL = 5000, 33.33%
    const result = calculateRealizedPnL(100, 200, 150);
    expect(result.pnl).toBe(5000);
    expect(result.pnlPct).toBe(33.33);

    // Loss scenario: 50 shares sold at 80 with cost basis 100 -> PnL = -1000, -20%
    const lossResult = calculateRealizedPnL(50, 80, 100);
    expect(lossResult.pnl).toBe(-1000);
    expect(lossResult.pnlPct).toBe(-20);
  });

  it('computes effective Indian capital gains tax under Act 2025', () => {
    // STCG = 50,000 @ 20% = 10,000
    // LTCG above threshold = 1,00,000 @ 12.5% = 12,500
    // Total base tax = 22,500
    // 4% Cess = 900
    // Total Tax = 23,400
    const tax = calculateEffectiveTax(50000, 100000);
    expect(tax.baseTax).toBe(22500);
    expect(tax.cess).toBe(900);
    expect(tax.totalTax).toBe(23400);
  });
});
