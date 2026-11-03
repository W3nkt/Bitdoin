# PhaJay BCEL One QR payments

Customers pay a **dynamic BCEL One QR for the exact amount owed**, and the order, membership or report is
marked paid by itself. It covers three things:

| What | Who pays | Applied like |
|---|---|---|
| Bookstore order | whoever has the order number and phone | the admin's **Verify** button on Payments |
| Academy Premium plan | the signed-in member | the admin's **Approve** on Requests to review (a yearly plan lasts a year) |
| Career report (one-time) | the signed-in buyer | Finance's **Verify** (grants `career_report` for the months the price setting says) |

Kip only: a dollar order keeps the bank-transfer QR and receipt upload. BCEL One only for now; anyone who
cannot use it taps "Pay by bank transfer or with another bank instead" and gets the fixed QR as before.

## How it works

```
payment screen ──start/check──▶ Edge Function phajay-checkout ──▶ PhaJay (makes the QR, answers "paid yet?")
PhaJay ───────webhook────────▶ Edge Function phajay-webhook
                                      both end in  phajay_settle()  (SQL, migration 172)
```

- The amount comes from the database, never from the browser. The member comes from their sign-in token; an
  order is identified by order number + phone (as the tracking page does).
- A payment is applied only for a QR this shop made, at the amount it asked for, **once**. Anything else
  (wrong amount, order cancelled meanwhile, paid another way) is *not* applied and is logged.
- Both paths exist on purpose: the open payment screen asks every 4 seconds, and the webhook covers a customer
  who paid and closed the page.
- The PhaJay key lives only in Supabase secrets. The website never holds it.

## Going live (one time)

1. **Secrets** (Supabase dashboard → Edge Functions → Secrets). Paste the value of `PHAJAY_API_KEY_REAL`
   from your `.env` as **`PHAJAY_API_KEY`**. Paste it in the dashboard rather than the CLI: it contains `$`.
   `PHAJAY_WEBHOOK_SECRET` is optional; set it only if the PhaJay portal shows a separate webhook secret.
   `ALLOWED_ORIGINS` is already set for the other guest functions.
2. **Release.** Commit and push (the site deploys from `main`). Then run the **Supabase migrations and
   functions** workflow for `production`: first a dry run, then with *Apply* ticked and
   functions = `phajay-checkout phajay-webhook`. The dry run must list `172_phajay_payments.sql` and
   nothing unexpected. It needs the Premium migrations (036 to 041, 072) and the career report (157),
   which production already has.
3. **Webhook.** PhaJay portal → Settings → Webhook:
   `https://bzyvzftnfuuxcseuqrnj.supabase.co/functions/v1/phajay-webhook`
4. **One real test** with a small order, paid from BCEL One: the screen should change to paid within seconds
   and the order show *Processing* / payment *Verified*. Then close the page right after scanning on a
   second order to prove the webhook path: the order must still become paid. If it does not, look at the
   `phajay-webhook` logs: `signature does not match` means PhaJay signs with a different secret, so set
   `PHAJAY_WEBHOOK_SECRET` to the one the portal shows. (The screen path keeps working meanwhile.)

Order of steps 1 and 2 does not matter for customers: until `PHAJAY_API_KEY` exists, or until the function is
deployed, every payment screen falls back to the fixed QR by itself.

## Switching off

Delete the `PHAJAY_API_KEY` secret. Payment screens fall back to the fixed QR on their next load; no release.

## Money in but not applied

`PHAJAY_PAYMENT_UNAPPLIED` rows in `audit_logs` (and `note` on the transaction) mean PhaJay confirmed a
payment that could not be applied: refund it, or fix the order by hand.

```sql
select t.created_at, t.kind, t.subject_id, t.transaction_id, t.amount, t.note
from phajay_transactions t where t.note is not null order by t.created_at desc;
```

Reasons: `amount_mismatch` (PhaJay's amount is not what the QR was made for), `order_changed` (the total moved
after the QR was made), `order_not_payable` (cancelled or withdrawn meanwhile, or already paid by hand).

QRs that were scanned but never confirmed (PhaJay down, webhook not delivered) show as still waiting:

```sql
select created_at, kind, subject_id, transaction_id, amount
from phajay_transactions where status = 'WAITING' and created_at < now() - interval '1 hour';
```

Opening the order's payment screen settles it if PhaJay has the payment.

## Tests

`npm run test:phajay` runs the SQL and flow tests (the real migration on PGlite, the real function code, a fake
PhaJay); `npm run test:db`, which CI runs, includes them. `npm run test:e2e` covers the career report screen
with a fake function. The function code type-checks with
`deno check supabase/functions/phajay-checkout/index.ts supabase/functions/phajay-webhook/index.ts`.
Not covered by any automated test: PhaJay itself. The first real payment is the real test.

## Not covered

- BCEL One only. Other Lao banks need their own QR endpoint (LDB, JDB, ... all pay from any Lao bank app).
- No "payment received" email to the admin. Paid orders show as *Processing* in the admin lists.
- Refunds are made in the PhaJay portal and the order or membership adjusted by hand.
