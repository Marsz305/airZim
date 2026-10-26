/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  PlaneTakeoff,
  PlaneLanding,
  Users,
  Search,
  ArrowRightLeft,
  Plus,
  Trash2,
  Tag,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { Airport, CabinClass, PassengerCount, SearchCriteria, TripType } from '../types/ibe';
import { AIRPORTS } from '../services/ibeApi';
import { AvailabilityRequest, PassengerQuantity, craneSearchApi, formatToHititDate } from '../services/craneApi';
import { validatePromoCode } from '../utils/pricing';
import { AirZimDatePicker } from './AirZimDatePicker';

const ROUTES: Record<string, string[]> = {
  HRE: ['DAR', 'JNB', 'BUQ', 'UTA', 'VFA', 'LGW', 'MVZ'],
  UTA: ['HRE'],
  VFA: ['HRE', 'BUQ', 'MVZ'],
  BUQ: ['HRE', 'VFA'],
  DAR: ['HRE'],
  LGW: ['HRE'],
  JNB: ['HRE'],
  MVZ: ['HRE', 'VFA'],
  LUN: ['HRE'],
};

interface FlightSearchEngineProps {
  onSearch: (criteria: SearchCriteria) => void;
  initialCriteria?: SearchCriteria;
}

export const FlightSearchEngine: React.FC<FlightSearchEngineProps> = ({
  onSearch,
  initialCriteria,
}) => {
  const [tripType, setTripType] = useState<TripType>(initialCriteria?.tripType || 'round-trip');
  // A destination stays hidden until the traveller explicitly chooses a departure airport.
  const [originChosen, setOriginChosen] = useState<boolean[]>(initialCriteria?.segments?.map((segment) => Boolean(segment.origin?.code)) || [false]);

  // Segments for one-way / round-trip / multi-city
  const [segments, setSegments] = useState<{ origin: Airport; destination: Airport; departureDate: string }[]>(
    initialCriteria?.segments || [
      {
        origin: AIRPORTS[0], // HRE
        destination: AIRPORTS[1], // VFA
        departureDate: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
      },
    ]
  );

  const [returnDate, setReturnDate] = useState<string>(
    initialCriteria?.returnDate || new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0]
  );

  const [passengers, setPassengers] = useState<PassengerCount>(
    initialCriteria?.passengers || { adults: 1, children: 0, infants: 0 }
  );
  const [showPassengerDropdown, setShowPassengerDropdown] = useState(false);

  const [cabinClass, setCabinClass] = useState<CabinClass>(initialCriteria?.cabinClass || 'economy');
  const [promoCodeInput, setPromoCodeInput] = useState<string>(initialCriteria?.promoCode || '');
  const [promoStatus, setPromoStatus] = useState<{ checked: boolean; valid: boolean; message?: string }>({
    checked: false,
    valid: false,
  });

  // Handle passenger counter changes
  const updatePassengerCount = (type: keyof PassengerCount, delta: number) => {
    setPassengers((prev) => {
      const updated = { ...prev };
      const total = prev.adults + prev.children + prev.infants;
      if (type === 'adults') {
        updated.adults = Math.max(1, Math.min(9 - prev.children - prev.infants, prev.adults + delta));
        if (updated.infants > updated.adults) updated.infants = updated.adults;
      } else if (type === 'children') {
        updated.children = Math.max(0, Math.min(9 - prev.adults - prev.infants, prev.children + delta));
      } else if (type === 'infants') {
        updated.infants = Math.max(0, Math.min(Math.min(prev.adults, 9 - prev.adults - prev.children), prev.infants + delta));
      }
      // Keep the total at nine or fewer even if a future control changes these values.
      if (updated.adults + updated.children + updated.infants > 9) {
        if (type === 'children') updated.children = Math.max(0, 9 - updated.adults - updated.infants);
        if (type === 'infants') updated.infants = Math.max(0, 9 - updated.adults - updated.children);
      }
      return updated;
    });
  };

  const arrivalOptions = (originCode: string) => {
    const allowedCodes = ROUTES[originCode] || [];
    return AIRPORTS.filter((airport) => allowedCodes.includes(airport.code));
  };

  const changeSegmentAirport = (index: number, field: 'origin' | 'destination', code: string) => {
    const chosen = AIRPORTS.find((airport) => airport.code === code);
    if (!chosen) return;
    if (field === 'origin') setOriginChosen((prev) => prev.map((chosen, i) => i === index ? true : chosen));
    setSegments((prev) => prev.map((segment, i) => {
      if (i !== index) return segment;
      if (field === 'origin') {
        const allowed = arrivalOptions(chosen.code);
        const destinationStillValid = allowed.some((airport) => airport.code === segment.destination.code);
        return { ...segment, origin: chosen, destination: destinationStillValid ? segment.destination : (allowed[0] || segment.destination) };
      }
      return { ...segment, destination: chosen };
    }));
  };

  const handleSwapAirports = (index: number) => {
    if (!originChosen[index]) return;
    setSegments((prev) => {
      const next = [...prev];
      const cur = next[index];
      next[index] = { ...cur, origin: cur.destination, destination: cur.origin };
      return next;
    });
  };

  const handleAddSegment = () => {
    if (segments.length >= 4) return;
    const lastDest = segments[segments.length - 1].destination;
    const nextDest = arrivalOptions(lastDest.code)[0] || AIRPORTS.find((a) => a.code === 'HRE') || AIRPORTS[0];
    const nextDate = new Date(Date.now() + 86400000 * (4 + segments.length * 3))
      .toISOString()
      .split('T')[0];

    setSegments([...segments, { origin: lastDest, destination: nextDest, departureDate: nextDate }]);
    setOriginChosen((prev) => [...prev, Boolean(prev[prev.length - 1])]);
  };

  const handleRemoveSegment = (index: number) => {
    if (segments.length <= 1) return;
    setSegments(segments.filter((_, idx) => idx !== index));
    setOriginChosen((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleValidatePromo = () => {
    if (!promoCodeInput.trim()) {
      setPromoStatus({ checked: false, valid: false });
      return;
    }
    const res = validatePromoCode(promoCodeInput, 200);
    if (res.isValid && res.promo) {
      setPromoStatus({
        checked: true,
        valid: true,
        message: `${res.promo.description}`,
      });
    } else {
      setPromoStatus({
        checked: true,
        valid: false,
        message: res.error || 'Invalid promo code. Try AIRZIM2026 or FLYHARARE',
      });
    }
  };

  const totalPassengers = passengers.adults + passengers.children + passengers.infants;

  const handleSubmitSearch = (e: React.FormEvent) => {
    e.preventDefault();

    if (totalPassengers > 9) {
      window.alert('A maximum of 9 passengers can be booked at one time.');
      return;
    }
    if (segments.some((segment, index) => !originChosen[index] || !segment.origin.code || !segment.destination.code || segment.origin.code === segment.destination.code || !arrivalOptions(segment.origin.code).some((airport) => airport.code === segment.destination.code))) {
      window.alert('Please choose a valid departure and arrival airport for every flight.');
      return;
    }
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const departure = new Date(`${segments[0].departureDate}T00:00:00`);
    if (!segments[0].departureDate || Number.isNaN(departure.getTime()) || departure < today) {
      window.alert('Departure date cannot be in the past. Please select a valid departure date.');
      return;
    }
    if (tripType === 'round-trip') {
      const returning = new Date(`${returnDate}T00:00:00`);
      if (!returnDate || Number.isNaN(returning.getTime()) || returning <= departure) {
        window.alert('Return date must be after the departure date.');
        return;
      }
    }
    if (tripType === 'multi-city' && segments.some((segment) => !segment.departureDate || new Date(`${segment.departureDate}T00:00:00`) < today)) {
      window.alert('Each multi-city departure date must be today or a future date.');
      return;
    }

    let finalSegments = [...segments];
    if (tripType === 'round-trip') {
      finalSegments = [
        segments[0],
        {
          origin: segments[0].destination,
          destination: segments[0].origin,
          departureDate: returnDate,
        },
      ];
    } else if (tripType === 'one-way') {
      finalSegments = [segments[0]];
    }

    const liveTripType = tripType === 'round-trip' ? 'ROUND_TRIP' : tripType === 'multi-city' ? 'MULTI_DIRECTIONAL' : 'ONE_WAY';
    const request = new AvailabilityRequest(
      liveTripType,
      (tripType === 'multi-city' ? finalSegments.map((segment) => segment.origin.code) : [finalSegments[0].origin.code]).join(','),
      (tripType === 'multi-city' ? finalSegments.map((segment) => segment.destination.code) : [finalSegments[0].destination.code]).join(','),
      (tripType === 'multi-city' ? finalSegments.map((segment) => formatToHititDate(segment.departureDate)) : [formatToHititDate(finalSegments[0].departureDate)]).join(','),
      tripType === 'round-trip' ? formatToHititDate(returnDate) : undefined,
      [
        new PassengerQuantity('ADLT', undefined, passengers.adults),
        new PassengerQuantity('CHLD', undefined, passengers.children),
        new PassengerQuantity('INFT', undefined, passengers.infants),
      ],
      'USD',
      cabinClass.toUpperCase(),
      'en',
      undefined,
      promoStatus.valid ? promoCodeInput.trim().toUpperCase() : undefined,
      undefined, undefined, undefined, true, false
    );

    // The booking engine owns live inventory, fare rules and ticketing. Send the validated
    // search to the airline's configured Crane booking endpoint rather than showing mock fares.
    const searchUrl = craneSearchApi.searchV2(request);
    window.location.assign(searchUrl);
  };

  return (
    <div className="az-flight-search-card relative">
      <form onSubmit={handleSubmitSearch} className="p-4 sm:p-5 space-y-4">
        {/* Controls Bar: Trip Type & Cabin Class */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
          {/* Trip Type Selector */}
          <div className="inline-flex p-1 bg-slate-100 rounded-xl" role="tablist">
            {(['round-trip', 'one-way', 'multi-city'] as TripType[]).map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={tripType === t}
                onClick={() => setTripType(t)}
                className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-bold capitalize transition-all cursor-pointer ${
                  tripType === t
                    ? 'bg-[#163784] text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t === 'round-trip' ? 'Round Trip' : t === 'one-way' ? 'One Way' : 'Multi-City'}
              </button>
            ))}
          </div>

          {/* Cabin Class Selector */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cabin:</span>
            <div className="inline-flex p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => setCabinClass('economy')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  cabinClass === 'economy'
                    ? 'bg-[#163784] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Economy Class
              </button>
              <button
                type="button"
                onClick={() => setCabinClass('business')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  cabinClass === 'business'
                    ? 'bg-[#163784] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-300" />
                <span>Business Class</span>
              </button>
            </div>
          </div>
        </div>

        {/* Dynamic Route Segments */}
        <div className="space-y-4">
          {tripType === 'multi-city' ? (
            /* Multi-City Segment List */
            <div className="space-y-4">
              {segments.map((seg, idx) => (
                <div
                  key={idx}
                  className="p-5 rounded-2xl border border-slate-200 bg-slate-50/60 flex flex-col md:flex-row items-stretch md:items-end gap-3 relative"
                >
                  <span className="absolute -top-2.5 left-4 bg-[#163784] text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase">
                    Flight {idx + 1}
                  </span>

                  {/* Origin */}
                  <div className="flex-1">
                    <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                      From (Origin)
                    </label>
                    <div className="relative">
                      <PlaneTakeoff className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#163784]" />
                      <select
                        aria-label={`Segment ${idx + 1} Origin Airport`}
                        value={originChosen[idx] ? seg.origin.code : ''}
                        onChange={(e) => {
                          changeSegmentAirport(idx, 'origin', e.target.value);
                        }}
                        className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#163784]"
                      >
                        <option value="">Select departure airport</option>
                        {AIRPORTS.map((air) => (
                          <option key={air.code} value={air.code}>
                            {air.city} ({air.code})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Destination */}
                  <div className="flex-1">
                    <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                      To (Destination)
                    </label>
                    <div className="relative">
                      <PlaneLanding className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#163784]" />
                      <select
                        aria-label={`Segment ${idx + 1} Destination Airport`}
                        value={originChosen[idx] ? seg.destination.code : ''}
                        disabled={!originChosen[idx]}
                        onChange={(e) => {
                          changeSegmentAirport(idx, 'destination', e.target.value);
                        }}
                        className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#163784] disabled:bg-slate-100 disabled:text-slate-400"
                      >
                        <option value="">{originChosen[idx] ? 'Select arrival airport' : 'Select departure first'}</option>
                        {originChosen[idx] && arrivalOptions(seg.origin.code).map((air) => (
                          <option key={air.code} value={air.code}>
                            {air.city} ({air.code})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Date Picker showing available flight dates in blue */}
                  <div className="w-full md:w-56">
                    <AirZimDatePicker
                      label="Departure Date"
                      selectedDate={seg.departureDate}
                      minDate={new Date().toISOString().split('T')[0]}
                      originCode={seg.origin.code}
                      destinationCode={seg.destination.code}
                      onSelectDate={(newDate) => {
                        const next = [...segments];
                        next[idx].departureDate = newDate;
                        setSegments(next);
                      }}
                    />
                  </div>

                  {segments.length > 1 && (
                    <button
                      type="button"
                      aria-label={`Remove segment ${idx + 1}`}
                      onClick={() => handleRemoveSegment(idx)}
                      className="p-3 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              ))}

              {segments.length < 4 && (
                <button
                  type="button"
                  onClick={handleAddSegment}
                  className="inline-flex items-center gap-2 text-xs font-bold text-[#163784] hover:text-blue-900 bg-blue-50/70 hover:bg-blue-100 px-4 py-2.5 rounded-xl border border-blue-200 transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Another Flight (+ Segment)</span>
                </button>
              )}
            </div>
          ) : (
            /* Standard One-Way & Round-Trip Layout */
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                {/* Origin Airport */}
                <div className="md:col-span-5 relative">
                  <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                    Origin (Departure City)
                  </label>
                  <div className="relative">
                    <PlaneTakeoff className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#163784]" />
                    <select
                      aria-label="Departure Airport"
                      value={originChosen[0] ? segments[0].origin.code : ''}
                      onChange={(e) => {
                        changeSegmentAirport(0, 'origin', e.target.value);
                      }}
                      className="w-full pl-9 pr-3 py-3 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#163784]"
                    >
                      <option value="">Select departure airport</option>
                      {AIRPORTS.map((air) => (
                        <option key={air.code} value={air.code}>
                          {air.city} ({air.code})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Swap Button */}
                <div className="md:col-span-2 flex justify-center pt-2 md:pt-4">
                  <button
                    type="button"
                    aria-label="Swap departure and arrival airports"
                    onClick={() => handleSwapAirports(0)}
                    disabled={!originChosen[0]}
                    className="p-2.5 rounded-full bg-slate-100 hover:bg-blue-100 text-[#163784] border border-slate-200 transition-colors shadow-xs cursor-pointer"
                  >
                    <ArrowRightLeft className="w-4 h-4" />
                  </button>
                </div>

                {/* Destination Airport */}
                <div className="md:col-span-5 relative">
                  <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                    Destination (Arrival City)
                  </label>
                  <div className="relative">
                    <PlaneLanding className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#163784]" />
                    <select
                      aria-label="Arrival Airport"
                      value={originChosen[0] ? segments[0].destination.code : ''}
                      disabled={!originChosen[0]}
                      onChange={(e) => {
                        changeSegmentAirport(0, 'destination', e.target.value);
                      }}
                      className="w-full pl-9 pr-3 py-3 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#163784] disabled:bg-slate-100 disabled:text-slate-400"
                    >
                      <option value="">{originChosen[0] ? 'Select arrival airport' : 'Select departure first'}</option>
                      {originChosen[0] && arrivalOptions(segments[0].origin.code).map((air) => (
                        <option key={air.code} value={air.code}>
                          {air.city} ({air.code})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Dates & Passengers Row with Blue Available Dates Calendar */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-1">
                {/* Departure Date Picker (Highlights scheduled flight days in blue) */}
                <div className={tripType === 'round-trip' ? 'md:col-span-4' : 'md:col-span-6'}>
                  <AirZimDatePicker
                    label="Departure Date (Blue = Flight Operating)"
                    selectedDate={segments[0].departureDate}
                    minDate={new Date().toISOString().split('T')[0]}
                    originCode={segments[0].origin.code}
                    destinationCode={segments[0].destination.code}
                    onSelectDate={(newDate) => {
                      const next = [...segments];
                      next[0].departureDate = newDate;
                      setSegments(next);
                      if (new Date(newDate) > new Date(returnDate)) {
                        setReturnDate(newDate);
                      }
                    }}
                  />
                </div>

                {/* Return Date Picker (if Round-Trip) */}
                {tripType === 'round-trip' && (
                  <div className="md:col-span-4">
                    <AirZimDatePicker
                      label="Return Date (Blue = Flight Operating)"
                      selectedDate={returnDate}
                      minDate={(() => { const d = new Date(`${segments[0].departureDate}T00:00:00`); d.setDate(d.getDate() + 1); return d.toISOString().split('T')[0]; })()}
                      originCode={segments[0].destination.code}
                      destinationCode={segments[0].origin.code}
                      onSelectDate={(newDate) => setReturnDate(newDate)}
                    />
                  </div>
                )}

                {/* Passenger Selector Dropdown Trigger */}
                <div className={tripType === 'round-trip' ? 'md:col-span-4 relative' : 'md:col-span-6 relative'}>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                    Passengers
                  </label>
                  <button
                    type="button"
                    aria-expanded={showPassengerDropdown}
                    onClick={() => setShowPassengerDropdown(!showPassengerDropdown)}
                    className="w-full pl-9 pr-3 py-3 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-900 text-left flex items-center justify-between hover:border-[#163784] transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <span>
                        {totalPassengers} Passenger{totalPassengers > 1 ? 's' : ''}
                      </span>
                    </div>
                    <span className="text-xs text-slate-500 font-normal">
                      {passengers.adults}A {passengers.children > 0 && `• ${passengers.children}C`}{' '}
                      {passengers.infants > 0 && `• ${passengers.infants}Inf`}
                    </span>
                  </button>

                  {/* Passenger Configuration Popover */}
                  {showPassengerDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 z-30 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                          Passenger Composition
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowPassengerDropdown(false)}
                          className="text-xs text-[#163784] font-bold hover:underline cursor-pointer"
                        >
                          Done
                        </button>
                      </div>

                      {/* Adults */}
                      <div className="flex items-center justify-between py-2 border-b border-slate-100">
                        <div>
                          <div className="text-sm font-bold text-slate-900">Adults</div>
                          <div className="text-xs text-slate-500">Age 12+ years (Full fare)</div>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            aria-label="Decrease adults count"
                            disabled={passengers.adults <= 1}
                            onClick={() => updatePassengerCount('adults', -1)}
                            className="w-8 h-8 rounded-full border border-slate-300 flex items-center justify-center font-bold text-slate-600 disabled:opacity-30 hover:bg-slate-100"
                          >
                            -
                          </button>
                          <span className="w-5 text-center font-bold text-slate-900">{passengers.adults}</span>
                          <button
                            type="button"
                            aria-label="Increase adults count"
                            disabled={passengers.adults >= 9}
                            onClick={() => updatePassengerCount('adults', 1)}
                            className="w-8 h-8 rounded-full border border-slate-300 flex items-center justify-center font-bold text-slate-600 disabled:opacity-30 hover:bg-slate-100"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* Children */}
                      <div className="flex items-center justify-between py-2 border-b border-slate-100">
                        <div>
                          <div className="text-sm font-bold text-slate-900">Children</div>
                          <div className="text-xs text-slate-500">Age 2-11 years (25% off)</div>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            aria-label="Decrease children count"
                            disabled={passengers.children <= 0}
                            onClick={() => updatePassengerCount('children', -1)}
                            className="w-8 h-8 rounded-full border border-slate-300 flex items-center justify-center font-bold text-slate-600 disabled:opacity-30 hover:bg-slate-100"
                          >
                            -
                          </button>
                          <span className="w-5 text-center font-bold text-slate-900">{passengers.children}</span>
                          <button
                            type="button"
                            aria-label="Increase children count"
                            disabled={passengers.children >= 8}
                            onClick={() => updatePassengerCount('children', 1)}
                            className="w-8 h-8 rounded-full border border-slate-300 flex items-center justify-center font-bold text-slate-600 disabled:opacity-30 hover:bg-slate-100"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* Infants */}
                      <div className="flex items-center justify-between py-2">
                        <div>
                          <div className="text-sm font-bold text-slate-900">Infants</div>
                          <div className="text-xs text-slate-500">Under 2 years (Lap infant, 90% off)</div>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            aria-label="Decrease infants count"
                            disabled={passengers.infants <= 0}
                            onClick={() => updatePassengerCount('infants', -1)}
                            className="w-8 h-8 rounded-full border border-slate-300 flex items-center justify-center font-bold text-slate-600 disabled:opacity-30 hover:bg-slate-100"
                          >
                            -
                          </button>
                          <span className="w-5 text-center font-bold text-slate-900">{passengers.infants}</span>
                          <button
                            type="button"
                            aria-label="Increase infants count"
                            disabled={passengers.infants >= passengers.adults}
                            onClick={() => updatePassengerCount('infants', 1)}
                            className="w-8 h-8 rounded-full border border-slate-300 flex items-center justify-center font-bold text-slate-600 disabled:opacity-30 hover:bg-slate-100"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Promotional Code & Action Bar */}
        <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-t border-slate-100">
          {/* Promo code field */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Promo Code (e.g. AIRZIM2026)"
                value={promoCodeInput}
                onChange={(e) => {
                  setPromoCodeInput(e.target.value);
                  setPromoStatus({ checked: false, valid: false });
                }}
                className="pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold uppercase tracking-wider text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#163784] w-48 sm:w-56"
              />
            </div>
            <button
              type="button"
              onClick={handleValidatePromo}
              className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-[#163784] rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Apply
            </button>

            {promoStatus.checked && (
              <div
                className={`flex items-center gap-1 text-xs font-medium ${
                  promoStatus.valid ? 'text-blue-700' : 'text-rose-600'
                }`}
              >
                {promoStatus.valid ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                <span className="truncate max-w-[200px]">{promoStatus.message}</span>
              </div>
            )}
          </div>

          {/* Search Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="submit"
              className="px-7 py-3 bg-[#163784] hover:bg-[#102b67] text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 text-sm cursor-pointer"
            >
              <Search className="w-5 h-5 text-blue-300" />
              <span>Search flights</span>
            </button>
          </div>
        </div>

      </form>
    </div>
  );
};
