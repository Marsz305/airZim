/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Header } from './components/Header';
import { PublicSite } from './components/PublicSite';
import { FlightSearchEngine } from './components/FlightSearchEngine';
import { FlightSearchResults } from './components/FlightSearchResults';
import { PassengerManifestForm } from './components/PassengerManifestForm';
import { SeatMapEngine } from './components/SeatMapEngine';
import { PaymentAndCheckout } from './components/PaymentAndCheckout';
import { BookingConfirmation } from './components/BookingConfirmation';
import { ManageBookingPortal } from './components/ManageBookingPortal';
import { FlightStatusModal } from './components/FlightStatusModal';
import {
  BookingRecord,
  CabinClass,
  Currency,
  EmergencyContact,
  FareFamily,
  FlightSegment,
  PassengerDetails,
  PaymentMethod,
  SearchCriteria,
} from './types/ibe';
import { searchFlights, saveBooking, AIRPORTS } from './services/ibeApi';
import { computePricingBreakdown } from './utils/pricing';
import { generatePNR, generateTicketNumber } from './utils/pnr';
import { getBaggageAllowance, calculatePassengerBaggageFees } from './utils/baggage';
import { Sparkles, Phone, Mail, MapPin, ShieldCheck, Plane, CheckCircle2 } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'book' | 'manage' | 'checkin' | 'status'>('book');
  const [sitePage, setSitePage] = useState<string>(() => window.location.hash.replace(/^#\/?/, '') || 'home');
  const navigateSitePage = (page: string) => { setSitePage(page); window.history.pushState(null, '', `${window.location.pathname}${window.location.search}#/${page}`); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  useEffect(() => { const syncPage = () => setSitePage(window.location.hash.replace(/^#\/?/, '') || 'home'); window.addEventListener('hashchange', syncPage); return () => window.removeEventListener('hashchange', syncPage); }, []);
  const [currency, setCurrency] = useState<Currency>('USD');

  // Booking Flow Steps:
  // 1: Search Form
  // 2: Results & Fare Selection
  // 3: Passenger Manifest & Baggage
  // 4: Seat Map Selection
  // 5: Payment & Checkout
  // 6: Confirmation
  const [bookingStep, setBookingStep] = useState<number>(1);

  // Search State
  const [searchCriteria, setSearchCriteria] = useState<SearchCriteria | null>(null);
  const [segmentOptions, setSegmentOptions] = useState<FlightSegment[][]>([]);

  // Selected Segments & Fare Family
  const [selectedSegments, setSelectedSegments] = useState<
    { segment: FlightSegment; fareFamily: FareFamily }[]
  >([]);

  // Passenger Manifest State
  const [passengers, setPassengers] = useState<PassengerDetails[]>([]);
  const [emergencyContact, setEmergencyContact] = useState<EmergencyContact>({
    fullName: '',
    relationship: 'Spouse',
    phoneNumber: '',
    email: '',
  });

  // Seat Assignments: passengerId -> seatId (e.g. "14B")
  const [selectedSeats, setSelectedSeats] = useState<Record<string, string>>({});

  // Generated Confirmed Booking Record
  const [confirmedBooking, setConfirmedBooking] = useState<BookingRecord | null>(null);

  // Manage Booking Deep-Link state
  const [managePnr, setManagePnr] = useState<string>('');
  const [manageLastName, setManageLastName] = useState<string>('');
  const [manageSubTab, setManageSubTab] = useState<'tracking' | 'checkin' | 'upgrade' | 'cancel'>('tracking');

  // Flight Status Modal visibility
  const [showStatusModal, setShowStatusModal] = useState<boolean>(false);

  // Book Flight button resets and takes user straight back to Search Flight page
  const handleBookFlightClick = () => {
    setActiveTab('book');
    setBookingStep(1);
    setSitePage('home');
    window.history.pushState(null, '', `${window.location.pathname}${window.location.search}#/home`);
    // Wait for the homepage to render before scrolling to the flight-search section.
    window.setTimeout(() => {
      document.getElementById('home-flight-search')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  };

  const handlePerformSearch = (criteria: SearchCriteria) => {
    setSearchCriteria(criteria);
    setActiveTab('book');
    setSitePage('book');
    window.history.pushState(null, '', `${window.location.pathname}${window.location.search}#/book`);
    const results = searchFlights(criteria);
    setSegmentOptions(results);

    const initialPassengers: PassengerDetails[] = [];
    let pIdx = 0;

    for (let i = 0; i < criteria.passengers.adults; i++) {
      initialPassengers.push({
        id: `pax-adult-${i + 1}`,
        passengerIndex: pIdx++,
        type: 'adult',
        title: 'Mr',
        firstName: '',
        lastName: '',
        dateOfBirth: '',
        gender: 'male',
        nationality: 'Zimbabwean',
        passportNumber: '',
        passportExpiry: '',
        passportCountry: 'Zimbabwe',
        baggage: { checkedPieces: 1, extraWeightKg: 0 },
        selectedSeats: {},
      });
    }

    for (let i = 0; i < criteria.passengers.children; i++) {
      initialPassengers.push({
        id: `pax-child-${i + 1}`,
        passengerIndex: pIdx++,
        type: 'child',
        title: 'Master',
        firstName: '',
        lastName: '',
        dateOfBirth: '',
        gender: 'male',
        nationality: 'Zimbabwean',
        passportNumber: '',
        passportExpiry: '',
        passportCountry: 'Zimbabwe',
        baggage: { checkedPieces: 1, extraWeightKg: 0 },
        selectedSeats: {},
      });
    }

    for (let i = 0; i < criteria.passengers.infants; i++) {
      initialPassengers.push({
        id: `pax-infant-${i + 1}`,
        passengerIndex: pIdx++,
        type: 'infant',
        title: 'Master',
        firstName: '',
        lastName: '',
        dateOfBirth: '',
        gender: 'male',
        nationality: 'Zimbabwean',
        passportNumber: '',
        passportExpiry: '',
        passportCountry: 'Zimbabwe',
        baggage: { checkedPieces: 0, extraWeightKg: 0 },
        selectedSeats: {},
      });
    }

    setPassengers(initialPassengers);
    setSelectedSeats({});
    setBookingStep(2);
  };

  const handleSelectSegments = (
    chosen: { segment: FlightSegment; fareFamily: FareFamily }[]
  ) => {
    setSelectedSegments(chosen);

    const primaryFare = chosen[0]?.fareFamily || 'classic';
    const allowance = getBaggageAllowance(searchCriteria?.cabinClass || 'economy', primaryFare);

    setPassengers((prev) =>
      prev.map((p) => ({
        ...p,
        baggage: {
          checkedPieces: allowance.freeCheckedPieces,
          extraWeightKg: 0,
        },
      }))
    );

    setBookingStep(3);
  };

  const handleAssignSeat = (passengerId: string, seatId: string) => {
    setSelectedSeats((prev) => ({
      ...prev,
      [passengerId]: seatId,
    }));
  };

  const primarySeg = selectedSegments[0]?.segment;
  const primaryFareFamily = selectedSegments[0]?.fareFamily || 'classic';
  const cabinClass = searchCriteria?.cabinClass || 'economy';
  const basePriceUSD =
    primarySeg?.fares[cabinClass === 'business' ? 'business' : 'economy'][primaryFareFamily]
      ?.basePriceUSD || 150;

  const allowance = getBaggageAllowance(cabinClass, primaryFareFamily);
  const totalBaggageFeesUSD = passengers.reduce((sum, p) => {
    const calc = calculatePassengerBaggageFees(
      allowance,
      p.baggage?.checkedPieces || allowance.freeCheckedPieces,
      p.baggage?.extraWeightKg || 0
    );
    return sum + calc.totalBaggageFeeUSD;
  }, 0);

  const totalSeatFeesUSD = Object.entries(selectedSeats).reduce((sum, [_, sId]) => {
    const s = primarySeg?.seatMap.find((item) => item.id === sId);
    return sum + (s?.extraPriceUSD || 0);
  }, 0);

  const pricingBreakdown = computePricingBreakdown({
    basePriceUSD,
    passengers: searchCriteria?.passengers || { adults: 1, children: 0, infants: 0 },
    isInternational:
      primarySeg?.origin.country !== 'Zimbabwe' ||
      primarySeg?.destination.country !== 'Zimbabwe',
    segmentsCount: selectedSegments.length || 1,
    currency,
    ancillarySeatsUSD: totalSeatFeesUSD,
    ancillaryBaggageUSD: totalBaggageFeesUSD,
    promoCode: searchCriteria?.promoCode,
  });

  const handlePaymentSuccess = (paymentResult: {
    method: PaymentMethod;
    transactionReference: string;
    last4?: string;
    mobileNumber?: string;
  }) => {
    const pnr = generatePNR();
    const ticketNumber = generateTicketNumber();

    const finalizedPassengers = passengers.map((p) => ({
      ...p,
      selectedSeats: {
        [primarySeg?.id || 'SEG-1']: selectedSeats[p.id] || (cabinClass === 'business' ? '2A' : '14B'),
      },
    }));

    const newBooking: BookingRecord = {
      pnr,
      ticketNumber,
      bookingDate: new Date().toISOString(),
      status: 'CONFIRMED',
      cabinClass,
      fareFamily: primaryFareFamily,
      tripType: searchCriteria?.tripType || 'one-way',
      segments: selectedSegments.map((s) => s.segment),
      passengers: finalizedPassengers,
      emergencyContact,
      pricing: pricingBreakdown,
      payment: {
        method: paymentResult.method,
        transactionReference: paymentResult.transactionReference,
        paidAmountUSD: pricingBreakdown.totalUSD,
        currency,
        paidAt: new Date().toISOString(),
        last4: paymentResult.last4,
        mobileNumber: paymentResult.mobileNumber,
      },
    };

    saveBooking(newBooking);
    setConfirmedBooking(newBooking);
    setBookingStep(6);
  };

  const handleOpenDemoPnr = (pnr: string, lastName: string) => {
    setManagePnr(pnr);
    setManageLastName(lastName);
    setActiveTab('manage');
    setManageSubTab('tracking');
  };

  const handleGoToManageBooking = (pnr: string, lastName: string) => {
    setManagePnr(pnr);
    setManageLastName(lastName);
    setActiveTab('manage');
    setManageSubTab('tracking');
  };

  const handleGoToCheckIn = (pnr: string) => {
    setManagePnr(pnr);
    setActiveTab('checkin');
    setManageSubTab('checkin');
  };

  const handleBookRouteFromStatus = (originCode: string, destCode: string) => {
    const orig = AIRPORTS.find((a) => a.code === originCode) || AIRPORTS[0];
    const dest = AIRPORTS.find((a) => a.code === destCode) || AIRPORTS[1];

    handleBookFlightClick();
    handlePerformSearch({
      tripType: 'one-way',
      segments: [
        {
          origin: orig,
          destination: dest,
          departureDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
        },
      ],
      passengers: { adults: 1, children: 0, infants: 0 },
      cabinClass: 'economy',
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 selection:bg-[#163784] selection:text-white">
      {/* Official Header in #163784 & White */}
      <Header
        sitePage={sitePage}
        onNavigatePage={(page) => { navigateSitePage(page); if (page !== 'book') setActiveTab('book'); }}
        activeTab={activeTab === 'status' ? 'book' : activeTab}
        setActiveTab={(tab) => {
          if (tab === 'status') {
            setShowStatusModal(true);
          } else {
            setActiveTab(tab);
            if (tab === 'checkin') {
              setManageSubTab('checkin');
            }
          }
        }}
        onBookFlightClick={handleBookFlightClick}
        currency={currency}
        setCurrency={setCurrency}
        onOpenDemoPnr={handleOpenDemoPnr}
      />

      {/* Main Container */}
      <main className={sitePage === 'book' ? 'flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8' : 'flex-1'}>
        {sitePage !== 'book' ? <PublicSite page={sitePage} onBook={handleBookFlightClick} onNavigate={navigateSitePage} onSearch={handlePerformSearch} /> : <>
        {/* Step Progression Breadcrumb for Booking Flow in #163784 & White */}
        {activeTab === 'book' && bookingStep > 1 && bookingStep < 6 && (
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 overflow-x-auto pb-1 gap-2">
              <span
                onClick={handleBookFlightClick}
                className="hover:text-[#163784] cursor-pointer flex items-center gap-1.5 shrink-0"
              >
                <span className="w-5 h-5 rounded-full bg-blue-100 text-[#163784] flex items-center justify-center text-[10px]">
                  1
                </span>
                <span>Flight Search</span>
              </span>
              <span>➔</span>
              <span
                onClick={() => setBookingStep(2)}
                className={`flex items-center gap-1.5 shrink-0 cursor-pointer ${
                  bookingStep === 2 ? 'text-[#163784] font-black' : ''
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                    bookingStep >= 2 ? 'bg-[#163784] text-white' : 'bg-slate-100'
                  }`}
                >
                  2
                </span>
                <span>Fare Selection</span>
              </span>
              <span>➔</span>
              <span
                onClick={() => bookingStep >= 3 && setBookingStep(3)}
                className={`flex items-center gap-1.5 shrink-0 cursor-pointer ${
                  bookingStep === 3 ? 'text-[#163784] font-black' : ''
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                    bookingStep >= 3 ? 'bg-[#163784] text-white' : 'bg-slate-100'
                  }`}
                >
                  3
                </span>
                <span>Passenger Details & Bags</span>
              </span>
              <span>➔</span>
              <span
                onClick={() => bookingStep >= 4 && setBookingStep(4)}
                className={`flex items-center gap-1.5 shrink-0 cursor-pointer ${
                  bookingStep === 4 ? 'text-[#163784] font-black' : ''
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                    bookingStep >= 4 ? 'bg-[#163784] text-white' : 'bg-slate-100'
                  }`}
                >
                  4
                </span>
                <span>Cabin Seat Map</span>
              </span>
              <span>➔</span>
              <span
                className={`flex items-center gap-1.5 shrink-0 ${
                  bookingStep === 5 ? 'text-[#163784] font-black' : ''
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                    bookingStep === 5 ? 'bg-[#163784] text-white' : 'bg-slate-100'
                  }`}
                >
                  5
                </span>
                <span>Payment & Checkout</span>
              </span>
            </div>
          </div>
        )}

        {/* View Router */}
        {activeTab === 'book' ? (
          <>
            {/* Step 1: Search Form */}
            {bookingStep === 1 && (
              <div className="space-y-8">
                {/* Hero Feature Banner in #163784 and White */}
                <div className="relative rounded-3xl overflow-hidden bg-[#163784] text-white p-8 sm:p-12 shadow-xl border border-blue-900">
                  <div className="absolute right-0 top-0 bottom-0 w-1/2 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-400/20 via-transparent to-transparent pointer-events-none" />

                  <div className="max-w-2xl relative z-10 space-y-4">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/10 border border-white/20 text-blue-200 text-xs font-bold uppercase tracking-wider">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Direct Flights: Harare to London Gatwick & Regional Hubs</span>
                    </div>

                    <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
                      Experience Warm Zimbabwean Hospitality in the Skies
                    </h1>

                    <p className="text-sm sm:text-base text-blue-100 font-normal leading-relaxed">
                      Book scheduled domestic and international flights aboard Air Zimbabwe's flagship Boeing 767-200ER "Chimanimani" and Embraer ERJ-145 fleet. Transparent fares, free checked baggage, and instant e-ticket issuance.
                    </p>

                    <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 text-xs font-bold text-blue-200">
                      <span className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-white" />
                        <span>23kg Checked Bag Included</span>
                      </span>
                      <span className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-white" />
                        <span>Traditional Zimbabwean Dining</span>
                      </span>
                      <span className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-white" />
                        <span>0% Surcharge on Mobile Money</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Booking Engine Search Card */}
                <FlightSearchEngine
                  onSearch={handlePerformSearch}
                  initialCriteria={searchCriteria || undefined}
                />
              </div>
            )}

            {/* Step 2: Flight Results & Fare Selection */}
            {bookingStep === 2 && (
              <FlightSearchResults
                segmentOptions={segmentOptions}
                cabinClass={searchCriteria?.cabinClass || 'economy'}
                currency={currency}
                onSelectSegments={handleSelectSegments}
                onBackToSearch={handleBookFlightClick}
              />
            )}

            {/* Step 3: Passenger Details & Baggage Calculator */}
            {bookingStep === 3 && (
              <PassengerManifestForm
                passengers={passengers}
                onChangePassengers={setPassengers}
                emergencyContact={emergencyContact}
                onChangeEmergencyContact={setEmergencyContact}
                cabinClass={searchCriteria?.cabinClass || 'economy'}
                fareFamily={primaryFareFamily}
                currency={currency}
                departureDate={primarySeg?.departureDate || new Date().toISOString().split('T')[0]}
                onProceedToSeatMap={() => setBookingStep(4)}
                onBack={() => setBookingStep(2)}
              />
            )}

            {/* Step 4: Seat Map Selection Engine */}
            {bookingStep === 4 && primarySeg && (
              <SeatMapEngine
                segment={primarySeg}
                cabinClass={searchCriteria?.cabinClass || 'economy'}
                passengers={passengers}
                selectedSeats={selectedSeats}
                onSelectSeat={handleAssignSeat}
                currency={currency}
                onProceedToPayment={() => setBookingStep(5)}
                onBack={() => setBookingStep(3)}
              />
            )}

            {/* Step 5: Secure Payment & Checkout */}
            {bookingStep === 5 && (
              <PaymentAndCheckout
                pricing={pricingBreakdown}
                currency={currency}
                onPaymentSuccess={handlePaymentSuccess}
                onBack={() => setBookingStep(4)}
              />
            )}

            {/* Step 6: Confirmation & Boarding Pass */}
            {bookingStep === 6 && confirmedBooking && (
              <BookingConfirmation
                booking={confirmedBooking}
                currency={currency}
                onGoToManageBooking={handleGoToManageBooking}
                onGoToCheckIn={handleGoToCheckIn}
                onNewBooking={handleBookFlightClick}
              />
            )}
          </>
        ) : (
          <ManageBookingPortal
            initialPnr={managePnr}
            initialLastName={manageLastName}
            initialSubTab={activeTab === 'checkin' ? 'checkin' : manageSubTab}
            currency={currency}
          />
        )}
        </>}
      </main>

      {/* Flight Operations Status Modal */}
      {showStatusModal && (
        <FlightStatusModal
          onClose={() => setShowStatusModal(false)}
          onBookFlight={handleBookRouteFromStatus}
        />
      )}

      <footer className="az-site-footer">
        <div className="az-footer-inner">
          <div className="az-footer-brand">
            <button className="az-footer-logo" onClick={() => navigateSitePage('home')} aria-label="Air Zimbabwe home"><span className="az-footer-plane"><Plane size={23}/></span><span><strong>AIR ZIMBABWE</strong><small>THE WINGS OF ZIMBABWE</small></span></button>
            <p>Zimbabwean hospitality in the skies. Connecting people, places and possibilities.</p>
            <div className="az-footer-contact"><Phone size={14}/> +263 868 800 7438/39</div>
            <div className="az-footer-contact"><Mail size={14}/> reservations@airzimbabwe.aero</div>
          </div>
          <div className="az-footer-column"><h4>About us</h4><button onClick={() => navigateSitePage('about')}>About Us</button><button onClick={() => navigateSitePage('people')}>Our people</button><button onClick={() => navigateSitePage('vacancies')}>Vacancies</button><button onClick={() => navigateSitePage('procurement')}>Procurement Notices</button><button onClick={() => navigateSitePage('gallery')}>Gallery</button></div>
          <div className="az-footer-column"><h4>Help</h4><button onClick={() => navigateSitePage('faq')}>Help & FAQ</button><button onClick={() => navigateSitePage('travel')}>Travel information</button><button onClick={() => navigateSitePage('baggage')}>Baggage</button><button onClick={() => navigateSitePage('contact')}>Contact Us</button></div>
          <div className="az-footer-column"><h4>Book</h4><button onClick={handleBookFlightClick}>Search flights</button><button onClick={() => navigateSitePage('schedules')}>Flight Schedules</button><button onClick={() => navigateSitePage('promotions')}>Promotions</button><button onClick={() => { setActiveTab('checkin'); navigateSitePage('book'); }}>Online check-in</button><button onClick={() => { setActiveTab('manage'); navigateSitePage('book'); }}>Manage booking</button></div>
          <div className="az-footer-column"><h4>Training</h4><button onClick={() => navigateSitePage('training')}>Technical Training</button><button onClick={() => navigateSitePage('training')}>Commercial Training</button><button onClick={() => navigateSitePage('training')}>Ticketing Training</button><button onClick={() => navigateSitePage('charters')}>Charters</button></div>
          <div className="az-footer-column"><h4>Useful links</h4><button onClick={() => navigateSitePage('cargo')}>Cargo</button><button onClick={() => navigateSitePage('contact')}>Contact Us</button><button onClick={() => navigateSitePage('news')}>News & updates</button><button onClick={() => navigateSitePage('surveys')}>Customer surveys</button></div>
        </div>
        <div className="az-footer-bottom"><span>© 2026 Air Zimbabwe. All rights reserved.</span><div><button onClick={() => navigateSitePage('travel')}>Conditions of Carriage</button><button onClick={() => navigateSitePage('travel')}>Privacy Policy</button></div><span className="az-footer-credit">Zimbabwean hospitality in the skies</span></div>
      </footer>
    </div>
  );
}
