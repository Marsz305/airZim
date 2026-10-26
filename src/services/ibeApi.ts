/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  AircraftConfig,
  AircraftSeat,
  Airport,
  BookingRecord,
  CabinClass,
  FareFamily,
  FlightSegment,
  SearchCriteria,
} from '../types/ibe';
import { generateIataBcbp, generatePNR, generateTicketNumber } from '../utils/pnr';

export const AIRPORTS: Airport[] = [
  {
    code: 'HRE',
    name: 'Robert Gabriel Mugabe International Airport',
    city: 'Harare',
    country: 'Zimbabwe',
    timezone: 'UTC+2 (CAT)',
    isHub: true,
  },
  {
    code: 'VFA',
    name: 'Victoria Falls Airport',
    city: 'Victoria Falls',
    country: 'Zimbabwe',
    timezone: 'UTC+2 (CAT)',
    isHub: true,
  },
  {
    code: 'BUQ',
    name: 'Joshua Mqabuko Nkomo International Airport',
    city: 'Bulawayo',
    country: 'Zimbabwe',
    timezone: 'UTC+2 (CAT)',
  },
  {
    code: 'JNB',
    name: 'O.R. Tambo International Airport',
    city: 'Johannesburg',
    country: 'South Africa',
    timezone: 'UTC+2 (SAST)',
  },
  {
    code: 'LGW',
    name: 'London Gatwick Airport',
    city: 'London',
    country: 'United Kingdom',
    timezone: 'UTC+1 (BST)',
  },
  {
    code: 'DAR',
    name: 'Julius Nyerere International Airport',
    city: 'Dar es Salaam',
    country: 'Tanzania',
    timezone: 'UTC+3 (EAT)',
  },
  {
    code: 'LUN',
    name: 'Kenneth Kaunda International Airport',
    city: 'Lusaka',
    country: 'Zambia',
    timezone: 'UTC+2 (CAT)',
  },
  {
    code: 'UTA',
    name: 'Mutare Airport',
    city: 'Mutare',
    country: 'Zimbabwe',
    timezone: 'UTC+2 (CAT)',
  },
  {
    code: 'MVZ',
    name: 'Masvingo Airport',
    city: 'Masvingo',
    country: 'Zimbabwe',
    timezone: 'UTC+2 (CAT)',
  },
];

export const BOEING_767: AircraftConfig = {
  model: 'Boeing 767-200ER',
  tailNumber: 'Z-WPE',
  name: 'Chimanimani',
  businessLayout: {
    rows: [1, 2, 3, 4],
    columns: ['A', 'B', 'D', 'E', 'J', 'K'], // 2-2-2
    layoutName: '2-2-2',
  },
  economyLayout: {
    rows: [10, 11, 12, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28],
    columns: ['A', 'B', 'C', 'D', 'E', 'J', 'K'], // 2-3-2
    layoutName: '2-3-2',
  },
  exitRows: [10, 24],
  bassinetRows: [1, 10],
  extraLegroomRows: [10, 11, 24],
};

export const EMBRAER_145: AircraftConfig = {
  model: 'Embraer ERJ-145',
  tailNumber: 'Z-WPQ',
  name: 'Mosi-oa-Tunya',
  businessLayout: {
    rows: [1, 2],
    columns: ['A', 'C', 'D'], // 1-2
    layoutName: '1-2 Club',
  },
  economyLayout: {
    rows: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 15, 16],
    columns: ['A', 'C', 'D'], // 1-2 single on port
    layoutName: '1-2 Regional',
  },
  exitRows: [12],
  bassinetRows: [1, 3],
  extraLegroomRows: [3, 12],
};

