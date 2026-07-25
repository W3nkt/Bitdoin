-- The storefront cart is persisted locally in the browser and checkout uses
-- create_checkout_order(). Direct Data API access to these legacy cart tables
-- is therefore unnecessary.
--
-- The original carts_own policy allowed every cart with a non-null session_id,
-- without proving that the caller owned that session. Remove that access until
-- server-synchronized carts are deliberately implemented with hashed tokens.

begin;

drop policy if exists "carts_own" on public.carts;
drop policy if exists "cart_items_own" on public.cart_items;

revoke all privileges on table public.cart_items from anon, authenticated;
revoke all privileges on table public.carts from anon, authenticated;

-- Keep RLS as an additional default-deny boundary if table grants are changed
-- in a future migration.
alter table public.carts enable row level security;
alter table public.cart_items enable row level security;

commit;
