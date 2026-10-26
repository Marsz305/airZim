/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateBaseFares,
  calculateTaxes,
  validatePromoCode,
  computePricingBreakdown,
  calculateCancellationRefund,
  convertCurrency,
} from './pricing';
import {
  validatePassengerAgeBracket,
  validatePassportExpiry,
  validatePnrFormat,
  validateEcoCashPhone,
} from './validation';
import {
  getBaggageAllowance,
  calculatePassengerBaggageFees,
} from './baggage';
import {
  generatePNR,
  generateTicketNumber,
  generateIataBcbp,
} from './pnr';

test('calculateBaseFares handles adult, child (75%), and infant (10%)', () => {
  const baseRate = 200;
  const result = calculateBaseFares(baseRate, { adults: 2, children: 1, infants: 1 });
  // Adults: 2 * 200 = 400
  // Child: 1 * 150 = 150
  // Infant: 1 * 20 = 20
  // Total: 570
  assert.equal(result.adultsUSD, 400);
  assert.equal(result.childrenUSD, 150);
  assert.equal(result.infantsUSD, 20);
  assert.equal(result.totalBaseUSD, 570);
});

test('calculateTaxes computes domestic vs international rates properly', () => {
  const international = calculateTaxes(true, 2, 1);
  // PSC: 35 * 2 = 70
  // Fuel: 45 * 2 = 90
  // Security: 10 * 2 = 20
  // Total = 180
  assert.equal(international.totalTaxesUSD, 180);

  const domestic = calculateTaxes(false, 1, 1);
  // PSC: 15, Fuel: 20, Security: 5 = 40
  assert.equal(domestic.totalTaxesUSD, 40);
});

test('validatePromoCode validates percentage and fixed discounts and checks minimum spend', () => {
  const validPercent = validatePromoCode('AIRZIM2026', 400);
  assert.equal(validPercent.isValid, true);
  assert.equal(validPercent.discountUSD, 60); // 15% of 400

  const fixedMinSpendPass = validatePromoCode('FLYHARARE', 150);
  assert.equal(fixedMinSpendPass.isValid, true);
  assert.equal(fixedMinSpendPass.discountUSD, 25);

  const fixedMinSpendFail = validatePromoCode('FLYHARARE', 50);
  assert.equal(fixedMinSpendFail.isValid, false);
  assert.match(fixedMinSpendFail.error || '', /minimum spend/);

  const invalidCode = validatePromoCode('NONEXISTENT_CODE', 200);
  assert.equal(invalidCode.isValid, false);
});

test('currency conversion computes correct exchange rates', () => {
  const usdVal = 100;
  assert.equal(convertCurrency(usdVal, 'USD'), 100);
  assert.equal(convertCurrency(usdVal, 'ZAR'), 1825);
  assert.equal(convertCurrency(usdVal, 'GBP'), 78);
});

test('calculateCancellationRefund handles Lite, Classic, and Flex policies', () => {
  const total = 500;
  const taxes = 90;

  const lite = calculateCancellationRefund('lite', total, taxes);
  assert.equal(lite.isRefundable, false);
  assert.equal(lite.refundAmountUSD, 90);

  const classic = calculateCancellationRefund('classic', total, taxes);
  assert.equal(classic.isRefundable, true);
  assert.equal(classic.refundAmountUSD, 440); // 500 - 60 penalty

  const flex = calculateCancellationRefund('flex', total, taxes);
  assert.equal(flex.isRefundable, true);
  assert.equal(flex.penaltyFeeUSD, 0);
  assert.equal(flex.refundAmountUSD, 500);
});

test('validatePassengerAgeBracket enforces correct age limits', () => {
  const travelDate = '2026-11-01';

  // Adult: born 2000 (26 years) -> valid
  const adultValid = validatePassengerAgeBracket('adult', '2000-05-15', travelDate);
  assert.equal(adultValid.isValid, true);

  // Adult: born 2018 (8 years) -> invalid for adult
  const adultInvalid = validatePassengerAgeBracket('adult', '2018-05-15', travelDate);
  assert.equal(adultInvalid.isValid, false);

  // Child: born 2018 (8 years) -> valid
  const childValid = validatePassengerAgeBracket('child', '2018-05-15', travelDate);
  assert.equal(childValid.isValid, true);

  // Infant: born 2026-01-01 (< 1 year) -> valid
  const infantValid = validatePassengerAgeBracket('infant', '2026-01-01', travelDate);
  assert.equal(infantValid.isValid, true);

  // Infant: born 2023 (> 2 years) -> invalid for infant
  const infantInvalid = validatePassengerAgeBracket('infant', '2023-01-01', travelDate);
  assert.equal(infantInvalid.isValid, false);
});

test('validatePassportExpiry enforces minimum 6 months validity', () => {
  const travelDate = '2026-11-01';

  // Valid: expires in 2028
  const validPass = validatePassportExpiry('2028-11-01', travelDate);
  assert.equal(validPass.isValid, true);

  // Invalid: expires in 2 months (2026-12-01)
  const invalidPass = validatePassportExpiry('2026-12-01', travelDate);
  assert.equal(invalidPass.isValid, false);
  assert.match(invalidPass.error || '', /at least 6 months/);
});