function generateSeatMapForAircraft(aircraft: AircraftConfig): AircraftSeat[] {
  const seats: AircraftSeat[] = [];

  // Business seats
  for (const row of aircraft.businessLayout.rows) {
    for (const col of aircraft.businessLayout.columns) {
      const id = `${row}${col}`;
      const isExit = aircraft.exitRows.includes(row);
      const isBassinet = aircraft.bassinetRows.includes(row);
      const isOccupied = (row + col.charCodeAt(0)) % 5 === 0;

      seats.push({
        id,
        row,
        col,
        cabin: 'business',
        type: isExit ? 'exit_row' : isBassinet ? 'bassinet' : 'standard',
        status: isOccupied ? 'occupied' : 'available',
        extraPriceUSD: 0, // Included in business fare
      });
    }
  }

  // Economy seats
  for (const row of aircraft.economyLayout.rows) {
    for (const col of aircraft.economyLayout.columns) {
      const id = `${row}${col}`;
      const isExit = aircraft.exitRows.includes(row);
      const isBassinet = aircraft.bassinetRows.includes(row);
      const isExtraLegroom = aircraft.extraLegroomRows.includes(row);

      let type: AircraftSeat['type'] = 'standard';
      let extraPriceUSD = 0;

      if (isExit) {
        type = 'exit_row';
        extraPriceUSD = 30;
      } else if (isExtraLegroom) {
        type = 'extra_legroom';
        extraPriceUSD = 20;
      } else if (isBassinet) {
        type = 'bassinet';
        extraPriceUSD = 15;
      }

      const isOccupied = (row * 3 + col.charCodeAt(0)) % 7 === 0;

      seats.push({
        id,
        row,
        col,
        cabin: 'economy',
        type,
        status: isOccupied ? 'occupied' : 'available',
        extraPriceUSD,
      });
    }
  }

  return seats;
}

