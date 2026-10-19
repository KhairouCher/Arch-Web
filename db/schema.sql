-- ArchPresent database schema, PostgreSQL.
--
-- STATUS: DRAFT. Loaded and tested in PGlite (an in-process PostgreSQL): 54 checks
-- on the ledger rules, buying (including the confirmed-email rule), refunds, receipts,
-- audit log, expiry jobs, the 1 GB photo limit and account deletion all pass. NOT yet run on a real server, and two simultaneous spends by one
-- user (the row lock in spend_points) cannot be tested in a single connection, so that
-- still needs a test on real PostgreSQL (tasks T-008, T-026). Class model:
-- docs/backend-model.json (Backend Model page).
--
-- Rules this schema enforces (Plan P-5.25, Blueprint B-02 and B-21):
--   * The points ledger only ever gets new rows. Rows cannot be changed or deleted.
--   * A balance is the sum of a user's ledger rows. It is never stored or edited.
--   * Only admins add points, and every change records who made it and why.
--   * A spend checks the balance and writes its ledger row in one step, and two
--     spends by the same user cannot run at the same time.
--   * A top-up records how it was paid (method and reference).
--   * Exports are unlimited for as long as the account exists. Deleting an account
--     removes the person's drafts, photos, purchases and exports but keeps the ledger
--     and receipts without personal details (delete_account below).
--
-- Only the application server connects to this database; the browser never does,
-- so there are no row-level access rules here.

-- Needs PostgreSQL 13 or later: gen_random_uuid() is built in, so no extension is needed.

-- ── People ───────────────────────────────────────────────────────────────────

create type user_role as enum ('buyer', 'admin', 'designer');

-- Every person is a user, whatever their audience (student, architect, bureau).
-- Sign-in is email and password, or Google. A person can have both.
create table profiles (
  id                 uuid primary key default gen_random_uuid(),
  email              text not null unique,
  display_name       text not null default '',
  role               user_role not null default 'buyer',
  language           text not null default 'fr' check (language in ('fr', 'ar', 'en')),
  password_hash      text,                            -- a slow hash (argon2 or bcrypt); never the password. Null for Google-only accounts
  google_subject     text unique,                     -- Google's stable id for the person, when they sign in with Google
  email_verified_at  timestamptz,
  created_at         timestamptz not null default now(),
  deleted_at         timestamptz,                     -- set by delete_account; the row stays so the ledger keeps its reference
  check (password_hash is not null or google_subject is not null or deleted_at is not null)
);

-- Single-use links sent by email: confirm an address, reset a password.
create type auth_token_purpose as enum ('verify_email', 'reset_password');

create table auth_tokens (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id) on delete cascade,
  purpose     auth_token_purpose not null,
  token_hash  text not null unique,                   -- only a hash is stored, never the token in the email
  expires_at  timestamptz not null,
  used_at     timestamptz,
  created_at  timestamptz not null default now()
);
create index auth_tokens_user_idx on auth_tokens (user_id, purpose);

-- ── Templates and models ─────────────────────────────────────────────────────

create type template_status as enum ('queued', 'converting', 'in_review', 'published', 'rejected', 'failed');

-- One page design, produced by the converter.
create table templates (
  id              text primary key,                  -- short name used in storage paths
  source_file     text not null,                     -- the PSD it came from
  canvas_width    int  not null check (canvas_width > 0),
  canvas_height   int  not null check (canvas_height > 0),
  schema_version  int  not null default 1,           -- version of the template.json format
  status          template_status not null default 'queued',
  full_prefix     text not null,                     -- folder of full-size files, private store, never sent to browsers
  preview_prefix  text,                              -- folder of preview files, public store
  uploaded_by     uuid references profiles(id),
  reviewed_by     uuid references profiles(id),
  reviewed_at     timestamptz,
  created_at      timestamptz not null default now()
);

create type model_tier as enum ('student', 'architect', 'bureau');

-- A presentation of several pages.
create table models (
  id            text primary key,
  name          text not null,
  tier          model_tier not null,
  price_points  int not null check (price_points >= 0),   -- set by the client, in points
  published     boolean not null default false,
  created_at    timestamptz not null default now()
);

