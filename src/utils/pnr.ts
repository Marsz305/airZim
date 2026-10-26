/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export function generatePNR(): string {
  // Air Zimbabwe uses 6-character alphanumeric references often prefixed with UM or ZW,
  // or standard Amadeus/Crane GDS 6-character strings.
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let randomPart = '';
  for (let i = 0; i < 4; i++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `UM${randomPart}`;
}

export function generateTicketNumber(): string {
  // Air Zimbabwe IATA airline accounting prefix is 638
  const digits = Math.floor(1000000000 + Math.random() * 9000000000).toString();
  return `638-${digits}`;
}

export function generateIataBcbp(params: {
  passengerName: string; // "MOYO/TENDAI MR"
  pnr: string;
  origin: string; // "HRE"
  destination: string; // "LGW"
  flightNumber: string; // "UM 462"
  flightDateJulian: string;
  seat: string; // "14B"
  sequenceNumber: string;
}): string {
  const { passengerName, pnr, origin, destination, flightNumber, flightDateJulian, seat, sequenceNumber } = params;
  const cleanName = passengerName.toUpperCase().padEnd(20, ' ').substring(0, 20);
  const cleanPnr = pnr.toUpperCase().padEnd(7, ' ').substring(0, 7);
  const cleanSeat = seat.toUpperCase().padEnd(4, '0').substring(0, 4);

  // M1Format conforming to IATA Resolution 792
  return `M1${cleanName}E${cleanPnr}${origin}${destination}UM${flightNumber.replace(/\D/g, '').padStart(4, '0')}${flightDateJulian}Y${cleanSeat}${sequenceNumber.padStart(4, '0')}100`;
}

export function assignBoardingZoneAndGate(cabin: 'economy' | 'business', rowNumber: number): {
  zone: string;
  gate: string;
} {
  const gates = ['Gate 3', 'Gate 4A', 'Gate 5B', 'Gate 7'];
  const gate = gates[Math.floor(Math.random() * gates.length)];

  if (cabin === 'business') {
    return { zone: 'Zone 1 (Priority)', gate };
  }

  if (rowNumber <= 15) {
    return { zone: 'Zone 2', gate };
  } else if (rowNumber <= 25) {
    return { zone: 'Zone 3', gate };
  } else {
    return { zone: 'Zone 4', gate };
  }
}
