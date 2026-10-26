/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CabinClass, FareFamily } from '../types/ibe';

export interface BaggageAllowance {
  cabinBagPieces: number;
  cabinBagWeightKg: number;
  freeCheckedPieces: number;
  checkedPieceWeightKg: number;
  totalFreeWeightKg: number;
  extraPiecePriceUSD: number;
  excessWeightPerKgPriceUSD: number;
}

export function getBaggageAllowance(
  cabinClass: CabinClass,
  fareFamily: FareFamily,
  isWidebodyLongHaul: boolean = false
): BaggageAllowance {
  const extraPiecePriceUSD = 45;
  const excessWeightPerKgPriceUSD = 7;

  if (cabinClass === 'business' || cabinClass === 'first') {
    if (fareFamily === 'flex') {
      return {
        cabinBagPieces: 2,
        cabinBagWeightKg: 10,
        freeCheckedPieces: 3,
        checkedPieceWeightKg: 32,
        totalFreeWeightKg: 96,
        extraPiecePriceUSD,
        excessWeightPerKgPriceUSD,
      };
    }
    return {
      cabinBagPieces: 2,
      cabinBagWeightKg: 10,
      freeCheckedPieces: 2,
      checkedPieceWeightKg: 32,
      totalFreeWeightKg: 64,
      extraPiecePriceUSD,
      excessWeightPerKgPriceUSD,
    };
  }

  // Economy cabin:
  switch (fareFamily) {
    case 'lite':
      return {
        cabinBagPieces: 1,
        cabinBagWeightKg: 7,
        freeCheckedPieces: 0,
        checkedPieceWeightKg: 0,
        totalFreeWeightKg: 0,
        extraPiecePriceUSD,
        excessWeightPerKgPriceUSD,
      };
    case 'classic': {
      const perBagWeight = isWidebodyLongHaul ? 30 : 23;
      return {
        cabinBagPieces: 1,
        cabinBagWeightKg: 7,
        freeCheckedPieces: 1,
        checkedPieceWeightKg: perBagWeight,
        totalFreeWeightKg: perBagWeight,
        extraPiecePriceUSD,
        excessWeightPerKgPriceUSD,
      };
    }
    case 'flex': {
      const perBagWeight = isWidebodyLongHaul ? 30 : 23;
      return {
        cabinBagPieces: 1,
        cabinBagWeightKg: 10,
        freeCheckedPieces: 2,
        checkedPieceWeightKg: perBagWeight,
        totalFreeWeightKg: perBagWeight * 2,
        extraPiecePriceUSD,
        excessWeightPerKgPriceUSD,
      };
    }
  }
}

export function calculatePassengerBaggageFees(
  allowance: BaggageAllowance,
  selectedPieces: number,
  excessWeightKg: number
): {
  includedPieces: number;
  additionalPieces: number;
  piecesFeeUSD: number;
  excessWeightKg: number;
  weightFeeUSD: number;
  totalBaggageFeeUSD: number;
} {
  const freePieces = allowance.freeCheckedPieces;
  const additionalPieces = Math.max(0, selectedPieces - freePieces);
  const piecesFeeUSD = additionalPieces * allowance.extraPiecePriceUSD;

  const validExcessKg = Math.max(0, excessWeightKg);
  const weightFeeUSD = validExcessKg * allowance.excessWeightPerKgPriceUSD;

  const totalBaggageFeeUSD = piecesFeeUSD + weightFeeUSD;

  return {
    includedPieces: Math.min(selectedPieces, freePieces),
    additionalPieces,
    piecesFeeUSD,
    excessWeightKg: validExcessKg,
    weightFeeUSD,
    totalBaggageFeeUSD,
  };
}
