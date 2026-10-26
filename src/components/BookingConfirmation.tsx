/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  CheckCircle,
  Plane,
  Printer,
  QrCode,
} from 'lucide-react';
import { BookingRecord, Currency } from '../types/ibe';

interface BookingConfirmationProps {
  booking: BookingRecord;
  currency: Currency;
  onGoToManageBooking: (pnr: string, lastName: string) => void;
  onGoToCheckIn: (pnr: string) => void;
  onNewBooking: () => void;
}

export const BookingConfirmation: React.FC<BookingConfirmationProps> = ({
  booking,
  onGoToManageBooking,
  onGoToCheckIn,
  onNewBooking,
}) => {
  useEffect(() => {
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#163784', '#3b82f6', '#93c5fd', '#ffffff'],
      });
    } catch {
      // safe fallback
    }
  }, []);

  const firstSeg = booking.segments[0];
  const primaryPax = booking.passengers[0];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Success Hero Header in #163784 */}
      <div className="bg-[#163784] rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-blue-900">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 bg-white/10 text-blue-200 px-3.5 py-1 rounded-full text-xs font-bold border border-white/20">
              <CheckCircle className="w-4 h-4 text-blue-300" />
              <span>Booking Confirmed & E-Ticket Issued</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black">
              Maita Basa / Siyabonga! You're Flying Air Zimbabwe
            </h1>
            <p className="text-xs sm:text-sm text-blue-100 max-w-xl">
              Your flight reservation is finalized and confirmed. A digital itinerary and e-ticket receipt have been dispatched to{' '}
              <strong className="text-white">{booking.emergencyContact.email}</strong>.
            </p>
          </div>

          {/* Prominent PNR Badge */}
          <div className="bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-2xl text-center shrink-0 w-full sm:w-auto">
            <span className="text-[11px] uppercase tracking-wider text-blue-200 font-bold block">
              Booking Reference (PNR)
            </span>
            <span className="text-3xl font-mono font-black text-white tracking-widest block my-1">
              {booking.pnr}
            </span>
            <span className="text-[11px] font-mono text-blue-200 block">
              E-Ticket: {booking.ticketNumber}
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onGoToCheckIn(booking.pnr)}
            className="px-4 py-2 bg-[#163784] hover:bg-[#102b67] text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Plane className="w-4 h-4" />
            <span>Web Check-In Available</span>
          </button>
          <button
            type="button"
            onClick={() => onGoToManageBooking(booking.pnr, primaryPax.lastName)}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <span>Manage My Booking</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="px-3.5 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Itinerary</span>
          </button>
          <button
            type="button"
            onClick={onNewBooking}
            className="px-4 py-2 bg-[#163784] hover:bg-[#102b67] text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
          >
            Book Another Flight
          </button>
        </div>
      </div>

      {/* Flight Segments Itinerary Cards */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Plane className="w-5 h-5 text-[#163784]" />
            <span>Flight Itinerary Details</span>
          </h2>
          <span className="text-xs bg-blue-50 text-[#163784] border border-blue-200 px-3 py-1 rounded-full font-semibold">
            Status: {booking.status}
          </span>
        </div>

        {booking.segments.map((seg, idx) => (
          <div key={seg.id} className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-bold text-[#163784] uppercase tracking-wider">
                Segment {idx + 1}: {seg.flightNumber} • Non-Stop
              </span>
              <span className="text-slate-500 font-medium">
                Aircraft: {seg.aircraft.model} ({seg.aircraft.name})
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
              <div className="md:col-span-4">
                <span className="text-2xl font-black text-slate-900">{seg.departureTime}</span>
                <div className="text-sm font-bold text-slate-800">{seg.origin.city} ({seg.origin.code})</div>
                <div className="text-xs text-slate-500">{seg.origin.name}</div>
                <div className="text-xs text-slate-600 font-medium mt-1">Date: {seg.departureDate}</div>
              </div>

              <div className="md:col-span-4 flex flex-col items-center justify-center text-center">
                <span className="text-xs text-slate-500 font-semibold mb-1">{seg.duration}</span>
                <div className="w-32 h-0.5 bg-slate-300 relative flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-[#163784] absolute left-0" />
                  <Plane className="w-4 h-4 text-[#163784]" />
                  <div className="w-2 h-2 rounded-full bg-blue-600 absolute right-0" />
                </div>
                <span className="text-[10px] text-slate-500 mt-1">Confirmed Non-stop</span>
              </div>

              <div className="md:col-span-4 md:text-right">
                <span className="text-2xl font-black text-slate-900">{seg.arrivalTime}</span>
                <div className="text-sm font-bold text-slate-800">{seg.destination.city} ({seg.destination.code})</div>
                <div className="text-xs text-slate-500">{seg.destination.name}</div>
                <div className="text-xs text-slate-600 font-medium mt-1">Date: {seg.arrivalDate}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Digital Boarding Pass Preview */}
      <div className="bg-white rounded-2xl border-2 border-slate-300 shadow-md overflow-hidden">
        <div className="bg-[#163784] p-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-serif font-black tracking-wider text-base">AIR ZIMBABWE</span>
            <span className="text-[10px] bg-white text-[#163784] font-bold px-2 py-0.5 rounded uppercase">
              Digital Boarding Pass
            </span>
          </div>
          <span className="text-xs font-mono font-bold text-blue-200">
            {booking.cabinClass.toUpperCase()} CLASS
          </span>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          <div className="md:col-span-8 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Passenger</span>
                <span className="text-sm font-black text-slate-900">
                  {primaryPax.lastName}/{primaryPax.firstName} {primaryPax.title}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Flight</span>
                <span className="text-sm font-mono font-bold text-slate-900">{firstSeg?.flightNumber}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Seat</span>
                <span className="text-base font-mono font-black text-[#163784]">
                  {primaryPax.selectedSeats[firstSeg?.id || ''] || 'Assigned at Check-In'}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Boarding Gate</span>
                <span className="text-sm font-bold text-slate-900">Gate 4B (HRE)</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Boarding Time</span>
                <span className="text-sm font-bold text-blue-900">45 Mins Prior</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Boarding Zone</span>
                <span className="text-sm font-bold text-slate-900">
                  {booking.cabinClass === 'business' ? 'Zone 1 (Priority)' : 'Zone 3'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs text-slate-500 pt-2 border-t border-slate-100">
              <span>Passport: {primaryPax.passportNumber}</span>
              <span>•</span>
              <span>Class: {booking.fareFamily.toUpperCase()}</span>
              <span>•</span>
              <span>Meal: {primaryPax.mealPreference || 'Standard'}</span>
            </div>
          </div>

          <div className="md:col-span-4 border-t md:border-t-0 md:border-l border-dashed border-slate-300 md:pl-6 flex flex-col items-center justify-center text-center">
            <div className="w-32 h-32 bg-slate-50 rounded-xl border border-slate-200 p-2 flex items-center justify-center mb-2 shadow-inner">
              <QrCode className="w-24 h-24 text-slate-800" />
            </div>
            <span className="text-[9px] font-mono font-bold tracking-widest text-slate-400 block">
              IATA BCBP M1 FORMAT
            </span>
            <span className="text-[10px] font-mono text-slate-600 block mt-0.5">
              {booking.pnr} • {firstSeg?.origin.code}-{firstSeg?.destination.code}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
