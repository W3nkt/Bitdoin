-- Premium benefit: personal life consultation with the Bitdoin team over
-- WhatsApp (button on the member home, paid plans only).

update public.premium_plans
set features = array_append(features, 'Personal life consultation')
where slug in ('premium-monthly', 'premium-yearly')
  and not ('Personal life consultation' = any(features));
