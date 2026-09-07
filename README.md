# MEETSET V1

Responsive fan-event commerce prototype for J&Company.

## Product position

- **MEETSET** is the consumer-facing fan experience brand operated by **J&Company**.
- Projects can be held at **VASSMENT ONE** or an external venue.
- VASSMENT ONE is shown as a project venue, not as the core brand.
- Public funding metrics (goal amount, raised amount, achievement %, supporter spend) are intentionally removed.

## Implemented in this V1

- Responsive desktop/mobile home page
- Project browsing and category filters
- Project detail page
- GENERAL / VIP / VVIP ticket tiers
- Experience add-ons (Cheki, premium Cheki, photo session, 1:1 talk, voice message, signed photo)
- Demo checkout flow
- Demo QR ticket generation and `MY` ticket storage via localStorage
- Creator list
- Work with MEETSET / Host a Project lead form UI
- J&Company operator disclosure placeholders
- Mobile bottom navigation and drawer menu

## Not production-connected yet

- Real J&Company PG account
- Authentication / member database
- Order, refund and settlement backend
- CRM API for project proposals
- Admin project/P&L dashboard
- Production business registration / mail-order registration information
- Actual creator and event photography/content

## Run

No build step is required for this first UI prototype.

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

## Next implementation phase

1. Production project/creator content model
2. Order/payment adapter and refund rules
3. QR ticket validation/check-in API
4. J&Company admin dashboard
5. Project-level P&L / break-even / settlement
6. CRM lead ingestion
7. GA4 / ad pixel events

Branch: `feat/meetset-v1`