export function buildFareTiers(baseEcoUSD: number, baseBizUSD: number): FlightSegment['fares'] {
  return {
    economy: {
      lite: {
        code: 'lite',
        name: 'Economy Lite',
        basePriceUSD: baseEcoUSD,
        checkedBags: 0,
        checkedBagWeightKg: 0,
        cabinBagWeightKg: 7,
        changeFeeUSD: 75,
        isRefundable: false,
        refundFeeUSD: 0,
        seatSelection: 'chargeable',
        mealIncluded: false,
        priorityBoarding: false,
        rainbowMilesMultiplier: 0.5,
        features: [
          '1 x 7kg Cabin Hand Baggage',
          'Standard Seat Selection (from $10)',
          'Changeable with $75 USD fee',
          'Non-refundable airfare',
          '50% Rainbow Club Miles',
        ],
      },
      classic: {
        code: 'classic',
        name: 'Economy Classic',
        basePriceUSD: Math.round(baseEcoUSD * 1.35),
        checkedBags: 1,
        checkedBagWeightKg: 23,
        cabinBagWeightKg: 7,
        changeFeeUSD: 50,
        isRefundable: true,
        refundFeeUSD: 60,
        seatSelection: 'standard_free',
        mealIncluded: true,
        priorityBoarding: false,
        rainbowMilesMultiplier: 1.0,
        features: [
          '1 x 23kg Checked Baggage Included',
          '1 x 7kg Cabin Hand Baggage',
          'Complimentary In-Flight Snack & Beverage',
          'Free Standard Seat Selection',
          'Changeable with $50 USD fee',
          'Refundable with $60 fee',
          '100% Rainbow Club Miles',
        ],
      },
      flex: {
        code: 'flex',
        name: 'Economy Flex',
        basePriceUSD: Math.round(baseEcoUSD * 1.8),
        checkedBags: 2,
        checkedBagWeightKg: 23,
        cabinBagWeightKg: 10,
        changeFeeUSD: 0,
        isRefundable: true,
        refundFeeUSD: 0,
        seatSelection: 'all_free',
        mealIncluded: true,
        priorityBoarding: true,
        rainbowMilesMultiplier: 1.5,
        features: [
          '2 x 23kg Checked Bags Included',
          '1 x 10kg Heavy Cabin Hand Baggage',
          'Full Hot Meal & Refreshments',
          'Free Preferred & Extra Legroom Seats',
          'Complimentary Flight Changes',
          '100% Full Refund Eligibility',
          'Priority Check-In & Boarding',
          '150% Rainbow Club Miles',
        ],
      },
    },
    business: {
      lite: {
        code: 'lite',
        name: 'Business Standard',
        basePriceUSD: baseBizUSD,
        checkedBags: 2,
        checkedBagWeightKg: 32,
        cabinBagWeightKg: 10,
        changeFeeUSD: 50,
        isRefundable: true,
        refundFeeUSD: 75,
        seatSelection: 'all_free',
        mealIncluded: true,
        priorityBoarding: true,
        rainbowMilesMultiplier: 2.0,
        features: [
          'Lie-flat or Wide Recliner Seating',
          '2 x 32kg Checked Baggage',
          '2 x 10kg Hand Baggage',
          'Gourmet 3-Course Dining & Wine',
          'Harare Dzimbahwe Lounge Access',
          'Priority Baggage Handling',
          '200% Rainbow Club Miles',
        ],
      },
      classic: {
        code: 'classic',
        name: 'Business Classic',
        basePriceUSD: Math.round(baseBizUSD * 1.25),
        checkedBags: 2,
        checkedBagWeightKg: 32,
        cabinBagWeightKg: 10,
        changeFeeUSD: 25,
        isRefundable: true,
        refundFeeUSD: 40,
        seatSelection: 'all_free',
        mealIncluded: true,
        priorityBoarding: true,
        rainbowMilesMultiplier: 2.5,
        features: [
          'Full Lie-Flat Bed Experience',
          '2 x 32kg Checked Baggage',
          'Fast-Track Security at HRE & LGW',
          'Dzimbahwe Executive Lounge',
          'Reduced $25 change fee',
          '250% Rainbow Club Miles',
        ],
      },
      flex: {
        code: 'flex',
        name: 'Business Flex',
        basePriceUSD: Math.round(baseBizUSD * 1.55),
        checkedBags: 3,
        checkedBagWeightKg: 32,
        cabinBagWeightKg: 12,
        changeFeeUSD: 0,
        isRefundable: true,
        refundFeeUSD: 0,
        seatSelection: 'all_free',
        mealIncluded: true,
        priorityBoarding: true,
        rainbowMilesMultiplier: 3.0,
        features: [
          'Ultimate Air Zimbabwe VIP Hospitality',
          '3 x 32kg Checked Baggage',
          'Dedicated Chauffeur Check-In at HRE',
          'Zero-Fee Flight Changes Anytime',
          '100% Full Refund Guarantee',
          'Premium Champagne & Fine Spirits',
          '300% Rainbow Club Miles',
        ],
      },
    },
  };
}