create table model_pages (
  model_id     text not null references models(id) on delete cascade,
  position     int  not null check (position >= 1),
  name         text not null,
  template_id  text not null references templates(id),
  primary key (model_id, position)
);

-- ── Drafts ───────────────────────────────────────────────────────────────────

-- Edits only (text, photo position and fit, layer order), plus references to the
-- buyer's uploaded photos in storage. Deleted one month after the last save.
create table drafts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id) on delete cascade,
  model_id    text not null references models(id),
  title       text not null default '',
  state       jsonb not null,
  saved_at    timestamptz not null default now(),
  expires_at  timestamptz not null default (now() + interval '1 month')
);
create index drafts_user_idx on drafts (user_id, saved_at desc);
create index drafts_expiry_idx on drafts (expires_at);

create function drafts_touch() returns trigger language plpgsql as $$
begin
  new.saved_at   := now();
  new.expires_at := now() + interval '1 month';
  return new;
end;
$$;
create trigger drafts_touch before update on drafts for each row execute function drafts_touch();

-- A photo a buyer uploaded into a draft. Deleted with its draft.
create table photos (
  id            uuid primary key default gen_random_uuid(),
  draft_id      uuid not null references drafts(id) on delete cascade,
  storage_path  text not null,                        -- private store
  width         int  not null check (width > 0),      -- for the print-quality warning
  height        int  not null check (height > 0),
  size_bytes    bigint not null check (size_bytes >= 0),
  uploaded_at   timestamptz not null default now()
);
create index photos_draft_idx on photos (draft_id);

-- At most 1 GB of draft photos per user at first (Plan Open 8). Raise the number
-- here when real use shows it is too tight.
create function photos_quota() returns trigger language plpgsql as $$
declare
  v_user  uuid;
  v_total bigint;
begin
  select user_id into v_user from drafts where id = new.draft_id;
  select coalesce(sum(p.size_bytes), 0) into v_total
    from photos p join drafts d on d.id = p.draft_id where d.user_id = v_user;
  if v_total + new.size_bytes > 1073741824 then
    raise exception 'Photo storage limit reached: 1 GB per user.' using errcode = 'P0002';
  end if;
  return new;
end;
$$;
create trigger photos_quota_check before insert on photos for each row execute function photos_quota();

-- Called by a scheduled job. Returns the photo files to delete from storage too.
create function delete_expired_drafts() returns table (storage_path text) language sql as $$
  with gone as (delete from drafts where expires_at < now() returning id),
       files as (select p.storage_path from photos p join gone g on g.id = p.draft_id)
  select storage_path from files;
$$;

-- ── Points ───────────────────────────────────────────────────────────────────

create type ledger_kind as enum ('topup', 'purchase', 'adjustment');

-- How a top-up was paid. Said picks it by hand at first; 'online' is added by the
-- payment service when automatic payment exists (Plan Open: payment by card).
create type payment_method as enum ('cash', 'bank_transfer', 'ccp', 'baridimob_edahabia', 'other', 'online');

create table bundles (
  id         int generated always as identity primary key,
  name       text not null,
  price_da   numeric(12, 2) not null check (price_da > 0),   -- shown with .00
  points     int not null check (points > 0),                -- bigger bundles give more points per DA
  active     boolean not null default true
);

-- Append only. A positive amount adds points, a negative amount spends them.
create table ledger (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references profiles(id),
  kind        ledger_kind not null,
  amount      int not null check (amount <> 0),
  reason      text not null check (length(trim(reason)) > 0),
  payment_method     payment_method,                         -- a top-up always records how it was paid
  payment_reference  text,                                   -- receipt or transfer number, when there is one
  bundle_id   int references bundles(id),
  model_id    text references models(id),
  created_by  uuid references profiles(id),                  -- the admin, or the buyer for a purchase; null when an online payment creates it
  created_at  timestamptz not null default now(),
  check (kind <> 'topup' or amount > 0),
  check (kind <> 'topup' or payment_method is not null),
  check (kind = 'topup' or payment_method is null),
  check (kind <> 'purchase' or amount < 0),
  check (kind = 'purchase' or created_by is not null or payment_method = 'online')
);
create index ledger_user_idx on ledger (user_id, id);

