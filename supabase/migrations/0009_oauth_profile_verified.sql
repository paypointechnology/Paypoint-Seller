-- =============================================================================
-- 0009: New-user trigger, complete version (supersedes 0008)
--   * names from OAuth metadata (given_name / family_name / full_name)
--   * email_verified true when the provider already verified the address
--     (Google sets raw_user_meta_data.email_verified = true) or Supabase has
--     confirmed it at insert time
-- =============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta      jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  full_nm   text  := nullif(trim(coalesce(meta ->> 'full_name', meta ->> 'name')), '');
  first_nm  text;
  last_nm   text;
  verified  boolean;
begin
  first_nm := nullif(trim(coalesce(meta ->> 'first_name', meta ->> 'given_name')), '');
  last_nm  := nullif(trim(coalesce(meta ->> 'last_name',  meta ->> 'family_name')), '');

  if first_nm is null and full_nm is not null then
    first_nm := split_part(full_nm, ' ', 1);
    last_nm  := coalesce(last_nm, nullif(trim(substr(full_nm, length(first_nm) + 1)), ''));
  end if;

  verified := (new.email_confirmed_at is not null)
           or coalesce((meta ->> 'email_verified')::boolean, false);

  insert into public.profiles (id, first_name, last_name, whatsapp, business_name, email_verified)
  values (
    new.id,
    first_nm,
    last_nm,
    meta ->> 'whatsapp',
    meta ->> 'business_name',
    verified
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Backfill any Google accounts created before this trigger was in place.
update public.profiles pr
set
  first_name = coalesce(pr.first_name, nullif(u.raw_user_meta_data ->> 'given_name', ''),
                        nullif(split_part(coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name', ''), ' ', 1), '')),
  last_name  = coalesce(pr.last_name,  nullif(u.raw_user_meta_data ->> 'family_name', '')),
  email_verified = pr.email_verified or u.email_confirmed_at is not null
from auth.users u
where u.id = pr.id
  and (pr.first_name is null or pr.email_verified = false);
