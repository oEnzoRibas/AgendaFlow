-- Estabelecimento fictício. Defina owner_id e habilite public_booking após criar a conta.
insert into public.businesses(id, slug, name, description) values
('10000000-0000-4000-8000-000000000001', 'studio-bloom', 'Studio Bloom',
 'Salão de beleza especializado em cortes, finalização, cuidados com os fios e unhas.')
on conflict (id) do nothing;

insert into public.services(id, business_id, name, description, duration_minutes, price_cents) values
('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','Corte & styling','Corte personalizado, lavagem e finalização.',60,12000),
('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','Escova modeladora','Finalização com movimento e brilho.',45,7500),
('20000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000001','Hidratação profunda','Tratamento para maciez e revitalização dos fios.',60,15000),
('20000000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000001','Manicure','Cuidado das unhas e esmaltação.',45,5500)
on conflict (id) do nothing;

insert into public.professionals(id, business_id, name, specialty) values
('30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','Lia Martins','Corte e finalização'),
('30000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','Nina Rocha','Tratamentos capilares'),
('30000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000001','Bia Alves','Especialista em unhas')
on conflict (id) do nothing;

insert into public.professional_services(business_id, professional_id, service_id)
select p.business_id, p.id, s.id
from public.professionals p join public.services s on s.business_id = p.business_id
where (p.id::text, s.id::text) in (
  ('30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001'),
  ('30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000002'),
  ('30000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000002'),
  ('30000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000003'),
  ('30000000-0000-4000-8000-000000000003','20000000-0000-4000-8000-000000000004')
)
on conflict do nothing;

insert into public.availability_rules(business_id, professional_id, weekday, opens_at, closes_at)
select '10000000-0000-4000-8000-000000000001', workers.id, day,
  '09:00'::time, case when day = 6 then '16:00'::time else '18:00'::time end
from generate_series(1, 6) day
cross join (
  select id from public.professionals where business_id = '10000000-0000-4000-8000-000000000001'
  union all select null::uuid
) workers
on conflict do nothing;
