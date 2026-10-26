/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  CreditCard,
  Smartphone,
  Lock,
  Building,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
} from 'lucide-react';
import { Currency, PaymentMethod, PricingBreakdown } from '../types/ibe';
import { formatPrice } from '../utils/pricing';
import { validateEcoCashPhone } from '../utils/validation';

interface PaymentAndCheckoutProps {
  pricing: PricingBreakdown;
  currency: Currency;
  onPaymentSuccess: (paymentResult: {
    method: PaymentMethod;
    transactionReference: string;
    last4?: string;
    mobileNumber?: string;
  }) => void;
  onBack: () => void;
}

export const PaymentAndCheckout: React.FC<PaymentAndCheckoutProps> = ({
  pricing,
  currency,
  onPaymentSuccess,
  onBack,
}) => {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('card');

  const [cardNumber, setCardNumber] = useState<string>('4000 1234 5678 9010');
  const [cardHolder, setCardHolder] = useState<string>('TENDAI MOYO');
  const [expiry, setExpiry] = useState<string>('12/28');
  const [cvv, setCvv] = useState<string>('789');

  const [ecoCashPhone, setEcoCashPhone] = useState<string>('0772 345 678');
  const [ecoCashError, setEcoCashError] = useState<string>('');

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [show3DSModal, setShow3DSModal] = useState<boolean>(false);
  const [otpCode, setOtpCode] = useState<string>('748291');
  const [showEcoCashPrompt, setShowEcoCashPrompt] = useState<boolean>(false);
  const [ecoCashCountdown, setEcoCashCountdown] = useState<number>(45);

  useEffect(() => {
    let timer: any;
    if (showEcoCashPrompt && ecoCashCountdown > 0) {
      timer = setInterval(() => {
        setEcoCashCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [showEcoCashPrompt, ecoCashCountdown]);

  const handleCardNumberChange = (val: string) => {
    const raw = val.replace(/\D/g, '').slice(0, 16);
    const formatted = raw.replace(/(\d{4})(?=\d)/g, '$1 ');
    setCardNumber(formatted);
  };

  const handleExpiryChange = (val: string) => {
    const raw = val.replace(/\D/g, '').slice(0, 4);
    if (raw.length >= 2) {
      setExpiry(`${raw.slice(0, 2)}/${raw.slice(2)}`);
    } else {
      setExpiry(raw);
    }
  };

  const handleInitiatePayment = (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedMethod === 'card') {
      setIsProcessing(true);
      setTimeout(() => {
        setIsProcessing(false);
        setShow3DSModal(true);
      }, 800);
    } else if (selectedMethod === 'ecocash') {
      const val = validateEcoCashPhone(ecoCashPhone);
      if (!val.isValid) {
        setEcoCashError(val.error || 'Invalid EcoCash phone number');
        return;
      }
      setEcoCashError('');
      setIsProcessing(true);
      setTimeout(() => {
        setIsProcessing(false);
        setShowEcoCashPrompt(true);
        setEcoCashCountdown(45);
      }, 800);
    } else if (selectedMethod === 'ticket_office') {
      onPaymentSuccess({
        method: 'ticket_office',
        transactionReference: `OFFICE-HOLD-${Math.floor(100000 + Math.random() * 900000)}`,
      });
    } else {
      setIsProcessing(true);
      setTimeout(() => {
        setIsProcessing(false);
        onPaymentSuccess({
          method: selectedMethod,
          transactionReference: `TXN-${selectedMethod.toUpperCase()}-${Math.floor(100000 + Math.random() * 900000)}`,
        });
      }, 1000);
    }
  };

  const handleConfirm3DSecure = () => {
    setShow3DSModal(false);
    onPaymentSuccess({
      method: 'card',
      transactionReference: `VISA-3DS-${Math.floor(10000000 + Math.random() * 90000000)}`,
      last4: cardNumber.replace(/\s+/g, '').slice(-4),
    });
  };

  const handleConfirmEcoCashPrompt = () => {
    setShowEcoCashPrompt(false);
    onPaymentSuccess({
      method: 'ecocash',
      transactionReference: `MP-ECO-${Math.floor(10000000 + Math.random() * 90000000)}`,
      mobileNumber: ecoCashPhone,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#163784]">
          <span>Step 4 of 4</span>
          <span>•</span>
          <span>Payment Authorization</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-1 flex items-center gap-2">
          <span>Review Fare Breakdown & Complete Payment</span>
          <Lock className="w-5 h-5 text-[#163784]" />
        </h2>
        <p className="text-xs text-slate-500">
          All transactions are secured with 256-bit TLS encryption conforming to PCI-DSS standards.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: End-to-End Itemized Price Breakdown */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center justify-between">
              <span>Itemized Price Breakdown</span>
              <span className="text-xs bg-blue-50 text-[#163784] px-2.5 py-1 rounded-full font-mono font-bold border border-blue-200">
                {pricing.currency}
              </span>
            </h3>

            <div className="space-y-2.5 text-xs text-slate-600">
              {/* Base Airfares */}
              <div className="flex justify-between font-semibold text-slate-800">
                <span>Base Airfare Subtotal</span>
                <span>{formatPrice(pricing.baseFareUSD, currency)}</span>
              </div>
              <div className="pl-3 space-y-1 text-[11px] text-slate-500 border-l-2 border-slate-200">
                {pricing.passengerBaseFares.adults > 0 && (
                  <div className="flex justify-between">
                    <span>Adult Passengers</span>
                    <span>{formatPrice(pricing.passengerBaseFares.adults, currency)}</span>
                  </div>
                )}
                {pricing.passengerBaseFares.children > 0 && (
                  <div className="flex justify-between">
                    <span>Child Passengers (25% off)</span>
                    <span>{formatPrice(pricing.passengerBaseFares.children, currency)}</span>
                  </div>
                )}
                {pricing.passengerBaseFares.infants > 0 && (
                  <div className="flex justify-between">
                    <span>Infant Passengers (90% off)</span>
                    <span>{formatPrice(pricing.passengerBaseFares.infants, currency)}</span>
                  </div>
                )}
              </div>

              {/* Taxes & Surcharges */}
              <div className="pt-2 border-t border-slate-100 flex justify-between font-semibold text-slate-800">
                <span>Taxes & Government Surcharges</span>
                <span>
                  {formatPrice(
                    pricing.airportTaxesUSD + pricing.fuelSurchargeUSD + pricing.securityFeeUSD,
                    currency
                  )}
                </span>
              </div>
              <div className="pl-3 space-y-1 text-[11px] text-slate-500 border-l-2 border-slate-200">
                <div className="flex justify-between">
                  <span>Passenger Service Charge (PSC / Airport Tax)</span>
                  <span>{formatPrice(pricing.airportTaxesUSD, currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Airline Fuel Surcharge (YQ/YR)</span>
                  <span>{formatPrice(pricing.fuelSurchargeUSD, currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Aviation Security & Safety Levy</span>
                  <span>{formatPrice(pricing.securityFeeUSD, currency)}</span>
                </div>
              </div>

              {/* Ancillaries */}
              {(pricing.ancillarySeatsUSD > 0 || pricing.ancillaryBaggageUSD > 0) && (
                <div className="pt-2 border-t border-slate-100 space-y-1">
                  <div className="flex justify-between font-semibold text-slate-800">
                    <span>Travel Ancillaries & Services</span>
                    <span>
                      {formatPrice(pricing.ancillarySeatsUSD + pricing.ancillaryBaggageUSD, currency)}
                    </span>
                  </div>
                  {pricing.ancillarySeatsUSD > 0 && (
                    <div className="pl-3 flex justify-between text-[11px] text-slate-500 border-l-2 border-slate-200">
                      <span>Preferred Seat Selection</span>
                      <span>+{formatPrice(pricing.ancillarySeatsUSD, currency)}</span>
                    </div>
                  )}
                  {pricing.ancillaryBaggageUSD > 0 && (
                    <div className="pl-3 flex justify-between text-[11px] text-slate-500 border-l-2 border-slate-200">
                      <span>Extra Bags & Weight Surcharge</span>
                      <span>+{formatPrice(pricing.ancillaryBaggageUSD, currency)}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Promo Code Discount */}
              {pricing.promoDiscountUSD > 0 && (
                <div className="pt-2 border-t border-slate-100 flex justify-between text-blue-700 font-bold">
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Promo Discount ({pricing.appliedPromo?.code})</span>
                  </span>
                  <span>-{formatPrice(pricing.promoDiscountUSD, currency)}</span>
                </div>
              )}

              {/* Grand Total */}
              <div className="pt-4 border-t-2 border-slate-200 mt-2">
                <div className="flex justify-between items-baseline">
                  <span className="text-sm font-black uppercase text-slate-900">Total Payable</span>
                  <div className="text-right">
                    <div className="text-2xl font-black text-[#163784]">
                      {formatPrice(pricing.totalUSD, currency)}
                    </div>
                    {currency !== 'USD' && (
                      <span className="text-[11px] text-slate-500">
                        (~${pricing.totalUSD.toFixed(2)} USD @ rate {pricing.exchangeRate})
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Multi-Tender Payment Methods */}
        <div className="lg:col-span-7">
          <form
            onSubmit={handleInitiatePayment}
            className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6"
          >
            <div>
              <h3 className="text-base font-bold text-slate-900 mb-1">Select Payment Method</h3>
              <p className="text-xs text-slate-500">
                Choose between international cards, local mobile money, or ticket office settlement.
              </p>
            </div>

            {/* Payment Method Selector Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <button
                type="button"
                onClick={() => setSelectedMethod('card')}
                className={`p-3.5 rounded-xl border text-center transition-all cursor-pointer ${
                  selectedMethod === 'card'
                    ? 'border-[#163784] bg-blue-50/60 ring-2 ring-[#163784]/20 text-[#163784] font-bold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <CreditCard className="w-5 h-5 mx-auto mb-1 text-slate-800" />
                <span className="text-xs block">Credit / Debit Card</span>
                <span className="text-[10px] text-slate-400 block font-normal">Visa / Mastercard</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedMethod('ecocash')}
                className={`p-3.5 rounded-xl border text-center transition-all cursor-pointer ${
                  selectedMethod === 'ecocash'
                    ? 'border-[#163784] bg-blue-50/60 ring-2 ring-[#163784]/20 text-[#163784] font-bold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <Smartphone className="w-5 h-5 mx-auto mb-1 text-blue-600" />
                <span className="text-xs block">EcoCash USD</span>
                <span className="text-[10px] text-blue-700 block font-semibold">Dial *151#</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedMethod('innbucks')}
                className={`p-3.5 rounded-xl border text-center transition-all cursor-pointer ${
                  selectedMethod === 'innbucks'
                    ? 'border-[#163784] bg-blue-50/60 ring-2 ring-[#163784]/20 text-[#163784] font-bold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <Sparkles className="w-5 h-5 mx-auto mb-1 text-blue-600" />
                <span className="text-xs block">InnBucks</span>
                <span className="text-[10px] text-slate-400 block font-normal">Fast QR Pay</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedMethod('ticket_office')}
                className={`p-3.5 rounded-xl border text-center transition-all cursor-pointer ${
                  selectedMethod === 'ticket_office'
                    ? 'border-[#163784] bg-blue-50/60 ring-2 ring-[#163784]/20 text-[#163784] font-bold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <Building className="w-5 h-5 mx-auto mb-1 text-slate-700" />
                <span className="text-xs block">Ticket Office</span>
                <span className="text-[10px] text-slate-400 block font-normal">Harare / VFA</span>
              </button>
            </div>

            {selectedMethod === 'card' && (
              <div className="space-y-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Visa / Mastercard Details
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-black bg-[#163784] text-white px-2 py-0.5 rounded">
                      VISA
                    </span>
                    <span className="text-[10px] font-black bg-blue-700 text-white px-2 py-0.5 rounded">
                      MC
                    </span>
                    <span className="text-[10px] font-semibold text-[#163784] bg-blue-100 px-2 py-0.5 rounded">
                      3D Secure 2.0
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Card Number
                  </label>
                  <input
                    type="text"
                    value={cardNumber}
                    onChange={(e) => handleCardNumberChange(e.target.value)}
                    placeholder="4000 1234 5678 9010"
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#163784]"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Expiry Date
                    </label>
                    <input
                      type="text"
                      placeholder="MM/YY"
                      value={expiry}
                      onChange={(e) => handleExpiryChange(e.target.value)}
                      className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#163784]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      CVV / CVC
                    </label>
                    <input
                      type="password"
                      maxLength={4}
                      placeholder="123"
                      value={cvv}
                      onChange={(e) => setCvv(e.target.value)}
                      className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#163784]"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Name on Card
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. TENDAI MOYO"
                    value={cardHolder}
                    onChange={(e) => setCardHolder(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#163784]"
                    required
                  />
                </div>
              </div>
            )}

            {selectedMethod === 'ecocash' && (
              <div className="space-y-4 p-4 rounded-xl bg-blue-50/60 border border-blue-200">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-[#163784]" />
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">EcoCash USD Mobile Money</h4>
                    <p className="text-xs text-slate-600">
                      An approval push notification will be sent to your Econet device.
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    EcoCash Registered Mobile Number
                  </label>
                  <input
                    type="tel"
                    placeholder="077 234 5678 or 078 234 5678"
                    value={ecoCashPhone}
                    onChange={(e) => {
                      setEcoCashPhone(e.target.value);
                      setEcoCashError('');
                    }}
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#163784]"
                    required
                  />
                  {ecoCashError && (
                    <p className="text-xs text-rose-600 font-semibold mt-1">{ecoCashError}</p>
                  )}
                </div>

                <div className="text-xs text-slate-700 bg-white p-3.5 rounded-xl border border-blue-100 space-y-1">
                  <div className="font-bold flex items-center gap-1 text-[#163784]">
                    <ShieldCheck className="w-4 h-4 text-blue-600" />
                    <span>How EcoCash USD works:</span>
                  </div>
                  <p>1. Enter your 10-digit number above and click 'Pay & Issue PNR'.</p>
                  <p>2. You will receive an immediate USSD pop-up on your handset.</p>
                  <p>3. Enter your EcoCash PIN to confirm authorization.</p>
                </div>
              </div>
            )}

            {selectedMethod === 'innbucks' && (
              <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200 text-xs text-slate-700 space-y-2">
                <h4 className="font-bold text-sm text-slate-900">InnBucks Digital Checkout</h4>
                <p>
                  Click 'Pay & Issue PNR' to generate an InnBucks Authorization Code or scan the QR code via your Simbisa InnBucks mobile application.
                </p>
              </div>
            )}

            {selectedMethod === 'ticket_office' && (
              <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200 text-xs text-slate-700 space-y-2">
                <h4 className="font-bold text-sm text-slate-900">Air Zimbabwe Ticket Office Settlement</h4>
                <p>
                  A guaranteed 48-hour PNR reservation will be created for you. Present your 6-digit PNR at any Air Zimbabwe Sales Office (Harare RGM International Airport or Bulawayo) to settle.
                </p>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={onBack}
                className="px-6 py-3 rounded-xl border border-slate-300 text-slate-700 font-bold text-sm hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Back to Seat Selection
              </button>

              <button
                type="submit"
                disabled={isProcessing}
                className="px-8 py-3.5 bg-[#163784] hover:bg-[#102b67] text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all text-sm sm:text-base flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isProcessing ? (
                  <span>Contacting Payment Gateway...</span>
                ) : (
                  <>
                    <Lock className="w-4 h-4 text-blue-300" />
                    <span>
                      Pay {formatPrice(pricing.totalUSD, currency)} & Issue PNR
                    </span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* 3D Secure 2.0 Challenge Simulation Modal */}
      {show3DSModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 p-6 space-y-5 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-6 h-6 text-[#163784]" />
                <span className="font-black text-slate-900 text-base">Verified by VISA / Identity Check</span>
              </div>
              <span className="text-[10px] font-mono bg-slate-100 px-2 py-0.5 rounded">3DS 2.2</span>
            </div>

            <div className="text-xs text-slate-600 space-y-2">
              <p>
                An authentication one-time passcode (OTP) has been dispatched by your issuing bank to your
                registered mobile number ending in <strong>•••• 4829</strong>.
              </p>
              <div className="bg-slate-50 p-3 rounded-lg font-mono text-xs space-y-1">
                <div>Merchant: <strong>Air Zimbabwe (Pvt) Ltd</strong></div>
                <div>Amount: <strong>{formatPrice(pricing.totalUSD, currency)}</strong></div>
                <div>Card: <strong>•••• •••• •••• {cardNumber.replace(/\s+/g, '').slice(-4)}</strong></div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Enter 6-Digit OTP</label>
              <input
                type="text"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                className="w-full text-center text-xl font-mono font-black tracking-widest py-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#163784]"
              />
              <span className="text-[11px] text-[#163784] block text-center mt-1">
                Simulated code ready. Click Verify below to finalize.
              </span>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShow3DSModal(false)}
                className="w-1/2 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirm3DSecure}
                className="w-1/2 py-2.5 rounded-xl bg-[#163784] hover:bg-[#102b67] text-white font-bold text-xs shadow-md cursor-pointer"
              >
                Verify & Authorize
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EcoCash Dial *151# Prompt Simulation Modal */}
      {showEcoCashPrompt && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 p-6 space-y-5 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Smartphone className="w-6 h-6 text-[#163784]" />
                <span className="font-black text-slate-900 text-base">EcoCash USD Authorization</span>
              </div>
              <span className="text-xs font-mono font-bold text-[#163784] bg-blue-100 px-2.5 py-0.5 rounded-full">
                *151#
              </span>
            </div>

            <div className="text-center py-3 space-y-3">
              <div className="w-14 h-14 rounded-full bg-blue-50 border-2 border-[#163784] text-[#163784] flex items-center justify-center mx-auto text-lg font-black animate-pulse">
                {ecoCashCountdown}s
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900">Push Notification Sent</h4>
                <p className="text-xs text-slate-500">
                  Please approve the pending payment of{' '}
                  <strong className="text-slate-900">{formatPrice(pricing.totalUSD, currency)}</strong> on
                  mobile device <strong>{ecoCashPhone}</strong>.
                </p>
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-lg text-xs text-slate-600 space-y-1">
              <div>Ref: <strong>AIRZIM-PAY-{Math.floor(100000 + Math.random() * 900000)}</strong></div>
              <div>Status: <strong>Awaiting USSD PIN Confirmation...</strong></div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowEcoCashPrompt(false)}
                className="w-1/2 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 cursor-pointer"
              >
                Abort
              </button>
              <button
                type="button"
                onClick={handleConfirmEcoCashPrompt}
                className="w-1/2 py-2.5 rounded-xl bg-[#163784] hover:bg-[#102b67] text-white font-bold text-xs shadow-md cursor-pointer"
              >
                Approve (Simulate PIN)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
