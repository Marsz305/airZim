/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SearchCriteria } from '../types/ibe';

/**
 * Hitit Crane NIBE (New Internet Booking Engine) Parametric Link Builder
 * Conforms to HititCS NIBE Parametric Links Specification (Version 1.4.26).
 */
export const HITIT_BASE_HOST = 'https://ibe.hitit.aero';
export const AIRZIM_LIVE_IBE_HOST = 'https://airzimbabwe.aero';

/**
 * Formats YYYY-MM-DD into Hitit NIBE standard DD.MM.YYYY
 */
export function formatHititDate(isoDate: string): string {
  if (!isoDate) return '';
  const parts = isoDate.split('-');
  if (parts.length === 3) {
    return `${parts[2]}.${parts[1]}.${parts[0]}`;
  }
  return isoDate;
}

/**
 * Builds Hitit NIBE Availability Search Parametric URL
 * GET /availability
 */
export function buildHititAvailabilityUrl(
  criteria: SearchCriteria,
  baseHost: string = HITIT_BASE_HOST
): string {
  const originCode = criteria.segments[0]?.origin.code || 'HRE';
  const destCode = criteria.segments[0]?.destination.code || 'VFA';
  const depDate = formatHititDate(criteria.segments[0]?.departureDate);

  const params = new URLSearchParams();

  if (criteria.tripType === 'round-trip') {
    params.set('tripType', 'ROUND_TRIP');
    params.set('depPort', originCode);
    params.set('arrPort', destCode);
    params.set('departureDate', depDate);
    if (criteria.returnDate) {
      params.set('returnDate', formatHititDate(criteria.returnDate));
    }
  } else if (criteria.tripType === 'one-way') {
    params.set('tripType', 'ONE_WAY');
    params.set('depPort', originCode);
    params.set('arrPort', destCode);
    params.set('departureDate', depDate);
    params.set('returnDate', depDate);
  } else {
    // MULTI_DIRECTIONAL
    params.set('tripType', 'MULTI_DIRECTIONAL');
    params.set('depPort', criteria.segments.map((s) => s.origin.code).join(','));
    params.set('arrPort', criteria.segments.map((s) => s.destination.code).join(','));
    params.set('departureDate', criteria.segments.map((s) => formatHititDate(s.departureDate)).join(','));
  }

  // Passengers
  params.set('adult', String(criteria.passengers.adults));
  params.set('child', String(criteria.passengers.children));
  params.set('infant', String(criteria.passengers.infants));
  params.set('lang', 'en');
  params.set('withCalendar', 'true');

  if (criteria.promoCode) {
    params.set('promoCode', criteria.promoCode);
  }

  return `${baseHost}/availability?${params.toString()}`;
}

/**
 * Builds Hitit NIBE Check-In Search URL
 * GET /checkin/search?PNRNo=...&surname=...&lang=en
 */
export function buildHititCheckInUrl(pnr: string, surname: string, baseHost: string = HITIT_BASE_HOST): string {
  const params = new URLSearchParams({
    PNRNo: pnr.trim().toUpperCase(),
    surname: surname.trim().toUpperCase(),
    lang: 'en',
  });
  return `${baseHost}/checkin/search?${params.toString()}`;
}

/**
 * Builds Hitit NIBE Manage Reservation Search URL
 * GET /reservation?PNRNo=...&surname=...&lang=en
 */
export function buildHititReservationUrl(pnr: string, surname: string, baseHost: string = HITIT_BASE_HOST): string {
  const params = new URLSearchParams({
    PNRNo: pnr.trim().toUpperCase(),
    surname: surname.trim().toUpperCase(),
    lang: 'en',
  });
  return `${baseHost}/reservation?${params.toString()}`;
}

/**
 * Builds Hitit NIBE Timetable URL
 * GET /timetable/create?tripType=ONE_WAY&depPort=HRE&arrPort=VFA&date=DD.MM.YYYY
 */
export function buildHititTimetableUrl(
  origin: string,
  dest: string,
  date: string,
  baseHost: string = HITIT_BASE_HOST
): string {
  const params = new URLSearchParams({
    tripType: 'ONE_WAY',
    depPort: origin,
    arrPort: dest,
    date: formatHititDate(date),
  });
  return `${baseHost}/timetable/create?${params.toString()}`;
}
