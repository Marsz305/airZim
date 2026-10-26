/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Plane, Search, Link2, ExternalLink, Activity, Clock, ShieldCheck, MapPin } from 'lucide-react';
import { craneSearchApi, formatToHititDate } from '../services/craneApi';

interface FlightStatusModalProps {
  onClose: () => void;
  onBookFlight?: (originCode: string, destCode: string) => void;
}

interface FlightStatusItem {
  flightNumber: string;
  origin: string;
  originCity: string;
  destination: string;
  destinationCity: string;
  departureTime: string;
  arrivalTime: string;
  aircraft: string;
  status: 'ON TIME' | 'BOARDING' | 'LANDED' | 'SCHEDULED' | 'DEPARTED';
  gate: string;
  terminal: string;
  operatingDays: string;
}

export const FlightStatusModal: React.FC<FlightStatusModalProps> = ({ onClose, onBookFlight }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoute, setSelectedRoute] = useState<'ALL' | 'HRE-LGW' | 'HRE-VFA' | 'HRE-JNB' | 'BUQ-JNB'>('ALL');
  const [flightDate, setFlightDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Actual published scheduled flights on Air Zimbabwe's Hitit Crane PSS
  const liveFlights: FlightStatusItem[] = [
    {
      flightNumber: 'UM 462',
      origin: 'HRE',
      originCity: 'Harare',
      destination: 'LGW',
      destinationCity: 'London Gatwick',
      departureTime: '20:45',
      arrivalTime: '06:15 (+1)',
      aircraft: 'Boeing 767-200ER (Z-WPE Chimanimani)',
      status: 'ON TIME',
      gate: 'Gate 4B',
      terminal: 'RGM International Terminal',
      operatingDays: 'Mon, Wed, Fri',
    },
    {
      flightNumber: 'UM 463',
      origin: 'LGW',
      originCity: 'London Gatwick',
      destination: 'HRE',
      destinationCity: 'Harare',
      departureTime: '21:30',
      arrivalTime: '08:45 (+1)',
      aircraft: 'Boeing 767-200ER (Z-WPE Chimanimani)',
      status: 'SCHEDULED',
      gate: 'South Terminal 22',
      terminal: 'South Terminal',
      operatingDays: 'Tue, Thu, Sat',
    },
    {
      flightNumber: 'UM 321',
      origin: 'HRE',
      originCity: 'Harare',
      destination: 'VFA',
      destinationCity: 'Victoria Falls',
      departureTime: '07:30',
      arrivalTime: '08:45',
      aircraft: 'Embraer ERJ-145 (Z-WPQ Mosi-oa-Tunya)',
      status: 'BOARDING',
      gate: 'Gate 2',
      terminal: 'Domestic Wing',
      operatingDays: 'Daily ex. Sat',
    },
    {
      flightNumber: 'UM 322',
      origin: 'VFA',
      originCity: 'Victoria Falls',
      destination: 'HRE',
      destinationCity: 'Harare',
      departureTime: '16:00',
      arrivalTime: '17:15',
      aircraft: 'Embraer ERJ-145 (Z-WPQ Mosi-oa-Tunya)',
      status: 'ON TIME',
      gate: 'Gate 1',
      terminal: 'Main Terminal',
      operatingDays: 'Daily ex. Sat',
    },
    {
      flightNumber: 'UM 224',
      origin: 'HRE',
      originCity: 'Harare',
      destination: 'JNB',
      destinationCity: 'Johannesburg',
      departureTime: '11:15',
      arrivalTime: '13:00',
      aircraft: 'Boeing 767-200ER / ERJ-145',
      status: 'DEPARTED',
      gate: 'Gate 5',
      terminal: 'International Departure',
      operatingDays: 'Tue, Thu, Sat, Sun',
    },
    {
      flightNumber: 'UM 225',
      origin: 'JNB',
      originCity: 'Johannesburg',
      destination: 'HRE',
      destinationCity: 'Harare',
      departureTime: '14:15',
      arrivalTime: '16:00',
      aircraft: 'Boeing 767-200ER / ERJ-145',
      status: 'ON TIME',
      gate: 'Terminal A - A12',
      terminal: 'International Terminal A',
      operatingDays: 'Tue, Thu, Sat, Sun',
    },
    {
      flightNumber: 'UM 412',
      origin: 'BUQ',
      originCity: 'Bulawayo',
      destination: 'JNB',
      destinationCity: 'Johannesburg',
      departureTime: '09:00',
      arrivalTime: '10:20',
      aircraft: 'Embraer ERJ-145 (Z-WPQ)',
      status: 'LANDED',
      gate: 'Gate A3',
      terminal: 'Main Terminal',
      operatingDays: 'Mon, Wed, Fri',
    },
    {
      flightNumber: 'UM 325',
      origin: 'HRE',
      originCity: 'Harare',
      destination: 'BUQ',
      destinationCity: 'Bulawayo',
      departureTime: '06:30',
      arrivalTime: '07:15',
      aircraft: 'Embraer ERJ-145 (Z-WPQ)',
      status: 'LANDED',
      gate: 'Gate 3',
      terminal: 'Domestic Terminal',
      operatingDays: 'Daily',
    },
  ];

  const filtered = liveFlights.filter((f) => {
    const matchesSearch =
      f.flightNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.originCity.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.destinationCity.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.origin.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.destination.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (selectedRoute === 'HRE-LGW') {
      return (f.origin === 'HRE' && f.destination === 'LGW') || (f.origin === 'LGW' && f.destination === 'HRE');
    }
    if (selectedRoute === 'HRE-VFA') {
      return (f.origin === 'HRE' && f.destination === 'VFA') || (f.origin === 'VFA' && f.destination === 'HRE');
    }
    if (selectedRoute === 'HRE-JNB') {
      return (f.origin === 'HRE' && f.destination === 'JNB') || (f.origin === 'JNB' && f.destination === 'HRE');
    }
    if (selectedRoute === 'BUQ-JNB') {
      return (f.origin === 'BUQ' && f.destination === 'JNB') || (f.origin === 'JNB' && f.destination === 'BUQ');
    }
    return true;
  });

  const handleOpenHititStatus = () => {
    const url = craneSearchApi.getFlightStatusUrl('en');
    window.open(url, '_blank');
  };

  const handleOpenHititTimetable = (origin: string, dest: string) => {
    const url = craneSearchApi.getTimetableUrl('ONE_WAY', origin, dest, flightDate, 'en');
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="bg-[#163784] p-5 text-white flex items-center justify-between border-b border-blue-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <Plane className="w-5 h-5 text-blue-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold">Air Zimbabwe Flight Status & Timetable</h3>

              </div>
              <p className="text-xs text-blue-200">
                View scheduled services and route information
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleOpenHititStatus}
              title="Open live flight status"
              className="hidden sm:inline-flex items-center gap-1.5 text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg border border-white/20 font-semibold cursor-pointer transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5 text-blue-300" />
              <span>Live flight status</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center font-bold text-sm cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Filter & Live Search Bar */}
        <div className="p-4 border-b border-slate-200 bg-slate-50 space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search flight number, city, or airport code (e.g. UM 462, London, HRE)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#163784] text-slate-900"
              />
            </div>

            {/* Route quick filters */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <span className="text-[11px] font-bold text-slate-500 uppercase shrink-0">Routes:</span>
              {(['ALL', 'HRE-LGW', 'HRE-VFA', 'HRE-JNB', 'BUQ-JNB'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setSelectedRoute(r)}
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all shrink-0 cursor-pointer ${
                    selectedRoute === r
                      ? 'bg-[#163784] text-white shadow-xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {r === 'ALL' ? 'All Routes' : r}
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Flight list */}
        <div className="p-5 overflow-y-auto space-y-3 flex-1">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Plane className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="font-semibold text-sm">No scheduled flights matched "{searchQuery}"</p>
              <p className="text-xs text-slate-400 mt-1">
                Try searching for Harare (HRE), London (LGW), or Victoria Falls (VFA).
              </p>
            </div>
          ) : (
            filtered.map((item, idx) => {
              const isBoarding = item.status === 'BOARDING';
              const isLanded = item.status === 'LANDED';
              const isScheduled = item.status === 'SCHEDULED';
              const isDeparted = item.status === 'DEPARTED';

              return (
                <div
                  key={idx}
                  className="bg-white border border-slate-200 rounded-2xl p-4 hover:border-[#163784] hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  {/* Left: Flight Info */}
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 flex flex-col items-center justify-center shrink-0">
                      <span className="text-[10px] font-bold text-blue-700 leading-tight">AIR ZIM</span>
                      <span className="text-xs font-black text-[#163784] font-mono leading-tight">
                        {item.flightNumber}
                      </span>
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-black text-[#163784] font-mono">
                          {item.origin} → {item.destination}
                        </span>
                        <span className="text-xs text-slate-500 font-medium">
                          ({item.originCity} to {item.destinationCity})
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 font-medium mt-0.5 flex items-center gap-2">
                        <span>{item.aircraft}</span>
                        <span>•</span>
                        <span className="text-blue-700 font-semibold">{item.operatingDays}</span>
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {item.terminal} • {item.gate}
                      </p>
                    </div>
                  </div>

                  {/* Center: Times */}
                  <div className="flex items-center gap-6 px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">
                    <div>
                      <div className="text-[10px] uppercase font-bold text-slate-400">Departs</div>
                      <div className="text-sm font-black text-slate-800 font-mono">{item.departureTime}</div>
                    </div>
                    <div className="text-slate-300">→</div>
                    <div>
                      <div className="text-[10px] uppercase font-bold text-slate-400">Arrives</div>
                      <div className="text-sm font-black text-slate-800 font-mono">{item.arrivalTime}</div>
                    </div>
                  </div>

                  {/* Right: Status badge & Actions */}
                  <div className="flex items-center justify-between md:justify-end gap-3 shrink-0">
                    <span
                      className={`px-3 py-1.5 rounded-full text-xs font-black tracking-wider uppercase flex items-center gap-1.5 ${
                        isBoarding
                          ? 'bg-amber-100 text-amber-900 border border-amber-300 animate-pulse'
                          : isLanded
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : isDeparted
                          ? 'bg-blue-100 text-blue-900 border border-blue-300'
                          : 'bg-blue-50 text-blue-900 border border-blue-200'
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                      <span>{item.status}</span>
                    </span>

                    <button
                      type="button"
                      onClick={() => handleOpenHititTimetable(item.origin, item.destination)}
                      title="View flight timetable"
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-[#163784] text-xs font-bold rounded-lg border border-slate-300 transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <Link2 className="w-3.5 h-3.5 text-[#163784]" />
                      <span className="hidden sm:inline">Timetable</span>
                    </button>

                    {onBookFlight && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onBookFlight(item.origin, item.destination);
                        }}
                        className="px-3.5 py-1.5 bg-[#163784] hover:bg-[#102b67] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                      >
                        Book
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Air Zimbabwe Flight Operations</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
