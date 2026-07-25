-- Adds a Premium Yearly plan priced at 10x the current monthly price (2 months free),
-- and keeps it in sync automatically whenever the monthly plan's price changes.

insert into public.premium_plans (slug, name, description, price_lak, interval, features, is_active, sort_order)
select
  'premium-yearly',
  'Premium Yearly',
  monthly.description,
  monthly.price_lak * 10,
  'year',
  monthly.features,
  monthly.is_active,
  monthly.sort_order + 1
from public.premium_plans monthly
where monthly.slug = 'premium-monthly'
  and not exists (select 1 from public.premium_plans where slug = 'premium-yearly');

create or replace function public.sync_premium_yearly_price()
returns trigger
language plpgsql
as $$
begin
  if new.slug = 'premium-monthly' and new.price_lak is distinct from old.price_lak then
    update public.premium_plans
    set price_lak = new.price_lak * 10
    where slug = 'premium-yearly';
  end if;
  return new;
end;
$$;

drop trigger if exists premium_monthly_price_sync on public.premium_plans;
create trigger premium_monthly_price_sync
  after update on public.premium_plans
  for each row execute function public.sync_premium_yearly_price();