create function ledger_append_only() returns trigger language plpgsql as $$
begin
  raise exception 'The points ledger can only be added to. Correct a mistake with an adjustment row.';
end;
$$;
create trigger ledger_no_update_delete before update or delete on ledger for each row execute function ledger_append_only();
create trigger ledger_no_truncate before truncate on ledger for each statement execute function ledger_append_only();

create view balances as
  select p.id as user_id, coalesce(sum(l.amount), 0)::int as points
  from profiles p left join ledger l on l.user_id = p.id
  group by p.id;

create function balance_of(p_user uuid) returns int language sql stable as $$
  select coalesce(sum(amount), 0)::int from ledger where user_id = p_user;
$$;

-- Admin adds points after an off-platform payment, or adjusts a balance (a refund
-- is a negative adjustment). The balance can never go below zero.
create function credit_points(
  p_admin uuid, p_user uuid, p_kind ledger_kind, p_amount int, p_reason text,
  p_bundle int default null, p_method payment_method default null, p_reference text default null
) returns bigint language plpgsql as $$
declare
  v_role user_role;
  v_new  int;
  v_id   bigint;
begin
  select role into v_role from profiles where id = p_admin;
  if v_role is distinct from 'admin' then
    raise exception 'Only an admin can change a points balance.';
  end if;
  if p_kind = 'purchase' then
    raise exception 'A purchase is made with spend_points, not credit_points.';
  end if;
  if p_kind = 'topup' and p_method is null then
    raise exception 'A top-up must record how it was paid.';
  end if;
  perform 1 from profiles where id = p_user for update;      -- one change at a time per user
  if not found then raise exception 'Unknown user.'; end if;
  v_new := balance_of(p_user) + p_amount;
  if v_new < 0 then
    raise exception 'This change would make the balance negative (%).', v_new;
  end if;
  insert into ledger (user_id, kind, amount, reason, payment_method, payment_reference, bundle_id, created_by)
  values (p_user, p_kind, p_amount, p_reason,
          case when p_kind = 'topup' then p_method end, p_reference, p_bundle, p_admin)
  returning id into v_id;
  return v_id;
end;
$$;

-- ── Purchases and exports ────────────────────────────────────────────────────

create table purchases (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references profiles(id),
  model_id         text not null references models(id),
  points_spent     int  not null check (points_spent >= 0),
  ledger_id        bigint not null unique references ledger(id),
  created_at       timestamptz not null default now(),          -- exports are unlimited, so there is no counter here
  unique (user_id, model_id)
);

-- The buyer presses Buy. Checks the balance, writes the ledger row and the purchase
-- in one step. Buying a model twice returns the first purchase and charges nothing.
create function spend_points(p_user uuid, p_model text) returns uuid language plpgsql as $$
declare
  v_price int;
  v_bal   int;
  v_ledger bigint;
  v_purchase uuid;
  v_verified timestamptz;
begin
  select email_verified_at into v_verified from profiles where id = p_user and deleted_at is null for update;   -- serializes this user's spends
  if not found then raise exception 'Unknown user.'; end if;

  select id into v_purchase from purchases where user_id = p_user and model_id = p_model;
  if found then return v_purchase; end if;

  if v_verified is null then
    raise exception 'Confirm your email address before buying.' using errcode = 'P0003';
  end if;

  select price_points into v_price from models where id = p_model and published;
  if not found then raise exception 'This model is not available.'; end if;

  v_bal := balance_of(p_user);
  if v_bal < v_price then
    raise exception 'Not enough points: % needed, % available.', v_price, v_bal using errcode = 'P0001';
  end if;

  insert into ledger (user_id, kind, amount, reason, model_id, created_by)
  values (p_user, 'purchase', -v_price, 'Bought model ' || p_model, p_model, p_user)
  returning id into v_ledger;

  insert into purchases (user_id, model_id, points_spent, ledger_id)
  values (p_user, p_model, v_price, v_ledger)
  returning id into v_purchase;
  return v_purchase;
end;
$$;

create type export_status as enum ('queued', 'rendering', 'ready', 'failed', 'expired');

