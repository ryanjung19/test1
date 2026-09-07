# MEETSET V2

Premium fan-event commerce product for J&Company.

## Direction

MEETSET is not a venue-rental site. It is the consumer brand for fan meetings, photo events, live projects and showcases operated by J&Company. VASSMENT ONE is the primary Seoul venue, but each project can use another venue when appropriate.

## V2 architecture

This branch moves the prototype from static HTML/CSS/JS to a production-oriented Next.js stack and deliberately reuses open-source event-platform patterns rather than rebuilding common primitives from zero.

- Next.js 16 + React 19 + TypeScript
- Tailwind CSS 4
- Motion for React
- Radix UI primitives
- Lucide icons
- QR generation + html5-qrcode scanner dependency
- OpenLuma MIT-licensed architecture used as a reference for event/ticket/check-in flows

See `THIRD_PARTY_NOTICES.md` for attribution.

## Implemented in this V2 branch

- Editorial, high-end responsive homepage
- Animated navigation and mobile drawer
- Mobile bottom navigation
- Project gallery with motion and status states
- Project detail page
- GENERAL / VIP / VVIP ticket tiers
- Experience add-ons
- Live total calculation
- Mobile QR ticket wallet preview
- Creator/agency project inquiry page
- J&Company operating-entity positioning
- VASSMENT ONE modeled as a project venue rather than the MEETSET brand

## Next production connections

1. J&Company PG / Toss Payments adapter
2. Order + payment verification backend
3. Customer authentication and ticket persistence
4. Refund rules engine
5. QR validation/check-in API
6. Admin dashboard and project P&L
7. Creator contracts / settlement
8. CRM endpoint for project inquiries
9. Production photography and business/legal details

## Local run

```bash
npm install
npm run dev
```

Production build validation is handled by `.github/workflows/v2-build.yml`.

Branch: `feat/meetset-v2-openluma`
