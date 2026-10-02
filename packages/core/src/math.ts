import BN from "bn.js";
import Decimal from "decimal.js";

// Configure Decimal precision for financial math
Decimal.set({ precision: 40, rounding: Decimal.ROUND_DOWN });

export const Q64 = new BN(2).pow(new BN(64));
export const Q64_DECIMAL = new Decimal(2).pow(64);
export const FEE_DENOMINATOR = new BN(1_000_000_000);
export const BPS_DENOMINATOR = new BN(10_000);

export const MIN_SQRT_PRICE = new BN("4295048016");
export const MAX_SQRT_PRICE = new BN("79226673521066979257578248091");

/**
 * Convert a human-readable UI price (quote token per 1 base token) to Q64.64 sqrtPrice.
 */
export function priceToSqrtPrice(
  price: number | string | Decimal,
  baseDecimals = 6,
  quoteDecimals = 9
): BN {
  const p = new Decimal(price);
  if (p.lte(0)) {
    throw new Error(`Price must be strictly positive, got: ${p.toString()}`);
  }
  const decimalFactor = new Decimal(10).pow(quoteDecimals - baseDecimals);
  const rawPrice = p.mul(decimalFactor);
  const sqrtRawPrice = rawPrice.sqrt();
  const sqrtPriceX64 = sqrtRawPrice.mul(Q64_DECIMAL).floor();
  return new BN(sqrtPriceX64.toFixed(0));
}

/**
 * Convert a Q64.64 sqrtPrice back to a human-readable UI price.
 */
export function sqrtPriceToPrice(
  sqrtPrice: BN,
  baseDecimals = 6,
  quoteDecimals = 9
): number {
  if (sqrtPrice.isZero()) return 0;
  const sqrtPriceDec = new Decimal(sqrtPrice.toString()).div(Q64_DECIMAL);
  const rawPrice = sqrtPriceDec.pow(2);
  const decimalFactor = new Decimal(10).pow(quoteDecimals - baseDecimals);
  const uiPrice = rawPrice.div(decimalFactor);
  return uiPrice.toNumber();
}

/**
 * Compute the amount of base token represented in a price interval [pLower, pUpper] given virtual liquidity L.
 * Δx = L * (2^64 / sqrtPriceLower - 2^64 / sqrtPriceUpper)
 */
export function getBaseAmountForLiquidity(
  sqrtPriceLower: BN,
  sqrtPriceUpper: BN,
  liquidity: BN
): BN {
  if (sqrtPriceLower.gte(sqrtPriceUpper)) return new BN(0);
  const L = new Decimal(liquidity.toString());
  const pl = new Decimal(sqrtPriceLower.toString());
  const pu = new Decimal(sqrtPriceUpper.toString());

  // Δx = L * 2^64 * (pu - pl) / (pl * pu)
  const num = L.mul(Q64_DECIMAL).mul(pu.sub(pl));
  const den = pl.mul(pu);
  return new BN(num.div(den).floor().toFixed(0));
}

/**
 * Compute the amount of quote token required to cross price interval [pLower, pUpper] given virtual liquidity L.
 * Δy = L * (sqrtPriceUpper - sqrtPriceLower) / 2^64
 */
export function getQuoteAmountForLiquidity(
  sqrtPriceLower: BN,
  sqrtPriceUpper: BN,
  liquidity: BN
): BN {
  if (sqrtPriceLower.gte(sqrtPriceUpper)) return new BN(0);
  const L = new Decimal(liquidity.toString());
  const pl = new Decimal(sqrtPriceLower.toString());
  const pu = new Decimal(sqrtPriceUpper.toString());

  // Δy = L * (pu - pl) / 2^64
  const quote = L.mul(pu.sub(pl)).div(Q64_DECIMAL);
  return new BN(quote.floor().toFixed(0));
}

/**
 * Derive required virtual liquidity L from target base amount Δx across interval [pLower, pUpper].
 */
