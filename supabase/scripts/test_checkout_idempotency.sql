-- Verifies create_checkout_order() is idempotent: calling it twice with the
-- same idempotency key should produce ONE order, not two. Uses a disposable
-- test order (fake name/phone/address) and deletes it at the end either way,
-- so it's safe to run against production. Paste the whole file and run it
-- once in the SQL Editor, then read the two SELECTs at the bottom.

create temporary table if not exists idempotency_test_result (
  test_key uuid,
  call_label text,
  order_id uuid,
  order_number text
);

do $$
declare
  v_book_id uuid;
  v_bookstore_id uuid;
  v_key uuid := gen_random_uuid();
  v_first jsonb;
  v_second jsonb;
begin
  select bp.book_id, bp.bookstore_id
    into v_book_id, v_bookstore_id
  from public.book_prices bp
  join public.books b on b.id = bp.book_id and b.is_active
  join public.bookstores bs on bs.id = bp.bookstore_id and bs.is_active
  where bp.availability <> 'OUT_OF_STOCK'
  limit 1;

  if v_book_id is null then
    raise exception 'No available book/bookstore price found to run the test with';
  end if;

  v_first := public.create_checkout_order(
    'Idempotency Test',
    '02099999999',
    '1234 Test Street, Test Village, Test District (automated idempotency test)',
    'automated idempotency test - safe to ignore',
    'LAK',
    'CASH_ON_DELIVERY',
    jsonb_build_array(jsonb_build_object('book_id', v_book_id, 'bookstore_id', v_bookstore_id, 'quantity', 1)),
    v_key
  );

  -- Same key, same everything: this call must NOT create a second order.
  v_second := public.create_checkout_order(
    'Idempotency Test',
    '02099999999',
    '1234 Test Street, Test Village, Test District (automated idempotency test)',
    'automated idempotency test - safe to ignore',
    'LAK',
    'CASH_ON_DELIVERY',
    jsonb_build_array(jsonb_build_object('book_id', v_book_id, 'bookstore_id', v_bookstore_id, 'quantity', 1)),
    v_key
  );

  insert into idempotency_test_result values
    (v_key, 'first_call',  (v_first->>'order_id')::uuid,  v_first->>'order_number'),
    (v_key, 'second_call', (v_second->>'order_id')::uuid, v_second->>'order_number');

  -- Clean up every order this test could have created for this key, whether
  -- the test passed (one order) or failed (two orders) — no debris either way.
  delete from public.payments where order_id in (select id from public.orders where idempotency_key = v_key);
  delete from public.order_items where order_id in (select id from public.orders where idempotency_key = v_key);
  delete from public.orders where idempotency_key = v_key;
end $$;

-- PASS looks like: both rows show the SAME order_id and order_number.
select * from idempotency_test_result;

-- PASS looks like: 0 (the do-block above already deleted the test order(s);
-- if idempotency were broken, an extra row could in theory survive if the
-- cleanup above didn't catch it — this is a belt-and-suspenders check).
select count(*) as leftover_test_orders
from public.orders
where idempotency_key in (select test_key from idempotency_test_result);
