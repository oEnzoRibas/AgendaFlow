create schema if not exists extensions;
create extension if not exists btree_gist with schema extensions;
set search_path = public, extensions;

create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete set null,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (length(btrim(name)) between 2 and 100),
  description text not null default '' check (length(description) <= 500),
  timezone text not null default 'America/Sao_Paulo',
  buffer_minutes int not null default 0 check (buffer_minutes between 0 and 120),
  public_booking boolean not null default false
);
create index businesses_owner_idx on public.businesses(owner_id);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null check (length(btrim(name)) between 2 and 100),
  description text not null default '' check (length(description) <= 500),
  duration_minutes int not null check (duration_minutes between 5 and 480),
  price_cents int not null check (price_cents between 0 and 10000000),
  active boolean not null default true,
  unique (business_id, id)
);

create table public.professionals (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null check (length(btrim(name)) between 2 and 100),
  specialty text not null default '' check (length(specialty) <= 100),
  active boolean not null default true,
  unique (business_id, id)
);

create table public.professional_services (
  business_id uuid not null references public.businesses(id) on delete cascade,
  professional_id uuid not null,
  service_id uuid not null,
  primary key (business_id, professional_id, service_id),
  foreign key (business_id, professional_id) references public.professionals(business_id, id) on delete cascade,
  foreign key (business_id, service_id) references public.services(business_id, id) on delete cascade
);
create index professional_services_service_idx on public.professional_services(business_id, service_id);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null check (length(btrim(name)) between 2 and 100),
  email text not null check (length(email) <= 254 and email = lower(btrim(email)) and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  phone text not null check (length(phone) <= 24 and length(regexp_replace(phone, '[^0-9]', '', 'g')) between 10 and 15),
  unique (business_id, id),
  unique (business_id, email)
);

create table public.availability_rules (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  professional_id uuid,
  weekday int not null check (weekday between 0 and 6),
  opens_at time not null check (opens_at < '24:00' and extract(second from opens_at) = 0),
  closes_at time not null check (closes_at < '24:00' and extract(second from closes_at) = 0),
  check (opens_at < closes_at),
  unique nulls not distinct (business_id, professional_id, weekday),
  foreign key (business_id, professional_id) references public.professionals(business_id, id) on delete cascade
);

create table public.blocked_periods (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  professional_id uuid not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text not null default '' check (length(reason) <= 100),
  check (isfinite(starts_at) and isfinite(ends_at) and starts_at < ends_at),
  foreign key (business_id, professional_id) references public.professionals(business_id, id) on delete cascade
);
create index blocked_periods_professional_idx on public.blocked_periods(business_id, professional_id, starts_at);

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  professional_id uuid not null,
  service_id uuid not null,
  client_id uuid not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  busy_until timestamptz not null,
  price_cents int not null check (price_cents >= 0),
  status text not null default 'confirmed' check (status in ('confirmed', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  check (isfinite(starts_at) and isfinite(busy_until) and starts_at < ends_at and ends_at <= busy_until),
  foreign key (business_id, professional_id) references public.professionals(business_id, id),
  foreign key (business_id, service_id) references public.services(business_id, id),
  foreign key (business_id, client_id) references public.clients(business_id, id),
  exclude using gist (professional_id with =, tstzrange(starts_at, busy_until, '[)') with &&)
    where (status <> 'cancelled')
);
create index appointments_agenda_idx on public.appointments(business_id, starts_at);
create index appointments_client_idx on public.appointments(business_id, client_id, starts_at);
create index appointments_service_idx on public.appointments(business_id, service_id);

create function public.validate_business_timezone() returns trigger
language plpgsql set search_path = '' as $$
begin
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = new.timezone) then
    raise exception 'Fuso horário inválido.' using errcode = '22023';
  end if;
  return new;
end $$;
create trigger businesses_timezone before insert or update of timezone on public.businesses
for each row execute function public.validate_business_timezone();

