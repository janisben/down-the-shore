# Down the Shore — Booking Request v1

This version:
- Shows Big Yellow House and Little Yellow Cottage.
- Saves public booking requests into the Supabase `reservations` table.
- Saves new requests with `status = pending`.
- Collects dates, guest name, email, phone, guest count, dogs, and dog names.
- Does not collect payment or generate a lease yet.

## Deploy to Vercel
Upload this ZIP/folder through the same Vercel Drop workflow used for the test site.
Make sure the files are at the root of the upload, with `index.html` directly visible.

## Test
1. Open a property.
2. Submit a booking request.
3. Confirm the green success message.
4. Open Supabase → Table Editor → reservations and verify the new row.