test('validatePnrFormat checks 6-char alphanumeric structure', () => {
  const valid = validatePnrFormat('um7428');
  assert.equal(valid.isValid, true);
  assert.equal(valid.normalized, 'UM7428');

  const invalid = validatePnrFormat('SHORT');
  assert.equal(invalid.isValid, false);
});

test('validateEcoCashPhone accepts valid Econet formats', () => {
  const num1 = validateEcoCashPhone('0772123456');
  assert.equal(num1.isValid, true);
  assert.equal(num1.formatted, '0772123456');

  const num2 = validateEcoCashPhone('+263784123456');
  assert.equal(num2.isValid, true);
  assert.equal(num2.formatted, '0784123456');

  const invalid = validateEcoCashPhone('12345');
  assert.equal(invalid.isValid, false);
});

test('baggage allowance calculation accurately totals weight and extra piece charges', () => {
  const allowance = getBaggageAllowance('economy', 'classic');
  assert.equal(allowance.freeCheckedPieces, 1);
  assert.equal(allowance.checkedPieceWeightKg, 23);

  // Passenger takes 2 bags (1 free + 1 extra) and 5kg excess weight
  const fees = calculatePassengerBaggageFees(allowance, 2, 5);
  assert.equal(fees.includedPieces, 1);
  assert.equal(fees.additionalPieces, 1);
  assert.equal(fees.piecesFeeUSD, 45); // 1 extra bag * $45
  assert.equal(fees.weightFeeUSD, 35); // 5kg * $7
  assert.equal(fees.totalBaggageFeeUSD, 80);
});

test('PNR and e-ticket generators adhere to IATA standards', () => {
  const pnr = generatePNR();
  assert.equal(pnr.length, 6);
  assert.equal(pnr.startsWith('UM'), true);

  const ticket = generateTicketNumber();
  assert.match(ticket, /^638-\d{10}$/);

  const bcbp = generateIataBcbp({
    passengerName: 'MOYO/TENDAI MR',
    pnr: 'UM7428',
    origin: 'HRE',
    destination: 'LGW',
    flightNumber: 'UM 462',
    flightDateJulian: '305',
    seat: '14B',
    sequenceNumber: '002',
  });
  assert.equal(bcbp.startsWith('M1MOYO/TENDAI MR'), true);
  assert.match(bcbp, /HRELGW/);
});

test('Hitit Crane date utilities convert between ISO and DD.MM.YYYY format', async () => {
  const { formatToHititDate, hititDateToIso } = await import('../services/craneApi');
  assert.equal(formatToHititDate('2026-10-25'), '25.10.2026');
  assert.equal(hititDateToIso('25.10.2026'), '2026-10-25');
});

test('AvailabilityRequest formats parametric query string per Hitit NIBE specification', async () => {
  const { AvailabilityRequest, PassengerQuantity } = await import('../services/craneApi');
  const pq = [
    new PassengerQuantity('ADLT', undefined, 2),
    new PassengerQuantity('CHLD', undefined, 1),
  ];
  const req = new AvailabilityRequest(
    'ROUND_TRIP',
    'HRE',
    'VFA',
    '25.10.2026',
    '30.10.2026',
    pq,
    'USD',
    'ECONOMY'
  );
  const qs = req.toQueryString();
  assert.match(qs, /tripType=ROUND_TRIP/);
  assert.match(qs, /depPort=HRE/);
  assert.match(qs, /arrPort=VFA/);
  assert.match(qs, /departureDate=25\.10\.2026/);
  assert.match(qs, /returnDate=30\.10\.2026/);
  assert.match(qs, /adult=2/);
  assert.match(qs, /child=1/);
});

test('CraneSearchAPI generates valid URLs for Availability, Checkin, Timetable, and Reservation', async () => {
  const { CraneSearchAPI } = await import('../services/craneApi');
  const api = new CraneSearchAPI('https://ibe.airzimbabwe.aero');

  const checkinUrl = api.getCheckinUrl('UM7428', 'Moyo', 'en');
  assert.equal(checkinUrl, 'https://ibe.airzimbabwe.aero/checkin/search?PNRNo=UM7428&surname=MOYO&lang=en');

  const resUrl = api.getReservationUrl('UM9134', 'Sibanda', 'en');
  assert.equal(resUrl, 'https://ibe.airzimbabwe.aero/reservation?PNRNo=UM9134&surname=SIBANDA&lang=en');

  const flightStatusUrl = api.getFlightStatusUrl('en');
  assert.equal(flightStatusUrl, 'https://ibe.airzimbabwe.aero/flightStatus?lang=en');

  const timetableUrl = api.getTimetableUrl('ONE_WAY', 'HRE', 'LGW', '2026-11-15', 'en');
  assert.equal(timetableUrl, 'https://ibe.airzimbabwe.aero/timetable/create?tripType=ONE_WAY&depPort=HRE&arrPort=LGW&date=15.11.2026&lang=en');
});