create table exports (
  id            uuid primary key default gen_random_uuid(),
  purchase_id   uuid not null references purchases(id),
  user_id       uuid not null references profiles(id),
  draft_id      uuid references drafts(id) on delete set null,
  status        export_status not null default 'queued',
  storage_path  text,                                        -- the finished zip, private store
  size_bytes    bigint,
  error         text,
  created_at    timestamptz not null default now(),
  finished_at   timestamptz,
  expires_at    timestamptz                                  -- finished_at + 7 days; the zip is then removed and can be rendered again
);
create index exports_user_idx on exports (user_id, created_at desc);
create index exports_expiry_idx on exports (expires_at) where status = 'ready';

-- Called by a scheduled job. Marks old zips expired and returns the files to delete.
create function expire_old_exports() returns table (storage_path text) language sql as $$
  update exports set status = 'expired'
  where status = 'ready' and expires_at < now()
  returning storage_path;
$$;

-- ── Conversion queue ─────────────────────────────────────────────────────────

create type job_status as enum ('queued', 'running', 'done', 'failed');

create table conversion_jobs (
  id                 uuid primary key default gen_random_uuid(),
  template_id        text not null references templates(id),
  requested_by       uuid references profiles(id),
  status             job_status not null default 'queued',
  estimated_seconds  int not null default 900 check (estimated_seconds > 0),   -- about 15 minutes per model
  queued_at          timestamptz not null default now(),
  started_at         timestamptz,
  finished_at        timestamptz,
  error              text
);
create index conversion_jobs_queue_idx on conversion_jobs (status, queued_at);

-- When a job queued now would finish: all work already queued or running, plus its own.
create function expected_finish(p_own_seconds int default 900) returns timestamptz language sql stable as $$
  select now() + make_interval(secs => coalesce(sum(estimated_seconds), 0) + p_own_seconds)
  from conversion_jobs where status in ('queued', 'running');
$$;

-- ── Receipts, audit and account deletion ─────────────────────────────────────

-- Each email the platform sends about points, so an admin can see a receipt that
-- never arrived and resend it.
create table email_receipts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles(id) on delete cascade,
  kind       text not null check (kind in ('topup', 'purchase')),
  ledger_id  bigint not null references ledger(id),
  status     text not null check (status in ('sent', 'failed')),
  sent_at    timestamptz not null default now()
);
create index email_receipts_ledger_idx on email_receipts (ledger_id);

-- What admins did apart from points (the ledger covers points): approvals,
-- publishing, role changes. Append only.
create table audit_events (
  id           bigint generated always as identity primary key,
  actor_id     uuid not null references profiles(id),
  action       text not null,                                -- template_approved, model_published, role_changed ...
  target_type  text not null,
  target_id    text not null,
  detail       text not null default '',
  created_at   timestamptz not null default now()
);

create function audit_append_only() returns trigger language plpgsql as $$
begin
  raise exception 'The audit log can only be added to.';
end;
$$;
create trigger audit_no_update_delete before update or delete on audit_events for each row execute function audit_append_only();
create trigger audit_no_truncate before truncate on audit_events for each statement execute function audit_append_only();

-- A person deletes their account. Their drafts, photos, purchases, exports, receipts
-- and sign-in links are removed. The profile row stays, emptied of personal details,
-- so the ledger and audit log keep a valid reference. Returns the files to delete
-- from storage (photos and export zips).
create function delete_account(p_user uuid) returns table (storage_path text) language plpgsql as $$
begin
  perform 1 from profiles where id = p_user and deleted_at is null for update;
  if not found then raise exception 'Unknown or already deleted user.'; end if;

  return query
    select ph.storage_path from photos ph join drafts d on d.id = ph.draft_id where d.user_id = p_user
    union all
    select e.storage_path from exports e where e.user_id = p_user and e.storage_path is not null;

  delete from exports        where user_id = p_user;
  delete from drafts         where user_id = p_user;          -- photos go with their drafts
  delete from email_receipts where user_id = p_user;
  delete from auth_tokens    where user_id = p_user;
  delete from purchases      where user_id = p_user;          -- the ledger rows stay

  update profiles
     set email = 'deleted-' || id || '@deleted.invalid',
         display_name = '', password_hash = null, google_subject = null,
         email_verified_at = null, role = 'buyer', deleted_at = now()
   where id = p_user;
end;
$$;
