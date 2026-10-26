/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PassengerType } from '../types/ibe';

export function calculateAge(dobString: string, referenceDate: Date = new Date()): number {
  if (!dobString) return 0;
  const dob = new Date(dobString);
  if (isNaN(dob.getTime())) return 0;

  let age = referenceDate.getFullYear() - dob.getFullYear();
  const m = referenceDate.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && referenceDate.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

export function validatePassengerAgeBracket(
  type: PassengerType,
  dobString: string,
  travelDateString?: string
): { isValid: boolean; age: number; error?: string } {
  if (!dobString) {
    return { isValid: false, age: 0, error: 'Date of birth is required' };
  }

  const travelDate = travelDateString ? new Date(travelDateString) : new Date();
  const age = calculateAge(dobString, travelDate);

  if (age < 0) {
    return { isValid: false, age, error: 'Date of birth cannot be in the future' };
  }

  switch (type) {
    case 'infant':
      // Under 2 years old (0 to 1)
      if (age >= 2) {
        return {
          isValid: false,
          age,
          error: `Infant must be under 2 years old on travel date (Current age: ${age}). Please reclassify as a Child passenger.`,
        };
      }
      return { isValid: true, age };

    case 'child':
      // 2 to 11 years old inclusive
      if (age < 2) {
        return {
          isValid: false,
          age,
          error: `Child must be at least 2 years old on travel date (Current age: ${age}). Please reclassify as an Infant.`,
        };
      }
      if (age >= 12) {
        return {
          isValid: false,
          age,
          error: `Child must be under 12 years old on travel date (Current age: ${age}). Passengers 12 and above must be booked as Adults.`,
        };
      }
      return { isValid: true, age };

    case 'adult':
      // 12 years and older
      if (age < 12) {
        return {
          isValid: false,
          age,
          error: `Adult passenger must be at least 12 years old on travel date (Current age: ${age}). Please reclassify as Child or Infant.`,
        };
      }
      return { isValid: true, age };
  }
}

export function validatePassportExpiry(
  expiryDateString: string,
  travelDateString?: string
): { isValid: boolean; monthsRemaining: number; error?: string } {
  if (!expiryDateString) {
    return { isValid: false, monthsRemaining: 0, error: 'Passport expiry date is required' };
  }

  const expiry = new Date(expiryDateString);
  const travelDate = travelDateString ? new Date(travelDateString) : new Date();

  if (isNaN(expiry.getTime())) {
    return { isValid: false, monthsRemaining: 0, error: 'Invalid expiry date format' };
  }

  // Calculate difference in months
  const diffTime = expiry.getTime() - travelDate.getTime();
  const monthsRemaining = diffTime / (1000 * 60 * 60 * 24 * 30.4375);

  if (monthsRemaining <= 0) {
    return {
      isValid: false,
      monthsRemaining: 0,
      error: 'Passport will be expired by the date of travel. Valid passport required.',
    };
  }

  // International standard: must be valid for at least 6 months
  if (monthsRemaining < 6) {
    return {
      isValid: false,
      monthsRemaining: Math.round(monthsRemaining * 10) / 10,
      error: `Passport must have at least 6 months validity remaining from travel date (Only ${Math.round(monthsRemaining)} months remaining).`,
    };
  }

  return { isValid: true, monthsRemaining: Math.round(monthsRemaining * 10) / 10 };
}

export function validatePnrFormat(pnr: string): { isValid: boolean; normalized: string; error?: string } {
  if (!pnr) {
    return { isValid: false, normalized: '', error: 'Booking reference (PNR) is required' };
  }

  const normalized = pnr.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

  if (normalized.length !== 6) {
    return {
      isValid: false,
      normalized,
      error: 'Booking reference must be exactly 6 alphanumeric characters (e.g. UM7428, ZW892K)',
    };
  }

  return { isValid: true, normalized };
}

export function validateEcoCashPhone(phone: string): { isValid: boolean; formatted: string; error?: string } {
  if (!phone) {
    return { isValid: false, formatted: '', error: 'EcoCash mobile number is required' };
  }

  // Normalize phone e.g., 0771234567, +263771234567, 771234567
  const cleaned = phone.replace(/[^0-9]/g, '');
  let standard = '';

  if (cleaned.startsWith('26377') || cleaned.startsWith('26378')) {
    standard = '0' + cleaned.slice(3);
  } else if (cleaned.startsWith('077') || cleaned.startsWith('078')) {
    standard = cleaned;
  } else if ((cleaned.startsWith('77') || cleaned.startsWith('78')) && cleaned.length === 9) {
    standard = '0' + cleaned;
  }

  if (standard.length !== 10) {
    return {
      isValid: false,
      formatted: phone,
      error: 'Please enter a valid Econet / EcoCash mobile number (e.g. 077 123 4567 or 078 123 4567)',
    };
  }

  return { isValid: true, formatted: standard };
}