export function getLiquidityForBaseAmount(
  sqrtPriceLower: BN,
  sqrtPriceUpper: BN,
  baseAmount: BN
): BN {
  const pl = new Decimal(sqrtPriceLower.toString());
  const pu = new Decimal(sqrtPriceUpper.toString());
  const deltaX = new Decimal(baseAmount.toString());

  // L = Δx * pl * pu / (2^64 * (pu - pl))
  const num = deltaX.mul(pl).mul(pu);
  const den = Q64_DECIMAL.mul(pu.sub(pl));
  return new BN(num.div(den).floor().toFixed(0));
}

/**
 * Derive required virtual liquidity L from target quote amount Δy across interval [pLower, pUpper].
 */
export function getLiquidityForQuoteAmount(
  sqrtPriceLower: BN,
  sqrtPriceUpper: BN,
  quoteAmount: BN
): BN {
  const pl = new Decimal(sqrtPriceLower.toString());
  const pu = new Decimal(sqrtPriceUpper.toString());
  const deltaY = new Decimal(quoteAmount.toString());

  // L = Δy * 2^64 / (pu - pl)
  const num = deltaY.mul(Q64_DECIMAL);
  const den = pu.sub(pl);
  return new BN(num.div(den).floor().toFixed(0));
}

/**
 * Calculate the next sqrtPrice when buying base with exact quote input Δy.
 */
export function getNextSqrtPriceFromQuoteIn(
  currentSqrtPrice: BN,
  liquidity: BN,
  quoteIn: BN
): BN {
  const p = new Decimal(currentSqrtPrice.toString());
  const L = new Decimal(liquidity.toString());
  const dy = new Decimal(quoteIn.toString());

  // pNext = p + (dy * 2^64 / L)
  const pNext = p.add(dy.mul(Q64_DECIMAL).div(L));
  return new BN(pNext.floor().toFixed(0));
}

/**
 * Calculate the next sqrtPrice when selling base with exact base input Δx.
 */
export function getNextSqrtPriceFromBaseIn(
  currentSqrtPrice: BN,
  liquidity: BN,
  baseIn: BN
): BN {
  const p = new Decimal(currentSqrtPrice.toString());
  const L = new Decimal(liquidity.toString());
  const dx = new Decimal(baseIn.toString());

  // 1/pNext = 1/p + dx / (L * 2^64)
  // pNext = (L * 2^64 * p) / (L * 2^64 + dx * p)
  const num = L.mul(Q64_DECIMAL).mul(p);
  const den = L.mul(Q64_DECIMAL).add(dx.mul(p));
  return new BN(num.div(den).floor().toFixed(0));
}

/**
 * Split a fee amount into protocol, partner, creator, and optional referral components.
 * Total Trading Fee split:
 * - Protocol: 20%
 * - Referral (if present): 20% of protocol fee
 * - LP pool fee: 80%
 *   - Creator: LP fee * creatorTradingFeePercentage / 100
 *   - Partner: LP fee - Creator fee
 */
export function splitTradingFee(
  totalFee: BN,
  creatorTradingFeePercentage: number,
  hasReferral = false
): {
  protocolFee: BN;
  referralFee: BN;
  partnerFee: BN;
  creatorFee: BN;
} {
  const total = new Decimal(totalFee.toString());
  const protocol = total.mul(0.20).floor();
  let referral = new Decimal(0);
  let effectiveProtocol = protocol;

  if (hasReferral) {
    referral = protocol.mul(0.20).floor();
    effectiveProtocol = protocol.sub(referral);
  }

  const lpFee = total.sub(protocol);
  const creator = lpFee.mul(creatorTradingFeePercentage / 100).floor();
  const partner = lpFee.sub(creator);

  return {
    protocolFee: new BN(effectiveProtocol.toFixed(0)),
    referralFee: new BN(referral.toFixed(0)),
    partnerFee: new BN(partner.toFixed(0)),
    creatorFee: new BN(creator.toFixed(0)),
  };
}
