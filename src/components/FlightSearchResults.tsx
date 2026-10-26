/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Plane,
  Clock,
  Briefcase,
  Check,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
  Utensils,
  Armchair,
} from 'lucide-react';
import { CabinClass, Currency, FareFamily, FlightSegment } from '../types/ibe';
import { formatPrice } from '../utils/pricing';

interface FlightSearchResultsProps {
  segmentOptions: FlightSegment[][];
  cabinClass: CabinClass;
  currency: Currency;
  onSelectSegments: (selected: { segment: FlightSegment; fareFamily: FareFamily }[]) => void;
  onBackToSearch: () => void;
}

export const FlightSearchResults: React.FC<FlightSearchResultsProps> = ({
  segmentOptions,
  cabinClass,
  currency,
  onSelectSegments,
  onBackToSearch,
}) => {
  const [currentLegIndex, setCurrentLegIndex] = useState<number>(0);
  const [selections, setSelections] = useState<{ segment: FlightSegment; fareFamily: FareFamily }[]>([]);
  const [expandedFlightId, setExpandedFlightId] = useState<string | null>(null);

  const currentSegments = segmentOptions[currentLegIndex] || [];
  const currentLegSample = currentSegments[0];

  const handleChooseFare = (segment: FlightSegment, fareFamily: FareFamily) => {
    const nextSelections = [...selections];
    nextSelections[currentLegIndex] = { segment, fareFamily };
    setSelections(nextSelections);

    if (currentLegIndex < segmentOptions.length - 1) {
      setCurrentLegIndex(currentLegIndex + 1);
      setExpandedFlightId(null);
    } else {
      onSelectSegments(nextSelections);
    }
  };

  return (
    <div className="space-y-6">
      {/* Flight Search Leg Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#163784]">
            <span>
              Flight Leg {currentLegIndex + 1} of {segmentOptions.length}
            </span>
            <span>•</span>
            <span className="capitalize">{cabinClass} Class Cabin</span>
          </div>

          <div className="flex items-center gap-3 mt-1">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
              <span>{currentLegSample?.origin.city} ({currentLegSample?.origin.code})</span>
              <ArrowRight className="w-5 h-5 text-blue-600" />
              <span>{currentLegSample?.destination.city} ({currentLegSample?.destination.code})</span>
            </h2>
          </div>

          <p className="text-xs text-slate-500 mt-1">
            Departure: <span className="font-semibold text-slate-700">{currentLegSample?.departureDate}</span> • Select your flight departure and fare package
          </p>
        </div>

        <button
          type="button"
          onClick={onBackToSearch}
          className="text-xs font-bold text-slate-700 hover:text-[#163784] px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
        >
          Modify Search
        </button>
      </div>

      {/* List of Flights for this Leg */}
      <div className="space-y-4">
        {currentSegments.map((seg) => {
          const isExpanded = expandedFlightId === seg.id;
          const fares = seg.fares[cabinClass === 'business' ? 'business' : 'economy'];

          return (
            <div
              key={seg.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden"
            >
              {/* Flight Summary Card */}
              <div className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                  {/* Airline & Aircraft Info */}
                  <div className="lg:col-span-3 flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                      <Plane className="w-5 h-5 text-[#163784]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-base">{seg.flightNumber}</span>
                        <span className="bg-blue-100 text-[#163784] text-[10px] font-bold px-2 py-0.5 rounded-full">
                          Non-Stop
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        {seg.aircraft.model} <span className="text-slate-600 font-medium">"{seg.aircraft.name}"</span>
                      </p>
                    </div>
                  </div>

                  {/* Times & Route Duration */}
                  <div className="lg:col-span-5 flex items-center justify-between sm:justify-around gap-4 text-center">
                    <div>
                      <div className="text-xl sm:text-2xl font-black text-slate-900">{seg.departureTime}</div>
                      <div className="text-xs font-bold text-slate-700">{seg.origin.code}</div>
                      <div className="text-[11px] text-slate-400 truncate max-w-[100px]">{seg.origin.city}</div>
                    </div>

                    <div className="flex flex-col items-center px-2">
                      <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1 mb-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{seg.duration}</span>
                      </span>
                      <div className="w-24 sm:w-32 h-0.5 bg-slate-200 relative flex items-center justify-center">
                        <div className="absolute w-2 h-2 rounded-full bg-[#163784]" />
                        <Plane className="w-3.5 h-3.5 text-[#163784] absolute -top-1.5" />
                      </div>
                      <span className="text-[10px] text-blue-700 font-bold mt-1">Direct Flight</span>
                    </div>

                    <div>
                      <div className="text-xl sm:text-2xl font-black text-slate-900">{seg.arrivalTime}</div>
                      <div className="text-xs font-bold text-slate-700">{seg.destination.code}</div>
                      <div className="text-[11px] text-slate-400 truncate max-w-[100px]">{seg.destination.city}</div>
                    </div>
                  </div>

                  {/* Price Preview & Fare Tiers Button */}
                  <div className="lg:col-span-4 flex flex-col sm:flex-row lg:flex-col items-end justify-between lg:justify-center gap-2 border-t sm:border-t-0 pt-4 sm:pt-0">
                    <div className="text-right">
                      <span className="text-[11px] text-slate-500 font-medium">From</span>
                      <div className="text-2xl font-black text-[#163784]">
                        {formatPrice(fares.lite.basePriceUSD, currency)}
                      </div>
                      <span className="text-[10px] text-slate-400">per adult passenger</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setExpandedFlightId(isExpanded ? null : seg.id)}
                      className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#163784] hover:bg-[#102b67] text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                    >
                      <span>{isExpanded ? 'Hide Fare Options' : 'View Fare Options'}</span>
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Dynamic Fare-Family Categorization Matrix (Lite vs Classic vs Flex) */}
              {isExpanded && (
                <div className="border-t border-slate-200 bg-slate-50/70 p-6">
                  <div className="mb-4">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                      Choose Your Fare Family for {seg.flightNumber}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Select your desired level of baggage allowance, ticket flexibility, and in-flight perks.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {(['lite', 'classic', 'flex'] as FareFamily[]).map((famKey) => {
                      const tier = fares[famKey];
                      const isFlex = famKey === 'flex';
                      const isClassic = famKey === 'classic';

                      return (
                        <div
                          key={famKey}
                          className={`rounded-2xl border p-5 flex flex-col justify-between transition-all bg-white relative ${
                            isFlex
                              ? 'border-[#163784] ring-2 ring-[#163784]/20 shadow-md'
                              : isClassic
                              ? 'border-blue-300 shadow-sm'
                              : 'border-slate-200'
                          }`}
                        >
                          {isFlex && (
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#163784] text-white text-[10px] font-black uppercase px-3 py-0.5 rounded-full tracking-wider shadow-sm flex items-center gap-1">
                              <Sparkles className="w-3 h-3 text-blue-300" />
                              <span>Full Refund & Flexibility</span>
                            </div>
                          )}

                          {isClassic && (
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[10px] font-black uppercase px-3 py-0.5 rounded-full tracking-wider shadow-sm">
                              Most Popular
                            </div>
                          )}

                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="text-base font-bold text-slate-900">{tier.name}</h4>
                            </div>

                            <div className="text-2xl font-black text-[#163784] mb-3">
                              {formatPrice(tier.basePriceUSD, currency)}
                            </div>

                            <ul className="space-y-2 text-xs text-slate-600 mb-6">
                              <li className="flex items-center gap-2">
                                <Briefcase className="w-3.5 h-3.5 text-[#163784] shrink-0" />
                                <span>
                                  <strong>{tier.checkedBags}</strong> checked bag
                                  {tier.checkedBags !== 1 ? 's' : ''} ({tier.checkedBagWeightKg}kg)
                                </span>
                              </li>
                              <li className="flex items-center gap-2">
                                <Briefcase className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span>{tier.cabinBagWeightKg}kg hand carry-on</span>
                              </li>
                              <li className="flex items-center gap-2">
                                <Utensils className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                                <span>{tier.mealIncluded ? 'Complimentary Meal & Drinks' : 'Snacks on purchase'}</span>
                              </li>
                              <li className="flex items-center gap-2">
                                <Armchair className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                <span>
                                  {tier.seatSelection === 'all_free'
                                    ? 'Free Preferred & Legroom Seat'
                                    : tier.seatSelection === 'standard_free'
                                    ? 'Free Standard Seat'
                                    : 'Seat Selection from $10'}
                                </span>
                              </li>
                              <li className="flex items-center gap-2">
                                <RotateCcw className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                <span>
                                  {tier.changeFeeUSD === 0
                                    ? 'Free Flight Changes'
                                    : `Flight changes: $${tier.changeFeeUSD} fee`}
                                </span>
                              </li>
                              <li className="flex items-center gap-2">
                                <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                <span className={tier.isRefundable ? 'text-blue-900 font-semibold' : 'text-slate-500'}>
                                  {tier.isRefundable
                                    ? tier.refundFeeUSD === 0
                                      ? '100% Full Refundable'
                                      : `Refundable ($${tier.refundFeeUSD} fee)`
                                    : 'Non-Refundable Airfare'}
                                </span>
                              </li>
                            </ul>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleChooseFare(seg, famKey)}
                            className={`w-full py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                              isFlex
                                ? 'bg-[#163784] hover:bg-[#102b67] text-white shadow-md'
                                : isClassic
                                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                                : 'bg-slate-800 hover:bg-slate-900 text-white'
                            }`}
                          >
                            <Check className="w-4 h-4" />
                            <span>Select {tier.name}</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