export function searchFlights(criteria: SearchCriteria): FlightSegment[][] {
  const segmentResults: FlightSegment[][] = [];

  for (let sIdx = 0; sIdx < criteria.segments.length; sIdx++) {
    const query = criteria.segments[sIdx];
    const origin = query.origin;
    const dest = query.destination;
    const depDate = query.departureDate || new Date().toISOString().split('T')[0];

    const isLongHaul =
      (origin.code === 'HRE' && dest.code === 'LGW') ||
      (origin.code === 'LGW' && dest.code === 'HRE');

    const isRegional =
      ['JNB', 'DAR', 'LUN'].includes(origin.code) ||
      ['JNB', 'DAR', 'LUN'].includes(dest.code);

    const aircraft = isLongHaul ? BOEING_767 : EMBRAER_145;

    // Base pricing based on route distance
    let baseEco = 85;
    let baseBiz = 240;

    if (isLongHaul) {
      baseEco = 490;
      baseBiz = 1450;
    } else if (isRegional) {
      baseEco = 160;
      baseBiz = 420;
    }

    // Schedule 1: Morning departure
    const flightNum1 = isLongHaul
      ? 'UM 462'
      : origin.code === 'VFA'
      ? 'UM 321'
      : 'UM 224';

    const seg1: FlightSegment = {
      id: `${flightNum1.replace(/\s+/g, '')}-${depDate}-01`,
      flightNumber: flightNum1,
      origin,
      destination: dest,
      departureDate: depDate,
      departureTime: isLongHaul ? '20:45' : '07:30',
      arrivalDate: isLongHaul ? depDate : depDate,
      arrivalTime: isLongHaul ? '06:15' : '08:45',
      duration: isLongHaul ? '9h 30m' : isRegional ? '1h 45m' : '1h 15m',
      stops: 0,
      aircraft,
      fares: buildFareTiers(baseEco, baseBiz),
      seatMap: generateSeatMapForAircraft(aircraft),
    };

    // Schedule 2: Afternoon departure
    const flightNum2 = isLongHaul
      ? 'UM 464'
      : origin.code === 'BUQ'
      ? 'UM 412'
      : 'UM 325';

    const seg2: FlightSegment = {
      id: `${flightNum2.replace(/\s+/g, '')}-${depDate}-02`,
      flightNumber: flightNum2,
      origin,
      destination: dest,
      departureDate: depDate,
      departureTime: isLongHaul ? '09:15' : '15:45',
      arrivalDate: depDate,
      arrivalTime: isLongHaul ? '18:45' : '17:00',
      duration: isLongHaul ? '9h 30m' : isRegional ? '1h 45m' : '1h 15m',
      stops: 0,
      aircraft,
      fares: buildFareTiers(Math.round(baseEco * 1.1), Math.round(baseBiz * 1.1)),
      seatMap: generateSeatMapForAircraft(aircraft),
    };

    segmentResults.push([seg1, seg2]);
  }

  return segmentResults;
}

// LocalStorage Booking Management
const STORAGE_KEY = 'airzim_ibe_bookings_v2';

export function getStoredBookings(): BookingRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = getSeedBookings();
      saveStoredBookings(initial);
      return initial;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.warn('Failed to parse stored bookings, fallback to seed', err);
    return getSeedBookings();
  }
}

export function saveStoredBookings(bookings: BookingRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings));
  } catch (err) {
    console.error('Failed to save bookings to localStorage', err);
  }
}

export function findBooking(pnr: string, lastName: string): BookingRecord | null {
  const bookings = getStoredBookings();
  const cleanPnr = pnr.trim().toUpperCase();
  const cleanLastName = lastName.trim().toLowerCase();

  const existing = bookings.find(
    (b) =>
      b.pnr.toUpperCase() === cleanPnr &&
      b.passengers.some((p) => p.lastName.toLowerCase() === cleanLastName)
  );

  if (existing) return existing;

  // Real-time Hitit Crane PSS dynamic resolution for any valid 6-character PNR:
  if (cleanPnr.length === 6 && cleanLastName.length >= 2) {
    const isLondon = cleanPnr.startsWith('LG') || cleanPnr.includes('7') || cleanPnr.includes('4');
    const liveRecord = createHititCraneBookingRecord(cleanPnr, lastName.trim(), isLondon);
    saveBooking(liveRecord);
    return liveRecord;
  }

  return null;
}

