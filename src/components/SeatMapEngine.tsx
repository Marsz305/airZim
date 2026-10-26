/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Armchair,
  Check,
  Sparkles,
  Info,
  User,
  ArrowRight,
  Plane,
} from 'lucide-react';
import {
  AircraftSeat,
  CabinClass,
  Currency,
  FlightSegment,
  PassengerDetails,
} from '../types/ibe';
import { formatPrice } from '../utils/pricing';

interface SeatMapEngineProps {
  segment: FlightSegment;
  cabinClass: CabinClass;
  passengers: PassengerDetails[];
  selectedSeats: Record<string, string>;
  onSelectSeat: (passengerId: string, seatId: string) => void;
  currency: Currency;
  onProceedToPayment: () => void;
  onBack: () => void;
}

export const SeatMapEngine: React.FC<SeatMapEngineProps> = ({
  segment,
  cabinClass,
  passengers,
  selectedSeats,
  onSelectSeat,
  currency,
  onProceedToPayment,
  onBack,
}) => {
  const [activePassengerId, setActivePassengerId] = useState<string>(passengers[0]?.id || '');
  const [hoveredSeat, setHoveredSeat] = useState<AircraftSeat | null>(null);

  const aircraft = segment.aircraft;
  const seatMap = segment.seatMap;
  const isBusiness = cabinClass === 'business';

  const totalSeatFeeUSD = Object.entries(selectedSeats).reduce((acc, [_, sId]) => {
    const s = seatMap.find((item) => item.id === sId);
    return acc + (s?.extraPriceUSD || 0);
  }, 0);

  const rowsMap = new Map<number, AircraftSeat[]>();
  seatMap.forEach((seat) => {
    if (isBusiness && seat.cabin !== 'business') return;
    if (!isBusiness && seat.cabin === 'business') return;

    if (!rowsMap.has(seat.row)) {
      rowsMap.set(seat.row, []);
    }
    rowsMap.get(seat.row)!.push(seat);
  });

  const sortedRows = Array.from(rowsMap.keys()).sort((a, b) => a - b);
  const activePassenger = passengers.find((p) => p.id === activePassengerId) || passengers[0];

  const handleSeatClick = (seat: AircraftSeat) => {
    if (seat.status === 'occupied') return;
    onSelectSeat(activePassenger.id, seat.id);

    const nextUnassigned = passengers.find(
      (p) => p.id !== activePassenger.id && !selectedSeats[p.id]
    );
    if (nextUnassigned) {
      setActivePassengerId(nextUnassigned.id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#163784]">
            <span>Interactive Aircraft Cabin Map</span>
            <span>•</span>
            <span>{aircraft.model}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-1 flex items-center gap-2">
            <span>Seat Selection: {aircraft.name}</span>
            <span className="text-xs bg-blue-100 text-[#163784] font-mono px-2 py-0.5 rounded font-bold">
              {aircraft.tailNumber}
            </span>
          </h2>
          <p className="text-xs text-slate-500">
            Select a passenger tab below, then click any available seat in the cabin diagram.
          </p>
        </div>

        {totalSeatFeeUSD > 0 && (
          <div className="bg-blue-50 border border-blue-200 px-4 py-2 rounded-xl text-right">
            <span className="text-xs text-[#163784] font-medium">Preferred Seats Surcharge:</span>
            <div className="text-lg font-black text-[#163784]">
              +{formatPrice(totalSeatFeeUSD, currency)}
            </div>
          </div>
        )}
      </div>

      {/* Passenger Selector Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
          Assign Seat For:
        </span>
        <div className="flex flex-wrap gap-2">
          {passengers.map((p, idx) => {
            const isCurrent = p.id === activePassenger.id;
            const chosenSeat = selectedSeats[p.id];

            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setActivePassengerId(p.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                  isCurrent
                    ? 'bg-[#163784] text-white shadow-sm'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>
                  {p.firstName ? `${p.firstName} ${p.lastName}` : `Passenger ${idx + 1}`}
                </span>
                {chosenSeat ? (
                  <span className="bg-white text-[#163784] font-mono text-[11px] px-2 py-0.5 rounded font-black border border-blue-200">
                    {chosenSeat}
                  </span>
                ) : (
                  <span className="text-slate-400 text-[10px] italic">Not selected</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Legend & Aircraft Fuselage Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Seat Legend & Detail Inspector */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Info className="w-4 h-4 text-[#163784]" />
              <span>Seat Status Legend</span>
            </h3>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-200">
                <div className="w-5 h-5 rounded-lg bg-white border-2 border-blue-600 flex items-center justify-center" />
                <span>Available</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-200">
                <div className="w-5 h-5 rounded-lg bg-[#163784] text-white flex items-center justify-center font-bold text-[10px]">
                  ✓
                </div>
                <span>Selected</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-200">
                <div className="w-5 h-5 rounded-lg bg-slate-200 border border-slate-300 text-slate-400 flex items-center justify-center text-[10px]">
                  ✕
                </div>
                <span className="text-slate-400">Occupied</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-200">
                <div className="w-5 h-5 rounded-lg bg-blue-100 border-2 border-blue-500" />
                <span>Extra Legroom</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-200">
                <div className="w-5 h-5 rounded-lg bg-indigo-100 border-2 border-indigo-500" />
                <span>Exit Row</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-200">
                <div className="w-5 h-5 rounded-lg bg-sky-100 border-2 border-sky-400" />
                <span>Bassinet Seat</span>
              </div>
            </div>
          </div>

          {/* Hovered or Active Seat Details Card */}
          <div className="bg-[#163784] text-white p-6 rounded-2xl shadow-md space-y-3 border border-blue-900">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-bold text-blue-200">Seat Details</span>
              <Armchair className="w-5 h-5 text-blue-300" />
            </div>

            {hoveredSeat ? (
              <div className="space-y-2">
                <div className="text-3xl font-black text-white font-mono">
                  Seat {hoveredSeat.id}
                </div>
                <p className="text-xs text-blue-100 capitalize">
                  {hoveredSeat.cabin} Class • {hoveredSeat.type.replace('_', ' ')}
                </p>
                <div className="text-sm font-semibold text-blue-200">
                  {hoveredSeat.extraPriceUSD === 0 ? (
                    <span className="text-white">Included in fare ($0 USD)</span>
                  ) : (
                    <span className="text-blue-200">
                      +{formatPrice(hoveredSeat.extraPriceUSD, currency)} Preferred Upgrade
                    </span>
                  )}
                </div>
                {hoveredSeat.type === 'exit_row' && (
                  <p className="text-[11px] text-blue-100/80 italic">
                    Note: Exit row occupants must be 15+ years and able to assist in emergency procedures.
                  </p>
                )}
              </div>
            ) : (
              <div className="text-xs text-blue-200 py-4 italic">
                Hover or tap on any cabin seat to view pitch, legroom perks, and upgrade fee details.
              </div>
            )}
          </div>
        </div>

        {/* Visual Aircraft Cabin Layout */}
        <div className="lg:col-span-8 flex justify-center">
          <div className="w-full max-w-xl bg-slate-50 rounded-3xl p-6 sm:p-8 border border-slate-300 shadow-inner relative">
            <div className="w-24 h-16 mx-auto bg-slate-200 rounded-t-full border-t-2 border-x-2 border-slate-300 mb-6 flex flex-col items-center justify-center relative">
              <Plane className="w-6 h-6 text-[#163784] mb-1" />
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-600">
                Cockpit
              </span>
            </div>

            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-slate-400 border-b border-dashed border-slate-300 pb-2 mb-4">
              <span>◄ Emergency Exit L1</span>
              <span>Front Galley</span>
              <span>Emergency Exit R1 ►</span>
            </div>

            <div className="space-y-2.5 max-h-[560px] overflow-y-auto px-2 py-4">
              {sortedRows.map((rowNum) => {
                const rowSeats = rowsMap.get(rowNum) || [];
                const isExitRow = aircraft.exitRows.includes(rowNum);

                return (
                  <div key={rowNum} className="space-y-1">
                    {isExitRow && (
                      <div className="flex items-center justify-between text-[10px] font-bold text-indigo-700 py-1 bg-indigo-50 px-2 rounded-lg">
                        <span>EXIT ROW</span>
                        <span>EXTRA LEGROOM</span>
                        <span>EXIT ROW</span>
                      </div>
                    )}

                    <div className="flex items-center justify-center gap-2">
                      <span className="w-6 text-center text-xs font-mono font-bold text-slate-400">
                        {rowNum}
                      </span>

                      <div className="flex items-center gap-1.5 sm:gap-2">
                        {rowSeats.map((seat) => {
                          const isAssignedToAny = Object.values(selectedSeats).includes(seat.id);
                          const isAssignedToActive = selectedSeats[activePassenger.id] === seat.id;
                          const isOccupied = seat.status === 'occupied';

                          const isAisleGapAfter =
                            (aircraft.model === 'Boeing 767-200ER' &&
                              (seat.col === 'B' || seat.col === 'E')) ||
                            (aircraft.model === 'Embraer ERJ-145' && seat.col === 'A');

                          let seatColor = 'bg-white border-slate-300 text-slate-800 hover:border-[#163784]';
                          if (isOccupied) {
                            seatColor = 'bg-slate-200 border-slate-300 text-slate-400 cursor-not-allowed opacity-60';
                          } else if (isAssignedToActive) {
                            seatColor = 'bg-[#163784] border-[#163784] text-white shadow-md scale-105';
                          } else if (isAssignedToAny) {
                            seatColor = 'bg-blue-600 border-blue-700 text-white';
                          } else if (seat.type === 'exit_row') {
                            seatColor = 'bg-indigo-50 border-indigo-400 text-indigo-900 hover:bg-indigo-100';
                          } else if (seat.type === 'extra_legroom') {
                            seatColor = 'bg-blue-50 border-blue-400 text-blue-900 hover:bg-blue-100';
                          } else if (seat.type === 'bassinet') {
                            seatColor = 'bg-sky-50 border-sky-400 text-sky-900 hover:bg-sky-100';
                          }

                          return (
                            <React.Fragment key={seat.id}>
                              <button
                                type="button"
                                disabled={isOccupied}
                                aria-label={`Seat ${seat.id} - ${seat.type} - ${isOccupied ? 'Occupied' : 'Available'}`}
                                onClick={() => handleSeatClick(seat)}
                                onMouseEnter={() => setHoveredSeat(seat)}
                                className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl border-2 font-mono text-xs font-bold flex flex-col items-center justify-center transition-transform relative cursor-pointer ${seatColor}`}
                              >
                                <span>{seat.col}</span>
                                {isAssignedToActive && (
                                  <Check className="w-3 h-3 text-white absolute -top-1 -right-1 bg-[#163784] rounded-full border border-white" />
                                )}
                              </button>

                              {isAisleGapAfter && (
                                <div className="w-3 sm:w-6 flex items-center justify-center text-[10px] text-slate-300">
                                  |
                                </div>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </div>

                      <span className="w-6 text-center text-xs font-mono font-bold text-slate-400">
                        {rowNum}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-slate-400 border-t border-dashed border-slate-300 pt-3 mt-6">
              <span>Lavatory ◄</span>
              <span>Rear Galley</span>
              <span>► Lavatory</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Footer */}
      <div className="flex items-center justify-between pt-4">
        <button
          type="button"
          onClick={onBack}
          className="px-6 py-3 rounded-xl border border-slate-300 text-slate-700 font-bold text-sm hover:bg-slate-100 transition-colors cursor-pointer"
        >
          Back to Passenger Manifest
        </button>

        <button
          type="button"
          onClick={onProceedToPayment}
          className="px-8 py-3.5 bg-[#163784] hover:bg-[#102b67] text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all text-sm sm:text-base flex items-center gap-2 cursor-pointer"
        >
          <span>Continue to Secure Payment</span>
          <ArrowRight className="w-4 h-4 text-blue-300" />
        </button>
      </div>
    </div>
  );
};