alter table public.businesses enable row level security;
create policy owner_read on public.businesses for select to authenticated
  using (owner_id = (select auth.uid()));
revoke all on public.businesses from anon, authenticated;
grant select on public.businesses to authenticated;

do $$
declare
  relation text;
begin
  foreach relation in array array['services', 'professionals', 'professional_services', 'clients',
    'availability_rules', 'blocked_periods', 'appointments'] loop
    execute format('alter table public.%I enable row level security', relation);
    execute format('revoke all on public.%I from anon, authenticated', relation);
    execute format('grant select on public.%I to authenticated', relation);
    execute format('create policy owner_read on public.%I for select to authenticated using (
      business_id in (select id from public.businesses where owner_id = (select auth.uid()))
    )', relation);
  end loop;
end $$;

create function public.booking_catalog(p_slug text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'business', jsonb_build_object('id', b.id, 'slug', b.slug, 'name', b.name,
      'description', b.description, 'timezone', b.timezone, 'buffer_minutes', b.buffer_minutes,
      'public_booking', b.public_booking),
    'services', coalesce((select jsonb_agg(to_jsonb(s) order by s.name)
      from public.services s where s.business_id = b.id and s.active), '[]'::jsonb),
    'professionals', coalesce((select jsonb_agg(to_jsonb(p) order by p.name)
      from public.professionals p where p.business_id = b.id and p.active), '[]'::jsonb),
    'professional_services', coalesce((select jsonb_agg(to_jsonb(ps))
      from public.professional_services ps
      join public.professionals p on p.id = ps.professional_id and p.active
      join public.services s on s.id = ps.service_id and s.active
      where ps.business_id = b.id), '[]'::jsonb)
  )
  from public.businesses b where b.slug = p_slug and b.public_booking;
$$;

create function public.available_slots(
  p_slug text, p_service uuid, p_professional uuid, p_day date, p_ignore uuid default null
) returns table (starts_at timestamptz, ends_at timestamptz, busy_until timestamptz, price_cents int)
language sql stable security definer set search_path = '' as $$
  select slot.start_at, slot.start_at + timing.duration,
    slot.start_at + timing.duration + timing.buffer, s.price_cents
  from public.businesses b
  join public.services s on s.business_id = b.id and s.id = p_service and s.active
  join public.professional_services ps on ps.business_id = b.id and ps.service_id = s.id
  join public.professionals p on p.id = ps.professional_id and p.id = p_professional and p.active
  join public.availability_rules office on office.business_id = b.id and office.professional_id is null
    and office.weekday = extract(dow from p_day)
  join public.availability_rules shift on shift.business_id = b.id and shift.professional_id = p.id
    and shift.weekday = office.weekday
  cross join lateral (select make_interval(mins => s.duration_minutes) as duration,
    make_interval(mins => b.buffer_minutes) as buffer) timing
  cross join lateral generate_series(
    (p_day + greatest(office.opens_at, shift.opens_at)) at time zone b.timezone,
    ((p_day + least(office.closes_at, shift.closes_at)) at time zone b.timezone) - timing.duration,
    interval '15 minutes'
  ) slot(start_at)
  where b.slug = p_slug
    and (b.public_booking or coalesce(b.owner_id = (select auth.uid()), false))
    and (p_ignore is null or b.owner_id = (select auth.uid()))
    and p_day between (now() at time zone b.timezone)::date and (now() at time zone b.timezone)::date + 60
    and slot.start_at > now()
    and not exists (
      select 1 from public.appointments a where a.professional_id = p.id and a.status <> 'cancelled'
      and (p_ignore is null or a.id <> p_ignore)
      and tstzrange(a.starts_at, a.busy_until, '[)') &&
        tstzrange(slot.start_at, slot.start_at + timing.duration + timing.buffer, '[)')
    )
    and not exists (
      select 1 from public.blocked_periods bp where bp.business_id = b.id and bp.professional_id = p.id
      and bp.starts_at < slot.start_at + timing.duration + timing.buffer and bp.ends_at > slot.start_at
    )
  order by slot.start_at;