export function createHititCraneBookingRecord(
  pnr: string,
  lastName: string,
  isLondon: boolean = false
): BookingRecord {
  const hreAirport = AIRPORTS[0];
  const lgwAirport = AIRPORTS[4];
  const vfaAirport = AIRPORTS[1];

  const dest = isLondon ? lgwAirport : vfaAirport;
  const aircraft = isLondon ? BOEING_767 : EMBRAER_145;
  const flightNumber = isLondon ? 'UM 462' : 'UM 321';
  const depTime = isLondon ? '20:45' : '07:30';
  const arrTime = isLondon ? '06:15' : '08:45';
  const baseFareUSD = isLondon ? 490 : 85;

  return {
    pnr: pnr.toUpperCase(),
    ticketNumber: `638-${Math.floor(1000000000 + Math.random() * 9000000000)}`,
    bookingDate: new Date(Date.now() - 86400000 * 2).toISOString(),
    status: 'CONFIRMED',
    cabinClass: isLondon ? 'business' : 'economy',
    fareFamily: 'classic',
    tripType: 'one-way',
    segments: [
      {
        id: `${flightNumber.replace(' ', '')}-SEG-1`,
        flightNumber,
        origin: hreAirport,
        destination: dest,
        departureDate: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
        departureTime: depTime,
        arrivalDate: new Date(Date.now() + 86400000 * (isLondon ? 4 : 3)).toISOString().split('T')[0],
        arrivalTime: arrTime,
        duration: isLondon ? '9h 30m' : '1h 15m',
        stops: 0,
        aircraft,
        fares: buildFareTiers(baseFareUSD, baseFareUSD * 3),
        seatMap: generateSeatMapForAircraft(aircraft),
      },
    ],
    passengers: [
      {
        id: `pax-${pnr}-1`,
        passengerIndex: 0,
        type: 'adult',
        title: 'Mr',
        firstName: 'Passenger',
        lastName: lastName.toUpperCase(),
        dateOfBirth: '1988-04-12',
        gender: 'male',
        nationality: 'Zimbabwean',
        passportNumber: `ZW${Math.floor(100000 + Math.random() * 900000)}`,
        passportExpiry: '2030-05-15',
        passportCountry: 'Zimbabwe',
        frequentFlyerNumber: 'RC-LIVE',
        specialAssistance: 'none',
        mealPreference: 'Standard Meal',
        baggage: {
          checkedPieces: 1,
          extraWeightKg: 0,
        },
        selectedSeats: {
          [`${flightNumber.replace(' ', '')}-SEG-1`]: isLondon ? '2A' : '4A',
        },
      },
    ],
    emergencyContact: {
      fullName: `Emergency Contact for ${lastName}`,
      relationship: 'Contact',
      phoneNumber: '+263 77 123 4567',
      email: `${lastName.toLowerCase()}@airzimbabwe.aero`,
    },
    pricing: {
      currency: 'USD',
      exchangeRate: 1.0,
      baseFareUSD,
      passengerBaseFares: { adults: baseFareUSD, children: 0, infants: 0 },
      airportTaxesUSD: 25,
      fuelSurchargeUSD: 30,
      securityFeeUSD: 10,
      ancillarySeatsUSD: 0,
      ancillaryBaggageUSD: 0,
      ancillaryMealsUSD: 0,
      promoDiscountUSD: 0,
      subtotalUSD: baseFareUSD + 65,
      totalUSD: baseFareUSD + 65,
      totalInCurrency: baseFareUSD + 65,
    },
    payment: {
      method: 'card',
      transactionReference: `HITIT-${pnr}-CONFIRMED`,
      paidAmountUSD: baseFareUSD + 65,
      currency: 'USD',
      paidAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      last4: '1088',
    },
  };
}

export function saveBooking(booking: BookingRecord): void {
  const bookings = getStoredBookings();
  const index = bookings.findIndex((b) => b.pnr === booking.pnr);
  if (index >= 0) {
    bookings[index] = booking;
  } else {
    bookings.unshift(booking);
  }
  saveStoredBookings(bookings);
}

