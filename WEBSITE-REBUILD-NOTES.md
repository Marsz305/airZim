# Air Zimbabwe website structure update

This project now includes a public-facing multi-page website layer alongside the existing flight-booking prototype.

## Included
- Responsive navigation with expandable mega menus.
- Home page with hero, booking CTA, destination cards, service cards, story section, and news callout.
- Internal page views for About, Our People, Fleet, Destinations, Schedules, Baggage, Special Assistance, Travel Information, FAQ, News & Updates, Contact, Training, Vacancies, Procurement Notices, Cargo, Charters, Promotions, Rainbow Club, and Gallery.
- Hash-based navigation (`#/home`, `#/destinations`, `#/contact`, etc.) so views can be linked directly and browser history can navigate between pages.
- Existing flight search, fare selection, passenger details, seat map, payment demo, confirmation, manage booking, check-in, and status components remain in the project.

## Important integration notes
- Flight availability, ticketing, payment processing, check-in, and booking management must be connected to authorised production services before real customer use. Existing booking flows are a prototype and do not establish a live airline booking connection by themselves.
- Destination and hero photography currently uses externally hosted stock-image URLs. Replace these with Air Zimbabwe-owned or licensed media assets for a closer brand-accurate match and to avoid relying on third-party image hosting.
- The contact form is currently a frontend demo and needs a backend or approved form service before it can deliver messages.
