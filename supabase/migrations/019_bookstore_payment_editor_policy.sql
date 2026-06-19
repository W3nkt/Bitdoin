-- Allow staff to correct a payment without replacing the original paid-by admin.
drop policy if exists "bookstore_payments_staff_update"
  on public.bookstore_payments;

create policy "bookstore_payments_staff_update"
  on public.bookstore_payments for update
  using (get_user_role() in ('ADMIN', 'OPERATIONS', 'FINANCE'))
  with check (get_user_role() in ('ADMIN', 'OPERATIONS', 'FINANCE'));