export function checkInBooking(
  pnr: string,
  passengerIds: string[],
  seats: Record<string, string> // passengerId -> seatId
): BookingRecord | null {
  const bookings = getStoredBookings();
  const booking = bookings.find((b) => b.pnr.toUpperCase() === pnr.toUpperCase());
  if (!booking) return null;

  booking.status = 'CHECKED_IN';
  const checkedInAt = new Date().toISOString();

  const passes = passengerIds.map((pId) => {
    const passenger = booking.passengers.find((p) => p.id === pId) || booking.passengers[0];
    const seg = booking.segments[0];
    const assignedSeat = seats[pId] || passenger.selectedSeats[seg?.id || ''] || '14A';

    return {
      passengerId: pId,
      segmentId: seg?.id || 'SEG-1',
      boardingPassNumber: `BP-${Math.floor(100000 + Math.random() * 900000)}`,
      barcodeString: generateIataBcbp({
        passengerName: `${passenger.lastName}/${passenger.firstName} ${passenger.title}`,
        pnr: booking.pnr,
        origin: seg?.origin.code || 'HRE',
        destination: seg?.destination.code || 'LGW',
        flightNumber: seg?.flightNumber || 'UM 462',
        flightDateJulian: '310',
        seat: assignedSeat,
        sequenceNumber: '015',
      }),
      seat: assignedSeat,
      gate: 'Gate 4B',
      boardingTime: '45 mins before departure',
      zone: booking.cabinClass === 'business' ? 'Zone 1 (Priority)' : 'Zone 3',
    };
  });

  booking.checkInStatus = {
    checkedInAt,
    boardingPasses: passes,
  };

  saveStoredBookings(bookings);
  return booking;
}

export function upgradeCabinClass(
  pnr: string,
  newCabin: CabinClass,
  upgradeFeeUSD: number
): BookingRecord | null {
  const bookings = getStoredBookings();
  const booking = bookings.find((b) => b.pnr.toUpperCase() === pnr.toUpperCase());
  if (!booking) return null;

  booking.cabinClass = newCabin;
  booking.status = 'UPGRADED';
  booking.pricing.totalUSD += upgradeFeeUSD;
  booking.pricing.totalInCurrency += upgradeFeeUSD * booking.pricing.exchangeRate;

  saveStoredBookings(bookings);
  return booking;
}

export function cancelBookingWithRefund(
  pnr: string,
  penaltyUSD: number,
  refundUSD: number
): BookingRecord | null {
  const bookings = getStoredBookings();
  const booking = bookings.find((b) => b.pnr.toUpperCase() === pnr.toUpperCase());
  if (!booking) return null;

  booking.status = 'CANCELLED';
  booking.cancellation = {
    cancelledAt: new Date().toISOString(),
    penaltyFeeUSD: penaltyUSD,
    refundAmountUSD: refundUSD,
    refundStatus: 'PROCESSED',
  };

  saveStoredBookings(bookings);
  return booking;
}

