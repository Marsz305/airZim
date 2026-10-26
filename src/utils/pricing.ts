/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Currency, FareFamily, PassengerCount, PricingBreakdown } from '../types/ibe';

export const CURRENCY_RATES: Record<Currency, { rate: number; symbol: string; prefix: boolean }> = {
  USD: { rate: 1.0, symbol: '$', prefix: true },
  ZWL: { rate: 25.5, symbol: 'ZiG ', prefix: true },
  ZAR: { rate: 18.25, symbol: 'R ', prefix: true },
  GBP: { rate: 0.78, symbol: '£', prefix: true },
};

export const PROMO_CODES: Record<string, { code: string; description: string; discountPercent?: number; fixedDiscountUSD?: number; minSpend?: number }> = {
  'AIRZIM2026': { code: 'AIRZIM2026', description: 'Air Zimbabwe 2026 Promo (15% Off Base Fare)', discountPercent: 15 },
  'FLYHARARE': { code: 'FLYHARARE', description: 'Fly Harare Direct ($25 USD Off)', fixedDiscountUSD: 25, minSpend: 100 },
  'VISITVICFALLS': { code: 'VISITVICFALLS', description: 'Seven Wonders Special (10% Off)', discountPercent: 10 },
  'ZIMBABWE50': { code: 'ZIMBABWE50', description: 'Golden Jubilee Wings ($50 Off Bookings > $300)', fixedDiscountUSD: 50, minSpend: 300 },
};

export function convertCurrency(amountUSD: number, targetCurrency: Currency): number {
  const rateInfo = CURRENCY_RATES[targetCurrency] || CURRENCY_RATES.USD;
  return Math.round(amountUSD * rateInfo.rate * 100) / 100;
}

export function formatPrice(amountUSD: number, currency: Currency = 'USD'): string {
  const rateInfo = CURRENCY_RATES[currency] || CURRENCY_RATES.USD;
  const converted = convertCurrency(amountUSD, currency);
  const formattedNumber = converted.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return rateInfo.prefix
    ? `${rateInfo.symbol}${formattedNumber}`
    : `${formattedNumber} ${rateInfo.symbol}`;
}

export function calculateBaseFares(
  basePricePerAdultUSD: number,
  passengers: PassengerCount
): {
  adultsUSD: number;
  childrenUSD: number;
  infantsUSD: number;
  totalBaseUSD: number;
} {
  // IATA Standard multipliers:
  // Adult: 100%
  // Child (2-11): 75%
  // Infant (<2 on lap): 10%
  const adultsUSD = Math.round(basePricePerAdultUSD * passengers.adults * 100) / 100;
  const childrenUSD = Math.round(basePricePerAdultUSD * 0.75 * passengers.children * 100) / 100;
  const infantsUSD = Math.round(basePricePerAdultUSD * 0.10 * passengers.infants * 100) / 100;
  const totalBaseUSD = Math.round((adultsUSD + childrenUSD + infantsUSD) * 100) / 100;

  return { adultsUSD, childrenUSD, infantsUSD, totalBaseUSD };
}

export function calculateTaxes(
  isInternational: boolean,
  passengerTotal: number,
  segmentsCount: number
): {
  airportTaxesUSD: number;
  fuelSurchargeUSD: number;
  securityFeeUSD: number;
  totalTaxesUSD: number;
} {
  // Per passenger per segment
  const pscPerPass = isInternational ? 35 : 15;
  const fuelPerPass = isInternational ? 45 : 20;
  const securityPerPass = isInternational ? 10 : 5;

  const factor = passengerTotal * segmentsCount;
  const airportTaxesUSD = pscPerPass * factor;
  const fuelSurchargeUSD = fuelPerPass * factor;
  const securityFeeUSD = securityPerPass * factor;
  const totalTaxesUSD = airportTaxesUSD + fuelSurchargeUSD + securityFeeUSD;

  return { airportTaxesUSD, fuelSurchargeUSD, securityFeeUSD, totalTaxesUSD };
}

