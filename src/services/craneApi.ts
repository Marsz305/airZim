/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Hitit Crane NIBE (New Internet Booking Engine) & Search API SDK
 * Based on HititCS NIBE Parametric Links v1.4.26 and searchapi.js
 *
 * Implements:
 * - AvailabilityRequest
 * - PassengerQuantity
 * - CraneSearchAPI
 *
 * Exposes window.CraneSearchAPI, window.AvailabilityRequest, and window.PassengerQuantity
 * for complete compatibility with Air Zimbabwe's Hitit Crane deployment.
 */

export interface HititAvailableFlightDate {
  date: string; // YYYY-MM-DD or DD.MM.YYYY
  dayOfWeek?: number;
  available: boolean;
  minPrice?: number;
  currency?: string;
  flightNumbers?: string[];
}

export interface HititPort {
  code: string;
  name: string;
  city: string;
  country: string;
}

export class PassengerQuantity {
  passengerType: string; // "ADLT" | "CHLD" | "INFT"
  passengerSubType?: string; // e.g. "STDT"
  quantity: number;

  constructor(passengerType: string, passengerSubType?: string, quantity: number = 1) {
    this.passengerType = passengerType;
    this.passengerSubType = passengerSubType;
    this.quantity = quantity;
  }
}

export class AvailabilityRequest {
  tripType: 'ONE_WAY' | 'ROUND_TRIP' | 'MULTI_DIRECTIONAL';
  depPort: string;
  arrPort: string;
  departureDate: string; // DD.MM.YYYY or comma-separated
  returnDate?: string; // DD.MM.YYYY
  passengerQuantities: PassengerQuantity[];
  currency: string;
  cabinClass?: string;
  lang: string;
  nationality?: string;
  promoCode?: string;
  accountCode?: string;
  affiliateCode?: string;
  clickId?: string;
  withCalendar: boolean;
  isMobileCalendar: boolean;
  market?: string;
  isFFPoint: boolean;

  constructor(
    tripType: 'ONE_WAY' | 'ROUND_TRIP' | 'MULTI_DIRECTIONAL',
    depPort: string,
    arrPort: string,
    departureDate: string,
    returnDate?: string,
    passengerQuantities: PassengerQuantity[] = [new PassengerQuantity('ADLT', undefined, 1)],
    currency: string = 'USD',
    cabinClass?: string,
    lang: string = 'en',
    nationality?: string,
    promoCode?: string,
    accountCode?: string,
    affiliateCode?: string,
    clickId?: string,
    withCalendar: boolean = true,
    isMobileCalendar: boolean = false,
    market?: string,
    isFFPoint: boolean = false
  ) {
    this.tripType = tripType;
    this.depPort = depPort;
    this.arrPort = arrPort;
    this.departureDate = departureDate;
    this.returnDate = returnDate;
    this.passengerQuantities = passengerQuantities;
    this.currency = currency;
    this.cabinClass = cabinClass;
    this.lang = lang;
    this.nationality = nationality;
    this.promoCode = promoCode;
    this.accountCode = accountCode;
    this.affiliateCode = affiliateCode;
    this.clickId = clickId;
    this.withCalendar = withCalendar;
    this.isMobileCalendar = isMobileCalendar;
    this.market = market;
    this.isFFPoint = isFFPoint;
  }

  toQueryString(): string {
    const params = new URLSearchParams();
    params.set('tripType', this.tripType);
    params.set('depPort', this.depPort);
    params.set('arrPort', this.arrPort);
    params.set('departureDate', this.departureDate);

    if (this.returnDate && this.tripType === 'ROUND_TRIP') {
      params.set('returnDate', this.returnDate);
    }

    if (this.passengerQuantities && this.passengerQuantities.length > 0) {
      this.passengerQuantities.forEach((pq, idx) => {
        params.set(`passengerQuantities[${idx}][passengerType]`, pq.passengerType);
        if (pq.passengerSubType) {
          params.set(`passengerQuantities[${idx}][passengerSubType]`, pq.passengerSubType);
        }
        params.set(`passengerQuantities[${idx}][quantity]`, String(pq.quantity));
      });

      // Legacy fallback parameters supported by Crane NIBE:
      const adults = this.passengerQuantities
        .filter((p) => p.passengerType === 'ADLT')
        .reduce((sum, p) => sum + p.quantity, 0);
      const children = this.passengerQuantities
        .filter((p) => p.passengerType === 'CHLD')
        .reduce((sum, p) => sum + p.quantity, 0);
      const infants = this.passengerQuantities
        .filter((p) => p.passengerType === 'INFT')
        .reduce((sum, p) => sum + p.quantity, 0);

      params.set('adult', String(adults || 1));
      params.set('child', String(children || 0));
      params.set('infant', String(infants || 0));
    }

    if (this.currency) params.set('currency', this.currency);
    if (this.cabinClass) params.set('cabinClass', this.cabinClass);
    if (this.lang) params.set('lang', this.lang);
    if (this.nationality) params.set('nationality', this.nationality);
    if (this.promoCode) params.set('promoCode', this.promoCode);
    if (this.accountCode) params.set('accountCode', this.accountCode);
    if (this.affiliateCode) params.set('affiliateCode', this.affiliateCode);
    if (this.clickId) params.set('clickId', this.clickId);
    if (this.withCalendar !== undefined) params.set('withCalendar', String(this.withCalendar));
    if (this.isMobileCalendar !== undefined) params.set('isMobileCalendar', String(this.isMobileCalendar));
    if (this.market) params.set('market', this.market);
    if (this.isFFPoint !== undefined) params.set('isFFPoint', String(this.isFFPoint));

    return params.toString();
  }
}

