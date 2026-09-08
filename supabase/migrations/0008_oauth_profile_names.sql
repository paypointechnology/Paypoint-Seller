-- =============================================================================
-- 0008: Profile names from OAuth providers
--   Google (and other OAuth providers) put the person's name in
--   raw_user_meta_data as given_name / family_name / full_name / name rather
--   than the first_name / last_name our email signup sends. Prefer ours,
--   fall back to the provider's, and split full_name as a last resort, so a
--   Google sign-up lands in the brand step with their name prefilled.
--   The avatar is deliberately NOT copied: a personal photo is not a business
--   logo, and the brand step asks for one explicitly.
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
begin
  first_nm := nullif(trim(coalesce(meta ->> 'first_name', meta ->> 'given_name')), '');
  last_nm  := nullif(trim(coalesce(meta ->> 'last_name',  meta ->> 'family_name')), '');

  if first_nm is null and full_nm is not null then
    first_nm := split_part(full_nm, ' ', 1);
    last_nm  := coalesce(last_nm, nullif(trim(substr(full_nm, length(first_nm) + 1)), ''));
  end if;

  insert into public.profiles (id, first_name, last_name, whatsapp, business_name, email_verified)
  values (
    new.id,
    first_nm,
    last_nm,
    meta ->> 'whatsapp',
    meta ->> 'business_name',
    coalesce((new.email_confirmed_at is not null), false)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