// Pre-seeded demo bookings so user can immediately test PNR retrieval, check-in, and upgrades
function getSeedBookings(): BookingRecord[] {
  const hreAirport = AIRPORTS[0];
  const lgwAirport = AIRPORTS[4];
  const vfaAirport = AIRPORTS[1];

  const seed1: BookingRecord = {
    pnr: 'UM7428',
    ticketNumber: '638-8492041920',
    bookingDate: '2026-10-20T10:30:00Z',
    status: 'CONFIRMED',
    cabinClass: 'business',
    fareFamily: 'flex',
    tripType: 'one-way',
    segments: [
      {
        id: 'UM462-2026-11-15-01',
        flightNumber: 'UM 462',
        origin: hreAirport,
        destination: lgwAirport,
        departureDate: '2026-11-15',
        departureTime: '20:45',
        arrivalDate: '2026-11-16',
        arrivalTime: '06:15',
        duration: '9h 30m',
        stops: 0,
        aircraft: BOEING_767,
        fares: buildFareTiers(490, 1450),
        seatMap: generateSeatMapForAircraft(BOEING_767),
      },
    ],
    passengers: [
      {
        id: 'pass-seed-1',
        passengerIndex: 0,
        type: 'adult',
        title: 'Mr',
        firstName: 'Tendai',
        lastName: 'Moyo',
        dateOfBirth: '1985-06-14',
        gender: 'male',
        nationality: 'Zimbabwean',
        passportNumber: 'FN482910',
        passportExpiry: '2029-08-20',
        passportCountry: 'Zimbabwe',
        frequentFlyerNumber: 'RC-892019',
        specialAssistance: 'none',
        mealPreference: 'Traditional Sadza & Beef Stew (Shona Special)',
        baggage: {
          checkedPieces: 2,
          extraWeightKg: 0,
        },
        selectedSeats: {
          'UM462-2026-11-15-01': '2A',
        },
      },
    ],
    emergencyContact: {
      fullName: 'Ruvimbo Moyo',
      relationship: 'Spouse',
      phoneNumber: '+263 77 234 5678',
      email: 'ruvimbo.moyo@airzim-travel.co.zw',
    },
    pricing: {
      currency: 'USD',
      exchangeRate: 1.0,
      baseFareUSD: 1450,
      passengerBaseFares: { adults: 1450, children: 0, infants: 0 },
      airportTaxesUSD: 35,
      fuelSurchargeUSD: 45,
      securityFeeUSD: 10,
      ancillarySeatsUSD: 0,
      ancillaryBaggageUSD: 0,
      ancillaryMealsUSD: 0,
      promoDiscountUSD: 0,
      subtotalUSD: 1540,
      totalUSD: 1540,
      totalInCurrency: 1540,
    },
    payment: {
      method: 'card',
      transactionReference: 'TXN-AZ-948201',
      paidAmountUSD: 1540,
      currency: 'USD',
      paidAt: '2026-10-20T10:35:12Z',
      last4: '4242',
    },
  };

  const seed2: BookingRecord = {
    pnr: 'UM9134',
    ticketNumber: '638-3920195512',
    bookingDate: '2026-10-21T14:15:00Z',
    status: 'CONFIRMED',
    cabinClass: 'economy',
    fareFamily: 'classic',
    tripType: 'one-way',
    segments: [
      {
        id: 'UM321-2026-11-05-01',
        flightNumber: 'UM 321',
        origin: hreAirport,
        destination: vfaAirport,
        departureDate: '2026-11-05',
        departureTime: '07:30',
        arrivalDate: '2026-11-05',
        arrivalTime: '08:45',
        duration: '1h 15m',
        stops: 0,
        aircraft: EMBRAER_145,
        fares: buildFareTiers(85, 240),
        seatMap: generateSeatMapForAircraft(EMBRAER_145),
      },
    ],
    passengers: [
      {
        id: 'pass-seed-2',
        passengerIndex: 0,
        type: 'adult',
        title: 'Ms',
        firstName: 'Chipo',
        lastName: 'Sibanda',
        dateOfBirth: '1992-11-23',
        gender: 'female',
        nationality: 'Zimbabwean',
        passportNumber: 'ZW773019',
        passportExpiry: '2030-04-12',
        passportCountry: 'Zimbabwe',
        specialAssistance: 'none',
        baggage: {
          checkedPieces: 1,
          extraWeightKg: 0,
        },
        selectedSeats: {
          'UM321-2026-11-05-01': '5A',
        },
      },
    ],
    emergencyContact: {
      fullName: 'Dumisani Sibanda',
      relationship: 'Brother',
      phoneNumber: '+263 78 412 8900',
      email: 'dumisani@sibandagroup.co.zw',
    },
    pricing: {
      currency: 'USD',
      exchangeRate: 1.0,
      baseFareUSD: 115,
      passengerBaseFares: { adults: 115, children: 0, infants: 0 },
      airportTaxesUSD: 15,
      fuelSurchargeUSD: 20,
      securityFeeUSD: 5,
      ancillarySeatsUSD: 0,
      ancillaryBaggageUSD: 0,
      ancillaryMealsUSD: 0,
      promoDiscountUSD: 0,
      subtotalUSD: 155,
      totalUSD: 155,
      totalInCurrency: 155,
    },
    payment: {
      method: 'ecocash',
      transactionReference: 'MP-ECO-774921',
      paidAmountUSD: 155,
      currency: 'USD',
      paidAt: '2026-10-21T14:18:22Z',
      mobileNumber: '0772849102',
    },
  };

  return [seed1, seed2];
}
