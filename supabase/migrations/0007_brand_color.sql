-- =============================================================================
-- 0007: Brand colour on the public checkout
--   * profiles.brand_color must be a "#RRGGBB" hex when set
--   * public_page_by_slug() exposes the seller's brand colour so the buyer
--     checkout can render in it (return type changes => drop + recreate)
-- =============================================================================

-- Normalise anything already stored, then enforce the format going forward.
update public.profiles
set brand_color = upper(brand_color)
where brand_color is not null and brand_color ~ '^#[0-9A-Fa-f]{6}$';

update public.profiles
set brand_color = null
where brand_color is not null and brand_color !~ '^#[0-9A-F]{6}$';

alter table public.profiles
  drop constraint if exists profiles_brand_color_hex;
alter table public.profiles
  add constraint profiles_brand_color_hex
  check (brand_color is null or brand_color ~ '^#[0-9A-F]{6}$');

drop function if exists public.public_page_by_slug(text);

create or replace function public.public_page_by_slug(page_slug text)
returns table (
  slug             text,
  title            text,
  type             text,
  price_kobo       bigint,
  currency         text,
  description      text,
  image_url        text,
  delivery_info    text,
  collect_fields   jsonb,
  customers_served integer,
  business_name    text,
  logo_url         text,
  brand_color      text
)
language sql
security definer
set search_path = public
stable
as $$
  select
    p.slug,
    p.title,
    p.type,
    p.price_kobo,
    p.currency,
    p.description,
    p.image_url,
    p.delivery_info,
    p.collect_fields,
    p.customers_served,
    pr.business_name,
    pr.logo_url,
    pr.brand_color
  from public.pages p
  join public.profiles pr on pr.id = p.user_id
  where p.slug = page_slug
    and p.is_active = true;
$$;

revoke all on function public.public_page_by_slug(text) from public;
grant execute on function public.public_page_by_slug(text) to anon, authenticated;
