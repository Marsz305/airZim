/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type TripType = 'one-way' | 'round-trip' | 'multi-city';
export type CabinClass = 'economy' | 'business' | 'first';
export type FareFamily = 'lite' | 'classic' | 'flex';
export type Currency = 'USD' | 'ZWL' | 'ZAR' | 'GBP';
export type PaymentMethod = 'card' | 'ecocash' | 'innbucks' | 'zimswitch' | 'ticket_office';
export type PassengerType = 'adult' | 'child' | 'infant';

export interface Airport {
  code: string;
  name: string;
  city: string;
  country: string;
  timezone: string;
  isHub?: boolean;
}

export interface PassengerCount {
  adults: number;
  children: number;
  infants: number;
}

export interface SearchSegmentCriteria {
  origin: Airport;
  destination: Airport;
  departureDate: string;
}

export interface SearchCriteria {
  tripType: TripType;
  segments: SearchSegmentCriteria[];
  returnDate?: string;
  passengers: PassengerCount;
  cabinClass: CabinClass;
  promoCode?: string;
}

export interface FareTierDetail {
  code: FareFamily;
  name: string;
  basePriceUSD: number;
  checkedBags: number;
  checkedBagWeightKg: number;
  cabinBagWeightKg: number;
  changeFeeUSD: number;
  isRefundable: boolean;
  refundFeeUSD: number;
  seatSelection: 'chargeable' | 'standard_free' | 'all_free';
  mealIncluded: boolean;
  priorityBoarding: boolean;
  rainbowMilesMultiplier: number;
  features: string[];
}

export interface AircraftSeat {
  id: string; // e.g. "12A"
  row: number;
  col: string; // "A", "B", "C", etc.
  cabin: 'business' | 'economy';
  type: 'standard' | 'extra_legroom' | 'exit_row' | 'bassinet';
  status: 'available' | 'occupied' | 'blocked';
  extraPriceUSD: number;
}

export interface AircraftConfig {
  model: 'Boeing 767-200ER' | 'Embraer ERJ-145';
  tailNumber: string;
  name: string; // e.g. "Chimanimani", "Mosi-oa-Tunya"
  businessLayout: { rows: number[]; columns: string[]; layoutName: string };
  economyLayout: { rows: number[]; columns: string[]; layoutName: string };
  exitRows: number[];
  bassinetRows: number[];
  extraLegroomRows: number[];
}

export interface FlightSegment {
  id: string;
  flightNumber: string; // e.g. "UM 462"
  origin: Airport;
  destination: Airport;
  departureDate: string;
  departureTime: string;
  arrivalDate: string;
  arrivalTime: string;
  duration: string;
  stops: number;
  stopDetails?: string;
  aircraft: AircraftConfig;
  fares: {
    economy: Record<FareFamily, FareTierDetail>;
    business: Record<FareFamily, FareTierDetail>;
  };
  seatMap: AircraftSeat[];
}

export interface PassengerDetails {
  id: string;
  passengerIndex: number;
  type: PassengerType;
  title: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other';
  nationality: string;
  passportNumber: string;
  passportExpiry: string;
  passportCountry: string;
  redressNumber?: string;
  frequentFlyerNumber?: string; // Rainbow Club
  specialAssistance?: 'none' | 'wheelchair' | 'visual_hearing' | 'unaccompanied_minor';
  mealPreference?: string;
  baggage: {
    checkedPieces: number;
    extraWeightKg: number;
  };
  selectedSeats: Record<string, string>; // segmentId -> seatId (e.g. "UM462" -> "14B")
}

export interface EmergencyContact {
  fullName: string;
  relationship: string;
  phoneNumber: string;
  email: string;
}

export interface PricingBreakdown {
  currency: Currency;
  exchangeRate: number; // vs USD
  baseFareUSD: number;
  passengerBaseFares: {
    adults: number;
    children: number;
    infants: number;
  };
  airportTaxesUSD: number;
  fuelSurchargeUSD: number;
  securityFeeUSD: number;
  ancillarySeatsUSD: number;
  ancillaryBaggageUSD: number;
  ancillaryMealsUSD: number;
  promoDiscountUSD: number;
  appliedPromo?: {
    code: string;
    description: string;
    discountPercent?: number;
    fixedDiscountUSD?: number;
  };
  subtotalUSD: number;
  totalUSD: number;
  totalInCurrency: number;
}

export interface BookingRecord {
  pnr: string; // 6 characters
  ticketNumber: string; // 638-XXXXXXXXXX
  bookingDate: string;
  status: 'CONFIRMED' | 'CHECKED_IN' | 'UPGRADED' | 'CANCELLED';
  cabinClass: CabinClass;
  fareFamily: FareFamily;
  tripType: TripType;
  segments: FlightSegment[];
  passengers: PassengerDetails[];
  emergencyContact: EmergencyContact;
  pricing: PricingBreakdown;
  payment: {
    method: PaymentMethod;
    transactionReference: string;
    paidAmountUSD: number;
    currency: Currency;
    paidAt: string;
    last4?: string;
    mobileNumber?: string;
  };
  checkInStatus?: {
    checkedInAt: string;
    boardingPasses: {
      passengerId: string;
      segmentId: string;
      boardingPassNumber: string;
      barcodeString: string;
      seat: string;
      gate: string;
      boardingTime: string;
      zone: string;
    }[];
  };
  cancellation?: {
    cancelledAt: string;
    penaltyFeeUSD: number;
    refundAmountUSD: number;
    refundStatus: 'PROCESSED' | 'PENDING';
  };
}