export function validatePromoCode(
  rawCode: string,
  baseFareUSD: number
): { isValid: boolean; discountUSD: number; promo?: typeof PROMO_CODES[string]; error?: string } {
  if (!rawCode || !rawCode.trim()) {
    return { isValid: false, discountUSD: 0 };
  }

  const clean = rawCode.trim().toUpperCase();
  const match = PROMO_CODES[clean];

  if (!match) {
    return { isValid: false, discountUSD: 0, error: 'Invalid or expired promotional code' };
  }

  if (match.minSpend && baseFareUSD < match.minSpend) {
    return {
      isValid: false,
      discountUSD: 0,
      error: `Promo code requires a minimum spend of $${match.minSpend} USD`,
    };
  }

  let discountUSD = 0;
  if (match.discountPercent) {
    discountUSD = Math.round(((baseFareUSD * match.discountPercent) / 100) * 100) / 100;
  } else if (match.fixedDiscountUSD) {
    discountUSD = Math.min(match.fixedDiscountUSD, baseFareUSD);
  }

  return { isValid: true, discountUSD, promo: match };
}

export function computePricingBreakdown(params: {
  basePriceUSD: number;
  passengers: PassengerCount;
  isInternational: boolean;
  segmentsCount: number;
  currency: Currency;
  ancillarySeatsUSD?: number;
  ancillaryBaggageUSD?: number;
  ancillaryMealsUSD?: number;
  promoCode?: string;
}): PricingBreakdown {
  const {
    basePriceUSD,
    passengers,
    isInternational,
    segmentsCount,
    currency,
    ancillarySeatsUSD = 0,
    ancillaryBaggageUSD = 0,
    ancillaryMealsUSD = 0,
    promoCode = '',
  } = params;

  const totalPassengers = passengers.adults + passengers.children + passengers.infants;
  const baseFares = calculateBaseFares(basePriceUSD, passengers);
  const taxes = calculateTaxes(isInternational, totalPassengers, segmentsCount);

  const promoResult = validatePromoCode(promoCode, baseFares.totalBaseUSD);
  const promoDiscountUSD = promoResult.isValid ? promoResult.discountUSD : 0;

  const subtotalUSD =
    baseFares.totalBaseUSD +
    taxes.totalTaxesUSD +
    ancillarySeatsUSD +
    ancillaryBaggageUSD +
    ancillaryMealsUSD;

  const totalUSD = Math.max(0, Math.round((subtotalUSD - promoDiscountUSD) * 100) / 100);
  const exchangeRate = CURRENCY_RATES[currency]?.rate || 1.0;
  const totalInCurrency = convertCurrency(totalUSD, currency);

  return {
    currency,
    exchangeRate,
    baseFareUSD: baseFares.totalBaseUSD,
    passengerBaseFares: {
      adults: baseFares.adultsUSD,
      children: baseFares.childrenUSD,
      infants: baseFares.infantsUSD,
    },
    airportTaxesUSD: taxes.airportTaxesUSD,
    fuelSurchargeUSD: taxes.fuelSurchargeUSD,
    securityFeeUSD: taxes.securityFeeUSD,
    ancillarySeatsUSD,
    ancillaryBaggageUSD,
    ancillaryMealsUSD,
    promoDiscountUSD,
    appliedPromo: promoResult.isValid && promoResult.promo ? promoResult.promo : undefined,
    subtotalUSD,
    totalUSD,
    totalInCurrency,
  };
}

export function calculateCancellationRefund(
  fareFamily: FareFamily,
  totalPaidUSD: number,
  airportTaxesUSD: number
): {
  isRefundable: boolean;
  penaltyFeeUSD: number;
  refundAmountUSD: number;
  policyNote: string;
} {
  switch (fareFamily) {
    case 'lite':
      // Lite: Non-refundable for airfare, airport government taxes refundable
      return {
        isRefundable: false,
        penaltyFeeUSD: totalPaidUSD - airportTaxesUSD,
        refundAmountUSD: airportTaxesUSD,
        policyNote: 'Economy Lite fare is non-refundable. Only unutilized statutory airport taxes ($' + airportTaxesUSD + ' USD) are eligible for refund.',
      };
    case 'classic': {
      // Classic: $60 penalty fee, remainder refunded
      const penalty = 60;
      const refund = Math.max(0, totalPaidUSD - penalty);
      return {
        isRefundable: true,
        penaltyFeeUSD: penalty,
        refundAmountUSD: refund,
        policyNote: 'Economy Classic permits cancellation subject to standard administrative fee of $60.00 USD.',
      };
    }
    case 'flex':
      // Flex: 100% full refund with $0 cancellation fee
      return {
        isRefundable: true,
        penaltyFeeUSD: 0,
        refundAmountUSD: totalPaidUSD,
        policyNote: 'Economy Flex / Business Flex features complimentary flexible cancellation with zero penalty fees.',
      };
  }
}