/**
 * Format Date to Hitit NIBE standard DD.MM.YYYY
 */
export function formatToHititDate(dateStr: string): string {
  if (!dateStr) return '';
  if (dateStr.includes('.')) return dateStr;
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const [y, m, d] = parts;
    return `${d.padStart(2, '0')}.${m.padStart(2, '0')}.${y}`;
  }
  return dateStr;
}

/**
 * Convert DD.MM.YYYY to YYYY-MM-DD
 */
export function hititDateToIso(hititDate: string): string {
  if (!hititDate) return '';
  const value = hititDate.trim();

  // Crane responses can use ISO dates, ISO timestamps, or HITIT's DD.MM.YYYY.
  // Extract the calendar date only; do not let a time suffix make a valid day fail.
  const isoMatch = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:$|T|\s)/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  const hititMatch = value.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (hititMatch) {
    const [, d, m, y] = hititMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return '';
}

export class CraneSearchAPI {
  baseUrl: string;
  portUrl: string;

  constructor(
    baseUrl: string = 'https://airzimbabwe.aero',
    portUrl: string | null = null
  ) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.portUrl = (portUrl || (typeof window !== 'undefined' ? '/api/hitit' : baseUrl)).replace(/\/$/, '');
  }

  // Set active base URLs
  setEndpoints(baseUrl: string, portUrl?: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.portUrl = (portUrl || baseUrl).replace(/\/$/, '');
  }

  /**
   * Helper to make API requests with fallback to local API proxy
   */
  private async fetchApi<T>(endpoint: string, fallbackData?: T): Promise<T> {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

    // 1. Try local proxy / configured portUrl
    try {
      const url = this.portUrl.startsWith('/') || this.portUrl.startsWith('http')
        ? `${this.portUrl}${cleanEndpoint}`
        : `/api/hitit${cleanEndpoint}`;

      const res = await fetch(url, {
        headers: {
          Accept: 'application/json',
        },
      });
      if (res.ok) {
        return (await res.json()) as T;
      }
    } catch {
      // Proceed to fallback
    }

    // Try server proxy route
    try {
      const proxyUrl = `/api/hitit${cleanEndpoint}`;
      const res = await fetch(proxyUrl, {
        headers: {
          Accept: 'application/json',
        },
      });
      if (res.ok) {
        return (await res.json()) as T;
      }
    } catch {
      // Proxy failed or not running
    }

    if (fallbackData !== undefined) {
      return fallbackData;
    }
    throw new Error(`Hitit API call failed for ${cleanEndpoint}`);
  }

  /**
   * GET /search/portCodes
   */
  async portCodes(): Promise<string[]> {
    return this.fetchApi<string[]>('/search/portGroupsByPortCode', [
      'HRE', 'VFA', 'BUQ', 'JNB', 'LGW', 'DAR', 'LUN'
    ]);
  }

  /**
   * GET /search/portGroups
   */
  async portGroups(): Promise<Record<string, string[]>> {
    return this.fetchApi<Record<string, string[]>>('/search/portGroups', {
      Domestic: ['HRE', 'VFA', 'BUQ'],
      Regional: ['JNB', 'DAR', 'LUN'],
      International: ['LGW'],
    });
  }

  /**
   * GET /search/portGroupsByCountry/:country
   */
  async portGroupsFor(country: string): Promise<Record<string, string[]>> {
    return this.fetchApi<Record<string, string[]>>(`/search/portGroupsByCountry/${encodeURIComponent(country)}`, {
      Zimbabwe: ['HRE', 'VFA', 'BUQ'],
    });
  }

  /**
   * GET /search/portNames
   */
  async portNames(): Promise<Record<string, string>> {
    return this.fetchApi<Record<string, string>>('/search/portNames', {
      HRE: 'Robert Gabriel Mugabe International Airport (Harare)',
      VFA: 'Victoria Falls Airport',
      BUQ: 'Joshua Mqabuko Nkomo International Airport (Bulawayo)',
      JNB: 'O.R. Tambo International Airport (Johannesburg)',
      LGW: 'London Gatwick Airport',
      DAR: 'Julius Nyerere International Airport (Dar es Salaam)',
      LUN: 'Kenneth Kaunda International Airport (Lusaka)',
    });
  }

  /**
   * GET /search/languages
   */
  async languages(): Promise<Array<{ code: string; name: string }>> {
    return this.fetchApi('/search/languages', [
      { code: 'en', name: 'English' },
      { code: 'sn', name: 'Shona' },
      { code: 'nd', name: 'Ndebele' },
    ]);
  }

  /**
   * GET /search/currencies
   */
  async currencies(): Promise<string[]> {
    return this.fetchApi<string[]>('/search/currencies', ['USD', 'ZWL', 'ZAR', 'GBP']);
  }

  /**
   * GET /search/cabinClasses
   */
  async cabinClasses(): Promise<string[]> {
    return this.fetchApi<string[]>('/search/cabinClasses', ['ECONOMY', 'BUSINESS', 'FIRST']);
  }

  /**
   * GET /search/maxSegmentCount
   */
  async maxSegmentCount(): Promise<number> {
    return this.fetchApi<number>('/search/maxSegmentCount', 4);
  }

  /**
   * GET /search/passengerLimit
   */
  async maxPassengerCount(): Promise<number> {
    return this.fetchApi<number>('/search/passengerLimit', 9);
  }

  /**
   * GET /search/availablePassengerTypes?depPort=&arrPort=
   */
  async getAdditionalPassengerTypes(depPort: string, arrPort: string): Promise<string[]> {
    return this.fetchApi<string[]>(
      `/search/availablePassengerTypes?depPort=${depPort}&arrPort=${arrPort}`,
      ['ADLT', 'CHLD', 'INFT', 'STDT', 'SEAT']
    );
  }

  /**
   * GET /search/availableNations?depPort=&arrPort=
   */
  async getAvailableNations(depPort: string, arrPort: string): Promise<string[]> {
    return this.fetchApi<string[]>(
      `/search/availableNations?depPort=${depPort}&arrPort=${arrPort}`,
      ['ZW', 'ZA', 'GB', 'TZ', 'ZM', 'US', 'AU', 'BW']
    );
  }

  /**
   * GET /search/availableFlightDates?depPort=&arrPort=&startDate=&endDate=
   * Core endpoint for flight calendar date picker!
   * Returns list of dates that have active flights between origin and destination.
   */
  async getAvailableFlightDates(
    depPort: string,
    arrPort: string,
    startDate: string, // YYYY-MM-DD or DD.MM.YYYY
    endDate: string // YYYY-MM-DD or DD.MM.YYYY
  ): Promise<HititAvailableFlightDate[]> {
    const formattedStart = formatToHititDate(startDate);
    const formattedEnd = formatToHititDate(endDate);
    const query = `/search/availableFlightDates?depPort=${encodeURIComponent(depPort)}&arrPort=${encodeURIComponent(arrPort)}&startDate=${encodeURIComponent(formattedStart)}&endDate=${encodeURIComponent(formattedEnd)}`;

    // Do not fall back to generated schedules: only the live IBE response is authoritative.
    const response = await this.fetchApi<unknown>(query);
    const payload: any = response;
    const candidates = [
      payload,
      payload?.availableDates,
      payload?.dates,
      payload?.data?.availableDates,
      payload?.data?.dates,
      payload?.result?.availableDates,
      payload?.result?.dates,
    ];
    const rawDates: any[] = candidates.find(Array.isArray) || [];
    if (!rawDates.length && !candidates.some(Array.isArray)) {
      throw new Error('The flight-date endpoint returned an unrecognized response format.');
    }

    return rawDates.map((item: any): HititAvailableFlightDate | null => {
      const rawDate = typeof item === 'string' ? item : item?.date || item?.flightDate || item?.departureDate || item?.flight_date;
      if (typeof rawDate !== 'string' || !rawDate.trim()) return null;
      const isoDate = hititDateToIso(rawDate.trim());
      // Only accept real calendar dates after normalization.
      if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return null;
      const [year, month, day] = isoDate.split('-').map(Number);
      const date = new Date(Date.UTC(year, month - 1, day));
      if (Number.isNaN(date.getTime()) || date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
      const availabilityFlag = item?.available ?? item?.isAvailable ?? item?.is_available;
      const available = typeof item === 'string' || !(availabilityFlag === false || availabilityFlag === 0 || availabilityFlag === 'false' || availabilityFlag === '0');
      return {
        date: isoDate,
        available,
        ...(Number.isFinite(Number(item?.minPrice ?? item?.price)) && (item?.minPrice ?? item?.price) !== ''
          ? { minPrice: Number(item?.minPrice ?? item?.price) }
          : {}),
        currency: item?.currency || 'USD',
        flightNumbers: Array.isArray(item?.flightNumbers) ? item.flightNumbers : [],
      };
    }).filter((item): item is HititAvailableFlightDate => item !== null);
  }

  /**
   * Search and redirect directly to Hitit Crane IBE availability page
   */
  search(
    tripType: string,
    depPort: string,
    arrPort: string,
    departureDate?: string,
    returnDate?: string,
    adult: number = 1,
    child: number = 0,
    infant: number = 0,
    currency?: string,
    lang: string = 'en',
    cabinClass?: string
  ): string {
    let url = `${this.baseUrl}/availability?tripType=${encodeURIComponent(tripType)}`;
    url += `&depPort=${encodeURIComponent(depPort)}&arrPort=${encodeURIComponent(arrPort)}`;

    if (departureDate) {
      url += `&departureDate=${encodeURI(formatToHititDate(departureDate))}`;
    }
    if (returnDate) {
      url += `&returnDate=${encodeURI(formatToHititDate(returnDate))}`;
    }

    url += `&adult=${adult}&child=${child}&infant=${infant}`;

    if (cabinClass) url += `&cabinClass=${encodeURIComponent(cabinClass)}`;
    if (currency) url += `&currency=${encodeURIComponent(currency)}`;
    if (lang) url += `&lang=${encodeURIComponent(lang)}`;
    url += '&withCalendar=true';

    return url;
  }

  /**
   * searchV2 with AvailabilityRequest instance
   */
  searchV2(request: AvailabilityRequest): string {
    const qs = request.toQueryString();
    return `${this.baseUrl}/availability?${qs}`;
  }

  /**
   * Web Check-in Endpoint: GET /checkin/search?PNRNo=...&surname=...&lang=...
   */
  getCheckinUrl(pnr: string, surname: string, lang: string = 'en'): string {
    const params = new URLSearchParams({
      PNRNo: pnr.trim().toUpperCase(),
      surname: surname.trim().toUpperCase(),
      lang,
    });
    return `${this.baseUrl}/checkin/search?${params.toString()}`;
  }

  /**
   * Flight Status Endpoint: GET /flightStatus
   */
  getFlightStatusUrl(lang: string = 'en'): string {
    return `${this.baseUrl}/flightStatus?lang=${lang}`;
  }

  /**
   * Timetable Parametric Endpoint: GET /timetable/create?tripType=...&depPort=...&arrPort=...&date=...&lang=...
   */
  getTimetableUrl(
    tripType: 'ONE_WAY' | 'ROUND_TRIP',
    depPort: string,
    arrPort: string,
    date: string,
    lang: string = 'en'
  ): string {
    const params = new URLSearchParams({
      tripType,
      depPort,
      arrPort,
      date: formatToHititDate(date),
      lang,
    });
    return `${this.baseUrl}/timetable/create?${params.toString()}`;
  }

  /**
   * Manage Booking / Reservation Endpoint: GET /reservation?PNRNo=...&surname=...&lang=...
   */
  getReservationUrl(pnr: string, surname: string, lang: string = 'en'): string {
    const params = new URLSearchParams({
      PNRNo: pnr.trim().toUpperCase(),
      surname: surname.trim().toUpperCase(),
      lang,
    });
    return `${this.baseUrl}/reservation?${params.toString()}`;
  }

  /**
   * Boarding Pass Endpoint: GET /boardingPass/?C=...&H=...&lang=...
   */
  getBoardingPassUrl(code: string, hash: string, lang: string = 'en'): string {
    const params = new URLSearchParams({
      C: code,
      H: hash,
      lang,
    });
    return `${this.baseUrl}/boardingPass/?${params.toString()}`;
  }
}

// Instantiate default singleton with /api/hitit proxy
export const craneSearchApi = new CraneSearchAPI(
  'https://book-airzimbabwe.crane.aero/ibe',
  '/api/hitit'
);

// Bind to window object for strict compatibility with Hitit client integration
if (typeof window !== 'undefined') {
  (window as any).AvailabilityRequest = AvailabilityRequest;
  (window as any).PassengerQuantity = PassengerQuantity;
  (window as any).CraneSearchAPI = CraneSearchAPI;
  (window as any).craneSearchApi = craneSearchApi;
}