$$;

create function public.create_booking(
  p_slug text, p_service uuid, p_professional uuid, p_start timestamptz,
  p_name text, p_email text, p_phone text
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  venue public.businesses;
  slot record;
  customer_id uuid;
  booking public.appointments;
begin
  select * into venue from public.businesses where slug = p_slug and public_booking for update;
  if not found then raise exception 'Agendamento online indisponível.' using errcode = '22023'; end if;
  select * into slot from public.available_slots(p_slug, p_service, p_professional,
    (p_start at time zone venue.timezone)::date) s where s.starts_at = p_start;
  if not found or p_start <= clock_timestamp() then
    raise exception 'Esse horário não está mais disponível.' using errcode = '23P01';
  end if;
  if p_name is null or length(btrim(p_name)) not between 2 and 100 or p_email is null
    or length(p_email) > 254 or lower(btrim(p_email)) !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    or p_phone is null or length(p_phone) > 24 or p_phone !~ '^[0-9+() .-]+$'
    or length(regexp_replace(p_phone, '[^0-9]', '', 'g')) not between 10 and 15 then
    raise exception 'Confira os dados de contato.' using errcode = '22023';
  end if;
  insert into public.clients(business_id, name, email, phone)
    values (venue.id, btrim(p_name), lower(btrim(p_email)), btrim(p_phone))
    on conflict (business_id, email) do nothing returning id into customer_id;
  if customer_id is null then
    select id into customer_id from public.clients where business_id = venue.id and email = lower(btrim(p_email));
  end if;
  insert into public.appointments(business_id, professional_id, service_id, client_id,
    starts_at, ends_at, busy_until, price_cents)
    values (venue.id, p_professional, p_service, customer_id, p_start, slot.ends_at, slot.busy_until, slot.price_cents)
    returning * into booking;
  return jsonb_build_object('id', booking.id, 'starts_at', booking.starts_at,
    'ends_at', booking.ends_at, 'price_cents', booking.price_cents);
end $$;

create function public.manage_agenda(p_business uuid, p_action text, p_data jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare
  venue public.businesses;
  booking public.appointments;
  record_id uuid := coalesce((p_data->>'id')::uuid, gen_random_uuid());
  start_time timestamptz;
  end_time timestamptz;
  slot record;
begin
  select * into venue from public.businesses
    where id = p_business and owner_id = (select auth.uid()) for update;
  if not found then raise exception 'Acesso restrito.' using errcode = '42501'; end if;

  case p_action
  when 'service' then
    insert into public.services(id, business_id, name, description, price_cents, duration_minutes, active)
    values (record_id, venue.id, btrim(p_data->>'name'), p_data->>'description',
      (p_data->>'price_cents')::int, (p_data->>'duration_minutes')::int, (p_data->>'active')::boolean)
    on conflict (business_id, id) do update set name = excluded.name, description = excluded.description,
      price_cents = excluded.price_cents, duration_minutes = excluded.duration_minutes, active = excluded.active;
  when 'client' then
    insert into public.clients(id, business_id, name, email, phone)
    values (record_id, venue.id, btrim(p_data->>'name'), lower(btrim(p_data->>'email')), btrim(p_data->>'phone'))
    on conflict (business_id, id) do update set name = excluded.name, email = excluded.email, phone = excluded.phone;
  when 'professional' then
    insert into public.professionals(id, business_id, name, specialty, active)
    values (record_id, venue.id, btrim(p_data->>'name'), p_data->>'specialty', (p_data->>'active')::boolean)
    on conflict (business_id, id) do update set name = excluded.name, specialty = excluded.specialty, active = excluded.active;
    delete from public.professional_services where business_id = venue.id and professional_id = record_id;
    insert into public.professional_services(business_id, professional_id, service_id)
      select venue.id, record_id, value::uuid from jsonb_array_elements_text(p_data->'service_ids');
    delete from public.availability_rules where business_id = venue.id and professional_id = record_id;
    insert into public.availability_rules(business_id, professional_id, weekday, opens_at, closes_at)
      select venue.id, record_id, weekday, opens_at, closes_at
      from jsonb_to_recordset(p_data->'hours') as h(weekday int, opens_at time, closes_at time);
  when 'settings' then
    update public.businesses set name = btrim(p_data->>'name'), description = p_data->>'description',
      timezone = p_data->>'timezone', buffer_minutes = (p_data->>'buffer_minutes')::int,
      public_booking = (p_data->>'public_booking')::boolean where id = venue.id;
    delete from public.availability_rules where business_id = venue.id and professional_id is null;
    insert into public.availability_rules(business_id, weekday, opens_at, closes_at)
      select venue.id, weekday, opens_at, closes_at
      from jsonb_to_recordset(p_data->'hours') as h(weekday int, opens_at time, closes_at time);
  when 'block' then
    start_time := (p_data->>'starts_at')::timestamptz;
    end_time := (p_data->>'ends_at')::timestamptz;
    if not isfinite(start_time) or not isfinite(end_time) or start_time <= clock_timestamp()
      or end_time <= start_time then
      raise exception 'Informe um período futuro válido.' using errcode = '22023';
    end if;
    if exists (select 1 from public.appointments where business_id = venue.id
      and professional_id = (p_data->>'professional_id')::uuid and status <> 'cancelled'
      and starts_at < end_time and busy_until > start_time) then
      raise exception 'O bloqueio coincide com um agendamento.' using errcode = '23P01';
    end if;
    insert into public.blocked_periods(business_id, professional_id, starts_at, ends_at, reason)
      values (venue.id, (p_data->>'professional_id')::uuid, start_time, end_time, p_data->>'reason');
  when 'unblock' then
    delete from public.blocked_periods where business_id = venue.id and id = record_id;
  when 'appointment' then
    select * into booking from public.appointments where business_id = venue.id and id = record_id;
    if not found or booking.status <> 'confirmed' then
      raise exception 'Agendamento indisponível para alteração.' using errcode = '22023';
    end if;
    if p_data->>'operation' = 'reschedule' then
      start_time := (p_data->>'starts_at')::timestamptz;
      select * into slot from public.available_slots(venue.slug, booking.service_id, booking.professional_id,
        (start_time at time zone venue.timezone)::date, booking.id) s where s.starts_at = start_time;
      if not found or start_time <= clock_timestamp() then
        raise exception 'Esse horário não está mais disponível.' using errcode = '23P01';
      end if;
      update public.appointments set starts_at = start_time, ends_at = slot.ends_at, busy_until = slot.busy_until
        where id = booking.id;
    elsif p_data->>'operation' in ('cancelled', 'completed') then
      if p_data->>'operation' = 'completed' and booking.starts_at > clock_timestamp() then
        raise exception 'O atendimento ainda não começou.' using errcode = '22023';
      end if;
      update public.appointments set status = p_data->>'operation' where id = booking.id;
    else
      raise exception 'Operação inválida.' using errcode = '22023';
    end if;
  else
    raise exception 'Operação inválida.' using errcode = '22023';
  end case;
end $$;

revoke all on function public.validate_business_timezone() from public, anon, authenticated;
revoke all on function public.booking_catalog(text) from public, anon, authenticated;
revoke all on function public.available_slots(text, uuid, uuid, date, uuid) from public, anon, authenticated;
revoke all on function public.create_booking(text, uuid, uuid, timestamptz, text, text, text) from public, anon, authenticated;
revoke all on function public.manage_agenda(uuid, text, jsonb) from public, anon, authenticated;
grant execute on function public.booking_catalog(text),
  public.available_slots(text, uuid, uuid, date, uuid),
  public.create_booking(text, uuid, uuid, timestamptz, text, text, text) to anon, authenticated;
grant execute on function public.manage_agenda(uuid, text, jsonb) to authenticated;
