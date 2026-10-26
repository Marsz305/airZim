/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  User,
  Calendar,
  CreditCard,
  Briefcase,
  AlertTriangle,
  CheckCircle2,
  Phone,
  Mail,
  HeartHandshake,
  Utensils,
  Plus,
  Minus,
  Sparkles,
} from 'lucide-react';
import {
  CabinClass,
  Currency,
  EmergencyContact,
  FareFamily,
  PassengerDetails,
} from '../types/ibe';
import { getBaggageAllowance, calculatePassengerBaggageFees } from '../utils/baggage';
import { validatePassengerAgeBracket, validatePassportExpiry } from '../utils/validation';
import { formatPrice } from '../utils/pricing';

interface PassengerManifestFormProps {
  passengers: PassengerDetails[];
  onChangePassengers: (passengers: PassengerDetails[]) => void;
  emergencyContact: EmergencyContact;
  onChangeEmergencyContact: (contact: EmergencyContact) => void;
  cabinClass: CabinClass;
  fareFamily: FareFamily;
  currency: Currency;
  departureDate: string;
  onProceedToSeatMap: () => void;
  onBack: () => void;
}

export const PassengerManifestForm: React.FC<PassengerManifestFormProps> = ({
  passengers,
  onChangePassengers,
  emergencyContact,
  onChangeEmergencyContact,
  cabinClass,
  fareFamily,
  currency,
  departureDate,
  onProceedToSeatMap,
  onBack,
}) => {
  const [activePassengerIndex, setActivePassengerIndex] = useState<number>(0);
  const [attemptedSubmit, setAttemptedSubmit] = useState<boolean>(false);

  const baggageAllowance = getBaggageAllowance(cabinClass, fareFamily);

  const updatePassenger = (index: number, field: keyof PassengerDetails, value: any) => {
    const updated = [...passengers];
    updated[index] = { ...updated[index], [field]: value };
    onChangePassengers(updated);
  };

  const updatePassengerBaggage = (
    index: number,
    piecesDelta: number,
    extraWeightKgDelta: number
  ) => {
    const updated = [...passengers];
    const curBaggage = updated[index].baggage || { checkedPieces: baggageAllowance.freeCheckedPieces, extraWeightKg: 0 };

    const newPieces = Math.max(
      baggageAllowance.freeCheckedPieces,
      Math.min(5, curBaggage.checkedPieces + piecesDelta)
    );
    const newWeight = Math.max(0, Math.min(30, curBaggage.extraWeightKg + extraWeightKgDelta));

    updated[index].baggage = {
      checkedPieces: newPieces,
      extraWeightKg: newWeight,
    };
    onChangePassengers(updated);
  };

  const getPassengerValidation = (p: PassengerDetails) => {
    const hasName = Boolean(p.firstName?.trim() && p.lastName?.trim());
    const ageVal = validatePassengerAgeBracket(p.type, p.dateOfBirth, departureDate);
    const passNum = Boolean(p.passportNumber?.trim());
    const passExp = validatePassportExpiry(p.passportExpiry, departureDate);

    const isValid = hasName && ageVal.isValid && passNum && passExp.isValid;
    return { hasName, ageVal, passNum, passExp, isValid };
  };

  const isEmergencyContactValid =
    Boolean(emergencyContact.fullName?.trim()) &&
    Boolean(emergencyContact.phoneNumber?.trim()) &&
    Boolean(emergencyContact.email?.trim());

  const allPassengersValid = passengers.every((p) => getPassengerValidation(p).isValid);
  const isFormValid = allPassengersValid && isEmergencyContactValid;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAttemptedSubmit(true);

    if (isFormValid) {
      onProceedToSeatMap();
    }
  };

  const handlePrefillDemo = () => {
    const updated = passengers.map((p, idx) => {
      if (idx === 0) {
        return {
          ...p,
          title: 'Mr',
          firstName: 'Tendai',
          lastName: 'Moyo',
          dateOfBirth: '1985-05-14',
          gender: 'male' as const,
          nationality: 'Zimbabwean',
          passportNumber: 'FN482910',
          passportExpiry: '2030-08-20',
          passportCountry: 'Zimbabwe',
          frequentFlyerNumber: 'RC-892019',
          mealPreference: 'Traditional Sadza & Beef Stew (Shona Special)',
        };
      } else if (idx === 1) {
        return {
          ...p,
          title: 'Mrs',
          firstName: 'Ruvimbo',
          lastName: 'Moyo',
          dateOfBirth: '1988-09-22',
          gender: 'female' as const,
          nationality: 'Zimbabwean',
          passportNumber: 'FN772391',
          passportExpiry: '2029-11-15',
          passportCountry: 'Zimbabwe',
          frequentFlyerNumber: 'RC-892020',
          mealPreference: 'Traditional Roasted Nyama & Isitshwala',
        };
      }
      return p;
    });

    onChangePassengers(updated);
    onChangeEmergencyContact({
      fullName: 'Dr. Farai Moyo',
      relationship: 'Brother',
      phoneNumber: '+263 77 234 5678',
      email: 'farai.moyo@airzim-travel.co.zw',
    });
  };

  const activePass = passengers[activePassengerIndex] || passengers[0];
  const activeValidation = getPassengerValidation(activePass);
  const activeBaggageCalc = calculatePassengerBaggageFees(
    baggageAllowance,
    activePass.baggage?.checkedPieces || baggageAllowance.freeCheckedPieces,
    activePass.baggage?.extraWeightKg || 0
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Manifest Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#163784]">
            <span>IATA Advance Passenger Information (API)</span>
            <span>•</span>
            <span>{passengers.length} Passenger{passengers.length > 1 ? 's' : ''}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
            Passenger Details & Baggage Calculator
          </h2>
          <p className="text-xs text-slate-500">
            Please enter government-issued travel document details exactly as they appear on your passport.
          </p>
        </div>

        <button
          type="button"
          onClick={handlePrefillDemo}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-[#163784] border border-blue-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
          <span>Auto-fill Demo Manifest</span>
        </button>
      </div>

      {/* Passenger Selection Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        {passengers.map((p, idx) => {
          const val = getPassengerValidation(p);
          const isSelected = activePassengerIndex === idx;

          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setActivePassengerIndex(idx)}
              className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
                isSelected
                  ? 'bg-[#163784] text-white shadow-md'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <User className="w-4 h-4" />
              <span>
                Passenger {idx + 1}: {p.firstName ? `${p.firstName} ${p.lastName}` : `(${p.type})`}
              </span>
              {val.isValid ? (
                <CheckCircle2 className={`w-3.5 h-3.5 ${isSelected ? 'text-blue-200' : 'text-blue-600'}`} />
              ) : attemptedSubmit ? (
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              ) : null}
            </button>
          );
        })}
      </div>

      {/* Active Passenger Form Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
        <div className="border-b border-slate-100 pb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-blue-100 text-[#163784] font-bold text-xs flex items-center justify-center">
              {activePassengerIndex + 1}
            </span>
            <h3 className="text-base font-bold text-slate-900">
              Personal Information (Passenger {activePassengerIndex + 1} -{' '}
              <span className="capitalize text-[#163784]">{activePass.type}</span>)
            </h3>
          </div>
          <span className="text-xs bg-slate-100 text-slate-600 px-3 py-1 rounded-full font-medium">
            Category: {activePass.type === 'adult' ? 'Adult (12+ yrs)' : activePass.type === 'child' ? 'Child (2-11 yrs)' : 'Infant (<2 yrs)'}
          </span>
        </div>

        {/* Basic Name Details */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Title</label>
            <select
              value={activePass.title}
              onChange={(e) => updatePassenger(activePassengerIndex, 'title', e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#163784]"
            >
              <option value="Mr">Mr</option>
              <option value="Mrs">Mrs</option>
              <option value="Ms">Ms</option>
              <option value="Dr">Dr</option>
              <option value="Prof">Prof</option>
              <option value="Master">Master</option>
            </select>
          </div>

          <div className="sm:col-span-5">
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">First & Middle Names *</label>
            <input
              type="text"
              placeholder="e.g. Tendai Farai"
              value={activePass.firstName}
              onChange={(e) => updatePassenger(activePassengerIndex, 'firstName', e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#163784]"
              required
            />
          </div>

          <div className="sm:col-span-5">
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Last / Family Name *</label>
            <input
              type="text"
              placeholder="e.g. Moyo"
              value={activePass.lastName}
              onChange={(e) => updatePassenger(activePassengerIndex, 'lastName', e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#163784]"
              required
            />
          </div>
        </div>

        {/* Date of Birth & Automated Age Bracket Validation */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
          <div className="sm:col-span-4">
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Date of Birth *</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="date"
                value={activePass.dateOfBirth}
                onChange={(e) => updatePassenger(activePassengerIndex, 'dateOfBirth', e.target.value)}
                className={`w-full pl-9 pr-3 py-2.5 bg-slate-50 border rounded-xl text-sm font-medium focus:outline-none focus:ring-2 ${
                  attemptedSubmit && !activeValidation.ageVal.isValid
                    ? 'border-rose-400 focus:ring-rose-400'
                    : 'border-slate-200 focus:ring-[#163784]'
                }`}
                required
              />
            </div>
            {activePass.dateOfBirth && (
              <div className="mt-1 text-xs">
                {activeValidation.ageVal.isValid ? (
                  <span className="text-blue-700 flex items-center gap-1 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Age on flight: {activeValidation.ageVal.age} years (Valid {activePass.type})
                  </span>
                ) : (
                  <span className="text-rose-600 flex items-center gap-1 font-medium">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {activeValidation.ageVal.error}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="sm:col-span-4">
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Gender</label>
            <select
              value={activePass.gender}
              onChange={(e) => updatePassenger(activePassengerIndex, 'gender', e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#163784]"
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Undisclosed / Other</option>
            </select>
          </div>

          <div className="sm:col-span-4">
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nationality</label>
            <select
              value={activePass.nationality}
              onChange={(e) => updatePassenger(activePassengerIndex, 'nationality', e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#163784]"
            >
              <option value="Zimbabwean">Zimbabwean</option>
              <option value="South African">South African</option>
              <option value="British">British (UK)</option>
              <option value="Zambian">Zambian</option>
              <option value="Tanzanian">Tanzanian</option>
              <option value="American">American (USA)</option>
              <option value="Other">Other Nationality</option>
            </select>
          </div>
        </div>

        {/* Passport & Document Details (API Standards) */}
        <div className="pt-2 border-t border-slate-100">
          <div className="flex items-center gap-2 mb-3">
            <CreditCard className="w-4 h-4 text-[#163784]" />
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Passport & International API Travel Document
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
            <div className="sm:col-span-4">
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Passport Number *</label>
              <input
                type="text"
                placeholder="e.g. FN482910"
                value={activePass.passportNumber}
                onChange={(e) => updatePassenger(activePassengerIndex, 'passportNumber', e.target.value.toUpperCase())}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#163784]"
                required
              />
            </div>

            <div className="sm:col-span-4">
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Issuing Country</label>
              <select
                value={activePass.passportCountry}
                onChange={(e) => updatePassenger(activePassengerIndex, 'passportCountry', e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#163784]"
              >
                <option value="Zimbabwe">Zimbabwe</option>
                <option value="South Africa">South Africa</option>
                <option value="United Kingdom">United Kingdom</option>
                <option value="Zambia">Zambia</option>
                <option value="United States">United States</option>
                <option value="Other">Other Country</option>
              </select>
            </div>

            <div className="sm:col-span-4">
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Passport Expiry Date *</label>
              <input
                type="date"
                value={activePass.passportExpiry}
                min={departureDate}
                onChange={(e) => updatePassenger(activePassengerIndex, 'passportExpiry', e.target.value)}
                className={`w-full px-3 py-2.5 bg-slate-50 border rounded-xl text-sm font-medium focus:outline-none focus:ring-2 ${
                  attemptedSubmit && !activeValidation.passExp.isValid
                    ? 'border-rose-400 focus:ring-rose-400'
                    : 'border-slate-200 focus:ring-[#163784]'
                }`}
                required
              />
              {activePass.passportExpiry && (
                <div className="mt-1 text-xs">
                  {activeValidation.passExp.isValid ? (
                    <span className="text-blue-700 flex items-center gap-1 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Valid ({activeValidation.passExp.monthsRemaining} months remaining)
                    </span>
                  ) : (
                    <span className="text-rose-600 flex items-center gap-1 font-medium">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      {activeValidation.passExp.error}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Baggage Allowance & Weight Calculator */}
        <div className="pt-4 border-t border-slate-100 bg-blue-50/40 p-5 rounded-2xl border border-blue-100">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-[#163784]" />
              <h4 className="text-sm font-bold text-slate-900">
                Baggage Allowance & Excess Weight Calculator
              </h4>
            </div>
            <span className="text-xs font-semibold text-[#163784] bg-white px-2.5 py-1 rounded-full border border-blue-200">
              Fare Family: {fareFamily.toUpperCase()} ({baggageAllowance.freeCheckedPieces} free bag
              {baggageAllowance.freeCheckedPieces !== 1 ? 's' : ''} up to{' '}
              {baggageAllowance.checkedPieceWeightKg}kg each)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-800">Checked Bags (Pieces)</span>
                <span className="text-xs text-slate-500">
                  {baggageAllowance.freeCheckedPieces} Free Included
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-xs text-slate-600">
                  Total: <strong>{activePass.baggage?.checkedPieces || baggageAllowance.freeCheckedPieces} pieces</strong>
                  {activeBaggageCalc.additionalPieces > 0 && (
                    <span className="text-blue-800 ml-1 font-semibold">
                      (+{activeBaggageCalc.additionalPieces} extra bag @ $45)
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-label="Decrease checked bags"
                    disabled={(activePass.baggage?.checkedPieces || baggageAllowance.freeCheckedPieces) <= baggageAllowance.freeCheckedPieces}
                    onClick={() => updatePassengerBaggage(activePassengerIndex, -1, 0)}
                    className="w-7 h-7 rounded border border-slate-300 flex items-center justify-center font-bold text-slate-700 disabled:opacity-30 hover:bg-slate-100 cursor-pointer"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Add extra checked bag"
                    onClick={() => updatePassengerBaggage(activePassengerIndex, 1, 0)}
                    className="w-7 h-7 rounded border border-slate-300 flex items-center justify-center font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-slate-800">Excess Weight Addition</span>
                <span className="text-xs font-mono font-bold text-[#163784]">
                  {activePass.baggage?.extraWeightKg || 0} kg excess
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="25"
                step="1"
                aria-label="Excess Baggage Weight (kg)"
                value={activePass.baggage?.extraWeightKg || 0}
                onChange={(e) => updatePassengerBaggage(activePassengerIndex, 0, Number(e.target.value) - (activePass.baggage?.extraWeightKg || 0))}
                className="w-full accent-[#163784] cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-slate-400 mt-1">
                <span>0 kg</span>
                <span>$7 per excess kg</span>
                <span>25 kg</span>
              </div>
            </div>
          </div>

          {activeBaggageCalc.totalBaggageFeeUSD > 0 && (
            <div className="mt-3 bg-white border border-blue-200 rounded-xl p-3 flex items-center justify-between text-xs">
              <span className="text-[#163784] font-semibold">
                Additional Baggage Fee for Passenger {activePassengerIndex + 1}:
              </span>
              <span className="font-bold text-[#163784]">
                +{formatPrice(activeBaggageCalc.totalBaggageFeeUSD, currency)} USD
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Emergency Contact Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <HeartHandshake className="w-4 h-4 text-blue-700" />
          <h3 className="text-base font-bold text-slate-900">
            Emergency Contact (Linked to Passenger Records)
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
          <div className="sm:col-span-4">
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Contact Full Name *</label>
            <input
              type="text"
              placeholder="e.g. Dr. Farai Moyo"
              value={emergencyContact.fullName}
              onChange={(e) => onChangeEmergencyContact({ ...emergencyContact, fullName: e.target.value })}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#163784]"
              required
            />
          </div>

          <div className="sm:col-span-3">
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Relationship *</label>
            <select
              value={emergencyContact.relationship}
              onChange={(e) => onChangeEmergencyContact({ ...emergencyContact, relationship: e.target.value })}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#163784]"
            >
              <option value="Spouse">Spouse / Partner</option>
              <option value="Parent">Parent</option>
              <option value="Sibling">Sibling</option>
              <option value="Child">Child</option>
              <option value="Employer">Employer</option>
              <option value="Friend">Friend / Colleague</option>
            </select>
          </div>

          <div className="sm:col-span-5">
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Phone Number (with Country Code) *</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="tel"
                placeholder="+263 77 234 5678"
                value={emergencyContact.phoneNumber}
                onChange={(e) => onChangeEmergencyContact({ ...emergencyContact, phoneNumber: e.target.value })}
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#163784]"
                required
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Emergency Email Address *</label>
          <div className="relative sm:w-1/2">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="email"
              placeholder="emergency@contact.co.zw"
              value={emergencyContact.email}
              onChange={(e) => onChangeEmergencyContact({ ...emergencyContact, email: e.target.value })}
              className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#163784]"
              required
            />
          </div>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-4">
        <button
          type="button"
          onClick={onBack}
          className="px-6 py-3 rounded-xl border border-slate-300 text-slate-700 font-bold text-sm hover:bg-slate-100 transition-colors cursor-pointer"
        >
          Back to Flights
        </button>

        <button
          type="submit"
          className="px-8 py-3.5 bg-[#163784] hover:bg-[#102b67] text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all text-sm sm:text-base flex items-center gap-2 cursor-pointer"
        >
          <span>Proceed to Seat Selection</span>
        </button>
      </div>
    </form>
  );
};
