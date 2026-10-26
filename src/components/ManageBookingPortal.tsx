/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Search,
  CheckCircle,
  AlertTriangle,
  Sparkles,
  Printer,
  QrCode,
  ShieldAlert,
  Link2,
} from 'lucide-react';
import { BookingRecord, CabinClass, Currency } from '../types/ibe';
import {
  checkInBooking,
  upgradeCabinClass,
  cancelBookingWithRefund,
  findBooking,
  getStoredBookings,
} from '../services/ibeApi';
import { calculateCancellationRefund, formatPrice } from '../utils/pricing';
import { validatePnrFormat } from '../utils/validation';
import { buildHititCheckInUrl, buildHititReservationUrl } from '../utils/hititNibe';
import { craneSearchApi } from '../services/craneApi';

interface ManageBookingPortalProps {
  initialPnr?: string;
  initialLastName?: string;
  initialSubTab?: 'tracking' | 'checkin' | 'upgrade' | 'cancel';
  currency: Currency;
  onBookingUpdated?: (booking: BookingRecord) => void;
}

export const ManageBookingPortal: React.FC<ManageBookingPortalProps> = ({
  initialPnr = '',
  initialLastName = '',
  initialSubTab = 'tracking',
  currency,
  onBookingUpdated,
}) => {
  const [subTab, setSubTab] = useState<'tracking' | 'checkin' | 'upgrade' | 'cancel'>(initialSubTab);

  const [pnrInput, setPnrInput] = useState<string>(initialPnr);
  const [lastNameInput, setLastNameInput] = useState<string>(initialLastName);
  const [activeBooking, setActiveBooking] = useState<BookingRecord | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const [selectedCheckInPax, setSelectedCheckInPax] = useState<string[]>([]);
  const [dangerousGoodsConfirmed, setDangerousGoodsConfirmed] = useState<boolean>(false);
  const [checkInSuccess, setCheckInSuccess] = useState<boolean>(false);

  const [upgradeSuccess, setUpgradeSuccess] = useState<boolean>(false);
  const [cancelStep, setCancelStep] = useState<'review' | 'confirmed'>('review');

  useEffect(() => {
    if (initialPnr) {
      setPnrInput(initialPnr);
      const bookings = getStoredBookings();
      const match = bookings.find((b) => b.pnr.toUpperCase() === initialPnr.toUpperCase());
      if (match) {
        setActiveBooking(match);
        setLastNameInput(match.passengers[0]?.lastName || '');
        setSelectedCheckInPax(match.passengers.map((p) => p.id));
      }
    }
  }, [initialPnr]);

  const handleSearchBooking = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const valPnr = validatePnrFormat(pnrInput);
    if (!valPnr.isValid) {
      setErrorMessage(valPnr.error || 'Please enter a valid 6-character PNR');
      return;
    }

    if (!lastNameInput.trim()) {
      setErrorMessage('Please enter the passenger last name as ticketed');
      return;
    }

    // Live reservations belong to the airline booking system; the browser's local demo
    // booking store cannot retrieve real passenger records.
    window.location.assign(craneSearchApi.getReservationUrl(valPnr.normalized, lastNameInput, 'en'));
  };

  const handleSelectPnr = (pnr: string, lastName: string) => {
    setPnrInput(pnr);
    setLastNameInput(lastName);
    setErrorMessage('');
    const found = findBooking(pnr, lastName);
    if (found) {
      setActiveBooking(found);
      setSelectedCheckInPax(found.passengers.map((p) => p.id));
      setCheckInSuccess(found.status === 'CHECKED_IN');
    }
  };

  const handleProcessCheckIn = () => {
    if (!activeBooking) return;
    if (selectedCheckInPax.length === 0) {
      setErrorMessage('Please select at least one passenger to check in');
      return;
    }
    if (!dangerousGoodsConfirmed) {
      setErrorMessage('Please acknowledge the IATA dangerous goods and baggage declaration');
      return;
    }

    const updated = checkInBooking(activeBooking.pnr, selectedCheckInPax, {});
    if (updated) {
      setActiveBooking({ ...updated });
      setCheckInSuccess(true);
      onBookingUpdated?.(updated);
    }
  };

  const handleProcessUpgrade = () => {
    if (!activeBooking) return;
    const upgradeFeeUSD = 280;
    const updated = upgradeCabinClass(activeBooking.pnr, 'business', upgradeFeeUSD);
    if (updated) {
      setActiveBooking({ ...updated });
      setUpgradeSuccess(true);
      onBookingUpdated?.(updated);
    }
  };

  const handleProcessCancellation = () => {
    if (!activeBooking) return;
    const refundCalc = calculateCancellationRefund(
      activeBooking.fareFamily,
      activeBooking.pricing.totalUSD,
      activeBooking.pricing.airportTaxesUSD
    );

    const updated = cancelBookingWithRefund(
      activeBooking.pnr,
      refundCalc.penaltyFeeUSD,
      refundCalc.refundAmountUSD
    );

    if (updated) {
      setActiveBooking({ ...updated });
      setCancelStep('confirmed');
      onBookingUpdated?.(updated);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Header Banner in #163784 */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#163784]">
              <span>RESERVATION MANAGEMENT</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
              Manage Booking, Web Check-In & Flight Modifications
            </h2>
            <p className="text-xs text-slate-500">
              Retrieve your active Air Zimbabwe reservation using your 6-character PNR code and ticketed last name.
            </p>
          </div>

          {/* Quick Active PNR References */}
          <div className="flex flex-wrap items-center gap-2 bg-slate-50 p-2.5 rounded-2xl border border-slate-200 text-xs">
            <span className="text-slate-500 font-semibold">Active Flights:</span>
            <button
              type="button"
              onClick={() => handleSelectPnr('UM7428', 'Moyo')}
              className="bg-blue-50 hover:bg-blue-100 text-[#163784] px-3 py-1 rounded-xl font-mono font-bold transition-colors cursor-pointer border border-blue-200"
            >
              UM7428 (Moyo - London B767)
            </button>
            <button
              type="button"
              onClick={() => handleSelectPnr('UM9134', 'Sibanda')}
              className="bg-slate-100 hover:bg-slate-200 text-slate-800 px-3 py-1 rounded-xl font-mono font-bold transition-colors cursor-pointer border border-slate-300"
            >
              UM9134 (Sibanda - Vic Falls ERJ)
            </button>
          </div>
        </div>

        {/* PNR Lookup Form */}
        <form onSubmit={handleSearchBooking} className="mt-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
            <div className="sm:col-span-4">
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Booking Reference (PNR) *
              </label>
              <input
                type="text"
                placeholder="e.g. UM7428 or any 6-char PNR"
                maxLength={6}
                value={pnrInput}
                onChange={(e) => setPnrInput(e.target.value.toUpperCase())}
                className="w-full px-3.5 py-3 bg-white border border-slate-300 rounded-xl text-sm font-mono font-black text-slate-900 uppercase focus:outline-none focus:ring-2 focus:ring-[#163784]"
                required
              />
            </div>

            <div className="sm:col-span-4">
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Passenger Last / Family Name *
              </label>
              <input
                type="text"
                placeholder="e.g. Moyo, Sibanda, or your surname"
                value={lastNameInput}
                onChange={(e) => setLastNameInput(e.target.value)}
                className="w-full px-3.5 py-3 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#163784]"
                required
              />
            </div>

            <div className="sm:col-span-4 flex gap-2">
              <button
                type="submit"
                className="flex-1 py-3 px-4 bg-[#163784] hover:bg-[#102b67] text-white font-bold text-sm rounded-xl shadow-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Search className="w-4 h-4 text-blue-300" />
                <span>Retrieve Booking</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!pnrInput.trim() || !lastNameInput.trim()) {
                    setErrorMessage('Please enter both your booking reference and surname');
                    return;
                  }
                  const url = craneSearchApi.getCheckinUrl(pnrInput, lastNameInput, 'en');
                  window.open(url, '_blank');
                }}
                title="Open online check-in"
                className="py-3 px-3.5 bg-slate-100 hover:bg-slate-200 text-[#163784] border border-slate-300 font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <Link2 className="w-3.5 h-3.5 text-[#163784]" />
                <span className="hidden sm:inline">Online check-in</span>
              </button>
            </div>
          </div>

        </form>

        {errorMessage && (
          <div className="mt-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-xl flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* Active Booking Detail View */}
      {activeBooking && (
        <div className="space-y-6">
          {/* Subtabs Navigation in #163784 */}
          <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
            <button
              type="button"
              onClick={() => setSubTab('tracking')}
              className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                subTab === 'tracking'
                  ? 'bg-[#163784] text-white shadow-md'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              1. Trip Itinerary & Tracking
            </button>

            <button
              type="button"
              onClick={() => setSubTab('checkin')}
              className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                subTab === 'checkin'
                  ? 'bg-[#163784] text-white shadow-md'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <span>2. Online Web Check-In</span>
              {activeBooking.status === 'CHECKED_IN' && (
                <span className="bg-blue-300 text-[#163784] text-[10px] px-2 py-0.5 rounded-full font-bold">
                  Checked In
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setSubTab('upgrade')}
              className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                subTab === 'upgrade'
                  ? 'bg-[#163784] text-white shadow-md'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-300" />
              <span>3. Cabin Upgrades & Ancillaries</span>
            </button>

            <button
              type="button"
              onClick={() => setSubTab('cancel')}
              className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-rose-700 border border-rose-200 hover:bg-rose-50 transition-all cursor-pointer ${
                subTab === 'cancel' ? 'bg-rose-600 text-white shadow-md' : 'bg-white'
              }`}
            >
              4. Fare Rules & Cancellation
            </button>
          </div>

          {/* Subtab 1: Trip Itinerary & Tracking */}
          {subTab === 'tracking' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <span className="text-xs font-mono font-bold text-[#163784]">PNR: {activeBooking.pnr}</span>
                  <h3 className="text-xl font-black text-slate-900">
                    Itinerary for {activeBooking.passengers[0]?.lastName},{' '}
                    {activeBooking.passengers[0]?.firstName}
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                      activeBooking.status === 'CANCELLED'
                        ? 'bg-rose-100 text-rose-800'
                        : activeBooking.status === 'CHECKED_IN'
                        ? 'bg-blue-100 text-blue-900'
                        : 'bg-slate-100 text-[#163784]'
                    }`}
                  >
                    {activeBooking.status}
                  </span>
                  <span className="text-xs bg-blue-50 text-[#163784] border border-blue-200 px-3 py-1 rounded-full font-semibold">
                    Cabin: {activeBooking.cabinClass.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Flight Cards */}
              <div className="space-y-4">
                {activeBooking.segments.map((seg, idx) => (
                  <div
                    key={seg.id}
                    className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3"
                  >
                    <div className="flex justify-between items-center text-xs font-bold text-[#163784]">
                      <span>
                        FLIGHT {seg.flightNumber} • AIRCRAFT {seg.aircraft.model} ("{seg.aircraft.name}")
                      </span>
                      <span className="text-slate-500 font-mono">Date: {seg.departureDate}</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                      <div className="md:col-span-4">
                        <div className="text-2xl font-black text-slate-900">{seg.departureTime}</div>
                        <div className="text-sm font-bold text-slate-800">
                          {seg.origin.city} ({seg.origin.code})
                        </div>
                        <div className="text-xs text-slate-400">{seg.origin.name}</div>
                      </div>

                      <div className="md:col-span-4 text-center">
                        <span className="text-xs text-slate-500">{seg.duration} Non-Stop</span>
                        <div className="w-28 h-0.5 bg-slate-300 mx-auto my-1 relative">
                          <div className="w-2 h-2 rounded-full bg-[#163784] absolute left-0 -top-0.5" />
                          <div className="w-2 h-2 rounded-full bg-blue-600 absolute right-0 -top-0.5" />
                        </div>
                        <span className="text-[10px] text-blue-700 font-bold">On Schedule</span>
                      </div>

                      <div className="md:col-span-4 md:text-right">
                        <div className="text-2xl font-black text-slate-900">{seg.arrivalTime}</div>
                        <div className="text-sm font-bold text-slate-800">
                          {seg.destination.city} ({seg.destination.code})
                        </div>
                        <div className="text-xs text-slate-400">{seg.destination.name}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Manifest summary */}
              <div className="border-t border-slate-100 pt-4">
                <h4 className="text-xs font-bold text-slate-700 uppercase mb-3">Ticketed Passengers</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {activeBooking.passengers.map((p) => (
                    <div
                      key={p.id}
                      className="p-3.5 rounded-xl bg-white border border-slate-200 text-xs space-y-1 shadow-2xs"
                    >
                      <div className="font-bold text-slate-900">
                        {p.title} {p.firstName} {p.lastName}
                      </div>
                      <div className="text-slate-500">
                        Passport: {p.passportNumber} ({p.nationality})
                      </div>
                      <div className="text-slate-600">
                        Seat: <strong className="text-[#163784]">{p.selectedSeats[activeBooking.segments[0]?.id || ''] || 'Assigned at Gate'}</strong>
                      </div>
                      {p.frequentFlyerNumber && (
                        <div className="text-blue-900 font-medium">Rainbow Club: {p.frequentFlyerNumber}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Subtab 2: Online Web Check-In */}
          {subTab === 'checkin' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2 text-xs font-bold uppercase text-[#163784]">
                  <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                  <span>Statutory Web Check-In Window Open (24 Hours to Departure)</span>
                </div>
                <h3 className="text-xl font-black text-slate-900 mt-1">
                  Air Zimbabwe Self-Service Check-In
                </h3>
                <p className="text-xs text-slate-500">
                  Select traveling passengers, confirm travel security declarations, and generate digital boarding passes.
                </p>
              </div>

              {!checkInSuccess ? (
                <div className="space-y-6">
                  {/* Passenger selector */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-700 uppercase">
                      Select Passengers for Check-In
                    </h4>
                    {activeBooking.passengers.map((p) => {
                      const isChecked = selectedCheckInPax.includes(p.id);

                      return (
                        <label
                          key={p.id}
                          className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedCheckInPax([...selectedCheckInPax, p.id]);
                              } else {
                                setSelectedCheckInPax(selectedCheckInPax.filter((id) => id !== p.id));
                              }
                            }}
                            className="w-4 h-4 text-[#163784] rounded accent-[#163784]"
                          />
                          <div className="text-xs">
                            <span className="font-bold text-slate-900">
                              {p.title} {p.firstName} {p.lastName}
                            </span>
                            <span className="text-slate-500 ml-2">
                              (Passport: {p.passportNumber} • Seat:{' '}
                              {p.selectedSeats[activeBooking.segments[0]?.id || ''] || '14A'})
                            </span>
                          </div>
                        </label>
                      );
                    })}
                  </div>

                  {/* Dangerous Goods Declaration */}
                  <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200 text-xs text-slate-700 space-y-3">
                    <div className="flex items-center gap-2 font-bold text-[#163784]">
                      <ShieldAlert className="w-4 h-4 text-blue-700" />
                      <span>ICAO / IATA Dangerous Goods & Security Declaration</span>
                    </div>
                    <p>
                      Passengers must declare that they are not carrying lithium batteries in checked baggage,
                      flammable gases, explosives, corrosive acids, or hazardous chemicals. Hand luggage must
                      comply with statutory liquid restrictions (max 100ml per container).
                    </p>
                    <label className="flex items-center gap-2 font-bold cursor-pointer pt-1 text-slate-900">
                      <input
                        type="checkbox"
                        checked={dangerousGoodsConfirmed}
                        onChange={(e) => setDangerousGoodsConfirmed(e.target.checked)}
                        className="w-4 h-4 text-[#163784] rounded accent-[#163784]"
                      />
                      <span>I confirm that no prohibited hazardous items are in my baggage.</span>
                    </label>
                  </div>

                  <button
                    type="button"
                    onClick={handleProcessCheckIn}
                    className="w-full sm:w-auto px-8 py-3 bg-[#163784] hover:bg-[#102b67] text-white font-bold text-sm rounded-xl shadow-md transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <CheckCircle className="w-4 h-4 text-blue-300" />
                    <span>Confirm Check-In & Issue Boarding Passes</span>
                  </button>
                </div>
              ) : (
                /* Boarding Passes Generated Screen */
                <div className="space-y-6">
                  <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 flex items-center gap-3">
                    <CheckCircle className="w-6 h-6 text-[#163784] shrink-0" />
                    <div>
                      <h4 className="text-sm font-bold text-[#163784]">Check-In Successful!</h4>
                      <p className="text-xs text-slate-600">
                        Digital boarding passes are ready. Present barcode at airport security and gate.
                      </p>
                    </div>
                  </div>

                  {/* Generated Boarding Passes */}
                  {activeBooking.checkInStatus?.boardingPasses.map((pass, pIdx) => {
                    const pax = activeBooking.passengers.find((p) => p.id === pass.passengerId) || activeBooking.passengers[0];
                    const seg = activeBooking.segments[0];

                    return (
                      <div
                        key={pIdx}
                        className="bg-white rounded-2xl border-2 border-slate-300 shadow-sm overflow-hidden"
                      >
                        <div className="bg-[#163784] px-4 py-3 text-white flex items-center justify-between">
                          <div className="font-serif font-black tracking-wider text-sm">
                            AIR ZIMBABWE • BOARDING PASS
                          </div>
                          <span className="text-xs font-mono font-bold text-blue-200">
                            {pass.boardingPassNumber}
                          </span>
                        </div>

                        <div className="p-5 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                          <div className="md:col-span-8 space-y-3">
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                              <div>
                                <span className="text-slate-400 font-bold block">PASSENGER</span>
                                <span className="font-black text-slate-900 text-sm">
                                  {pax.lastName}/{pax.firstName}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-400 font-bold block">FLIGHT</span>
                                <span className="font-mono font-black text-slate-900 text-sm">
                                  {seg.flightNumber}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-400 font-bold block">SEAT</span>
                                <span className="font-mono font-black text-[#163784] text-lg">
                                  {pass.seat}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-400 font-bold block">GATE</span>
                                <span className="font-bold text-slate-900">{pass.gate}</span>
                              </div>
                              <div>
                                <span className="text-slate-400 font-bold block">BOARDING</span>
                                <span className="font-bold text-blue-900">{pass.boardingTime}</span>
                              </div>
                              <div>
                                <span className="text-slate-400 font-bold block">ZONE</span>
                                <span className="font-bold text-slate-900">{pass.zone}</span>
                              </div>
                            </div>
                            <div className="text-[11px] text-slate-500">
                              Route: {seg.origin.city} ({seg.origin.code}) → {seg.destination.city} ({seg.destination.code}) • Date: {seg.departureDate}
                            </div>
                          </div>

                          <div className="md:col-span-4 border-t md:border-t-0 md:border-l border-dashed border-slate-300 md:pl-4 flex flex-col items-center justify-center text-center">
                            <QrCode className="w-20 h-20 text-slate-800" />
                            <span className="text-[9px] font-mono font-bold text-slate-400 mt-1">
                              {activeBooking.pnr} • {pass.seat}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Print Boarding Pass</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Subtab 3: Cabin Upgrades & Ancillaries */}
          {subTab === 'upgrade' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2 text-xs font-bold uppercase text-[#163784]">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  <span>Cabin Class Elevation & In-Flight Ancillaries</span>
                </div>
                <h3 className="text-xl font-black text-slate-900 mt-1">
                  Upgrade to Business Class
                </h3>
                <p className="text-xs text-slate-500">
                  Treat yourself to lie-flat seating, gourmet dining, priority boarding, and Dzimbahwe VIP lounge access.
                </p>
              </div>

              {activeBooking.cabinClass === 'business' ? (
                <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-xs text-slate-800 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-blue-600 shrink-0" />
                  <div>
                    <span className="font-bold">You are already traveling in Business Class!</span>
                    <p className="text-slate-600">
                      Your ticket includes full Dzimbahwe lounge access at Harare RGM Airport and 2x 32kg checked baggage.
                    </p>
                  </div>
                </div>
              ) : !upgradeSuccess ? (
                <div className="space-y-4">
                  <div className="p-6 rounded-2xl bg-[#163784] text-white space-y-3 border border-blue-900">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-blue-200">
                          Special Upgrade Offer
                        </span>
                        <h4 className="text-lg font-black">Elevate to Business Class</h4>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-blue-200">One-way upgrade</span>
                        <div className="text-xl font-black text-white">
                          {formatPrice(280, currency)}
                        </div>
                      </div>
                    </div>

                    <ul className="text-xs text-blue-100 space-y-1.5 pt-2 border-t border-white/10">
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-3.5 h-3.5 text-blue-300" />
                        <span>Executive Lie-Flat / Wide Recliner Seating</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-3.5 h-3.5 text-blue-300" />
                        <span>Harare Dzimbahwe VIP Executive Lounge Access</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-3.5 h-3.5 text-blue-300" />
                        <span>Extra Checked Baggage: 2 x 32kg pieces included</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-3.5 h-3.5 text-blue-300" />
                        <span>3-Course Fine Dining & Complimentary Beverages</span>
                      </li>
                    </ul>

                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={handleProcessUpgrade}
                        className="px-6 py-2.5 bg-white text-[#163784] hover:bg-blue-50 font-bold text-xs rounded-xl shadow-md transition-colors cursor-pointer"
                      >
                        Confirm Instant Cabin Upgrade ({formatPrice(280, currency)})
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-blue-600 shrink-0" />
                  <div>
                    <h4 className="text-sm font-bold text-[#163784]">Cabin Successfully Upgraded!</h4>
                    <p className="text-slate-600">
                      Your booking is now elevated to Business Class. Boarding zone updated to Zone 1 (Priority).
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Subtab 4: Fare Rules & Cancellation */}
          {subTab === 'cancel' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2 text-xs font-bold uppercase text-rose-700">
                  <ShieldAlert className="w-4 h-4" />
                  <span>Automated Fare Rules & Cancellation Portal</span>
                </div>
                <h3 className="text-xl font-black text-slate-900 mt-1">
                  Ticket Cancellation & Refund Calculation
                </h3>
                <p className="text-xs text-slate-500">
                  Transparent calculation of penalties and refundable balances adhering to IATA airline fare rules.
                </p>
              </div>

              {activeBooking.status === 'CANCELLED' ? (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 space-y-2">
                  <div className="font-bold text-sm">This booking has already been cancelled.</div>
                  <p>
                    Refund amount of{' '}
                    <strong>
                      {formatPrice(activeBooking.cancellation?.refundAmountUSD || 0, currency)}
                    </strong>{' '}
                    has been authorized and is processing back to original payment method (3-5 business days).
                  </p>
                </div>
              ) : cancelStep === 'review' ? (
                <div className="space-y-6">
                  {(() => {
                    const refundCalc = calculateCancellationRefund(
                      activeBooking.fareFamily,
                      activeBooking.pricing.totalUSD,
                      activeBooking.pricing.airportTaxesUSD
                    );

                    return (
                      <div className="space-y-4">
                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-slate-800 uppercase">
                              Ticket Fare Family:
                            </span>
                            <span className="font-bold text-[#163784] uppercase">
                              {activeBooking.fareFamily}
                            </span>
                          </div>

                          <div className="space-y-2 text-xs text-slate-600 border-t border-slate-200 pt-2">
                            <div className="flex justify-between">
                              <span>Total Amount Paid:</span>
                              <span className="font-bold text-slate-900">
                                {formatPrice(activeBooking.pricing.totalUSD, currency)}
                              </span>
                            </div>
                            <div className="flex justify-between text-rose-600">
                              <span>Airline Cancellation Penalty Fee:</span>
                              <span>-{formatPrice(refundCalc.penaltyFeeUSD, currency)}</span>
                            </div>
                            <div className="flex justify-between font-bold text-[#163784] pt-2 border-t border-slate-200 text-sm">
                              <span>Net Refundable Amount:</span>
                              <span>{formatPrice(refundCalc.refundAmountUSD, currency)}</span>
                            </div>
                          </div>

                          <p className="text-[11px] text-slate-500 italic pt-1">
                            {refundCalc.policyNote}
                          </p>
                        </div>

                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-slate-700">
                          <strong>Notice:</strong> Cancelling your reservation will release all confirmed seats and cancel the issued e-ticket. This action is immediate and non-reversible.
                        </div>

                        <button
                          type="button"
                          onClick={handleProcessCancellation}
                          className="px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors cursor-pointer"
                        >
                          Confirm Cancellation & Request Refund ({formatPrice(refundCalc.refundAmountUSD, currency)})
                        </button>
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-xs text-slate-800 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-sm text-[#163784]">
                    <CheckCircle className="w-5 h-5 text-blue-600" />
                    <span>Cancellation Request Processed Successfully</span>
                  </div>
                  <p>
                    Your refund of{' '}
                    <strong>
                      {formatPrice(activeBooking.cancellation?.refundAmountUSD || 0, currency)}
                    </strong>{' '}
                    has been submitted for settlement. The funds will be credited to the original payment method in 3-5 business days.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
