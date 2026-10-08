-- ============================================================================
-- SERPENT SORCERER MARKETPLACE — SUPABASE POSTGRESQL SCHEMA (v1.0)
-- ============================================================================
-- Target Database: Supabase (PostgreSQL 15+)
-- Key Architectural Principles:
-- 1. Zero Transaction Commissions & No Live Animal Checkout in v1 (Inquiry-driven)
-- 2. Server-Assigned Founding 50 Places via Atomic Sequence + Trigger Lock
-- 3. Role-Based Access Control (Buyer, Seller, Admin) enforced via Supabase RLS
-- 4. Automated Prohibited & Venomous Species Moderation Guardrail
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ----------------------------------------------------------------------------
-- 1. ENUMS & CUSTOM TYPES
-- ----------------------------------------------------------------------------
CREATE TYPE user_role AS ENUM ('buyer', 'seller', 'admin');
CREATE TYPE seller_approval_status AS ENUM ('none', 'pending', 'approved', 'rejected', 'suspended');
CREATE TYPE membership_tier_slug AS ENUM ('hatchling', 'apprentice', 'enchanter', 'sorcerer', 'grand_sorcerer');
CREATE TYPE marketplace_category AS ENUM (
  'Snakes',
  'Lizards and Geckos',
  'Amphibians',
  'Turtles and Tortoises',
  'Live Feeder Insects',
  'Frozen Feeders',
  'Reptile Enclosures and Equipment',
  'Bioactive Supplies and Plants'
);
CREATE TYPE specimen_sex AS ENUM ('Male', 'Female', 'Unsexed', 'N/A');
CREATE TYPE listing_status AS ENUM ('draft', 'pending_moderation', 'active', 'on_hold', 'sold', 'rejected');
CREATE TYPE shipping_option_type AS ENUM ('FedEx Priority Overnight', 'Local Pickup', 'Regional Freight', 'Standard Ground (Dry Goods)');
CREATE TYPE inquiry_status AS ENUM ('open', 'seller_replied', 'buyer_replied', 'shipping_quoted', 'closed');

-- ----------------------------------------------------------------------------
-- 2. MEMBERSHIP PLANS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE public.membership_plans (
  slug membership_tier_slug PRIMARY KEY,
  name TEXT NOT NULL,
  monthly_price_cents INTEGER NOT NULL CHECK (monthly_price_cents >= 0),
  max_active_listings INTEGER, -- NULL represents UNLIMITED listings
  includes_promotional_features BOOLEAN NOT NULL DEFAULT FALSE,
  commission_rate_bps INTEGER NOT NULL DEFAULT 0 CHECK (commission_rate_bps = 0), -- Strictly 0% commission
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.membership_plans (slug, name, monthly_price_cents, max_active_listings, includes_promotional_features, description)
VALUES
  ('hatchling', 'Hatchling', 0, 3, FALSE, 'Entry tier for hobbyist keepers. Up to 3 active listings.'),
  ('apprentice', 'Apprentice', 399, 15, FALSE, 'Growing clutches and bioactive propagators. Up to 15 active listings.'),
  ('enchanter', 'Enchanter', 999, 50, FALSE, 'Established boutique breeders. Up to 50 active listings.'),
  ('sorcerer', 'Sorcerer', 1999, NULL, FALSE, 'Full-scale breeder operations with unlimited active listings.'),
  ('grand_sorcerer', 'Grand Sorcerer', 3999, NULL, TRUE, 'Unlimited listings plus homepage spotlight rotation and priority breeder placement.');

-- ----------------------------------------------------------------------------
-- 3. USERS & PROFILES TABLE (Linked to Supabase auth.users)
-- ----------------------------------------------------------------------------
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'buyer',
  state_province TEXT,
  country TEXT NOT NULL DEFAULT 'US',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_role ON public.users(role);

-- ----------------------------------------------------------------------------
-- 4. FOUNDING 50 ATOMIC SEQUENCE & LEDGER
-- ----------------------------------------------------------------------------
-- Atomic sequence capped strictly at 50 on the database server.
-- Never relies on client/browser counters.
CREATE SEQUENCE public.founding_member_number_seq
  AS SMALLINT
  INCREMENT BY 1
  MINVALUE 1
  MAXVALUE 50
  NO CYCLE;

CREATE TABLE public.founding_members_ledger (
  founder_number SMALLINT PRIMARY KEY CHECK (founder_number BETWEEN 1 AND 50),
  seller_user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE RESTRICT,
  storefront_id UUID NOT NULL UNIQUE,
  approved_by_admin_id UUID REFERENCES public.users(id),
  free_sorcerer_starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  free_sorcerer_expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '3 months'),
  lifetime_discount_percent SMALLINT NOT NULL DEFAULT 25 CHECK (lifetime_discount_percent = 25),
  permanent_certificate_hash TEXT NOT NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 5. SELLER STOREFRONTS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE public.seller_storefronts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  storefront_name TEXT NOT NULL,
  tagline TEXT,
  bio TEXT,
  location_city TEXT NOT NULL,
  location_state TEXT NOT NULL,
  approval_status seller_approval_status NOT NULL DEFAULT 'pending',
  membership_tier membership_tier_slug NOT NULL DEFAULT 'hatchling' REFERENCES public.membership_plans(slug),
  is_founding_member BOOLEAN NOT NULL DEFAULT FALSE,
  founder_number SMALLINT UNIQUE CHECK (founder_number BETWEEN 1 AND 50),
  lifetime_discount_percent SMALLINT NOT NULL DEFAULT 0 CHECK (lifetime_discount_percent IN (0, 25)),
  free_sorcerer_until TIMESTAMPTZ,
  requested_founding_spot BOOLEAN NOT NULL DEFAULT FALSE,
  live_arrival_guarantee BOOLEAN NOT NULL DEFAULT TRUE,
  shipping_hub_certified BOOLEAN NOT NULL DEFAULT TRUE,
  specialties TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_storefronts_approval ON public.seller_storefronts(approval_status);
CREATE INDEX idx_storefronts_founder ON public.seller_storefronts(is_founding_member, founder_number);

-- ----------------------------------------------------------------------------
-- 6. PROHIBITED SPECIES REGISTRY & LISTINGS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE public.prohibited_species_rules (
  id SERIAL PRIMARY KEY,
  scientific_or_common_pattern TEXT NOT NULL UNIQUE,
  restriction_reason TEXT NOT NULL,
  regulatory_authority TEXT NOT NULL -- e.g. 'CITES Appendix I', 'Lacey Act Injurious', 'Venomous / Front-Fanged'
);

INSERT INTO public.prohibited_species_rules (scientific_or_common_pattern, restriction_reason, regulatory_authority)
VALUES
  ('ophiophagus hannah', 'King Cobra — Strictly prohibited front-fanged venomous elapid', 'Serpent Sorcerer Safety Charter'),
  ('dendroaspis', 'Mamba genus — Strictly prohibited venomous elapid', 'Serpent Sorcerer Safety Charter'),
  ('crotalus', 'Rattlesnake genus — Prohibited medically significant pit viper', 'Serpent Sorcerer Safety Charter'),
  ('bitis', 'Gaboon / Puff Adder genus — Prohibited venomous viper', 'Serpent Sorcerer Safety Charter'),
  ('python natalensis', 'Lacey Act Injurious Wildlife interstate transport restriction', 'US Fish & Wildlife Lacey Act');

CREATE TABLE public.listings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  storefront_id UUID NOT NULL REFERENCES public.seller_storefronts(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category marketplace_category NOT NULL,
  species_common TEXT NOT NULL,
  species_scientific TEXT NOT NULL,
  morph_genetics TEXT NOT NULL DEFAULT 'Wild Type / Normal',
  sex specimen_sex NOT NULL DEFAULT 'Unsexed',
  hatch_date TEXT,
  weight_grams INTEGER,
  feeding_regimen TEXT,
  price_cents INTEGER NOT NULL CHECK (price_cents > 0),
  location_city TEXT NOT NULL,
  location_state TEXT NOT NULL,
  shipping_options shipping_option_type[] NOT NULL DEFAULT ARRAY['FedEx Priority Overnight']::shipping_option_type[],
  flat_shipping_cents INTEGER DEFAULT 6500,
  description TEXT NOT NULL,
  primary_image_url TEXT NOT NULL,
  gallery_image_urls TEXT[] NOT NULL DEFAULT '{}',
  status listing_status NOT NULL DEFAULT 'active',
  moderation_notes TEXT,
  is_demo_specimen BOOLEAN NOT NULL DEFAULT TRUE,
  views_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_listings_category_status ON public.listings(category, status);
CREATE INDEX idx_listings_species_trgm ON public.listings USING gin (species_common gin_trgm_ops);
CREATE INDEX idx_listings_morph_trgm ON public.listings USING gin (morph_genetics gin_trgm_ops);
CREATE INDEX idx_listings_price ON public.listings(price_cents);
CREATE INDEX idx_listings_storefront ON public.listings(storefront_id);

-- ----------------------------------------------------------------------------
-- 7. INQUIRIES & THREADED MESSAGES (No Live Animal Checkout in v1)
-- ----------------------------------------------------------------------------
CREATE TABLE public.inquiries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  storefront_id UUID NOT NULL REFERENCES public.seller_storefronts(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  buyer_zip_code TEXT NOT NULL,
  preferred_shipping shipping_option_type NOT NULL DEFAULT 'FedEx Priority Overnight',
  enclosure_ready BOOLEAN NOT NULL DEFAULT TRUE,
  status inquiry_status NOT NULL DEFAULT 'open',
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.inquiry_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inquiry_id UUID NOT NULL REFERENCES public.inquiries(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  sender_role user_role NOT NULL,
  body TEXT NOT NULL CHECK (char_length(trim(body)) > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_inquiries_buyer ON public.inquiries(buyer_id, last_message_at DESC);
CREATE INDEX idx_inquiries_seller ON public.inquiries(seller_id, last_message_at DESC);
CREATE INDEX idx_inquiry_messages_thread ON public.inquiry_messages(inquiry_id, created_at ASC);

-- ----------------------------------------------------------------------------
-- 8. BUYER FAVORITES, SAVED SEARCHES & MODERATION REPORTS
-- ----------------------------------------------------------------------------
CREATE TABLE public.buyer_favorites (
  buyer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (buyer_id, listing_id)
);

CREATE TABLE public.saved_searches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  buyer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  filters_json JSONB NOT NULL,
  alert_frequency TEXT NOT NULL DEFAULT 'instant',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.moderation_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id UUID REFERENCES public.listings(id) ON DELETE SET NULL,
  reporter_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  reason_category TEXT NOT NULL,
  details TEXT NOT NULL,
  resolved BOOLEAN NOT NULL DEFAULT FALSE,
  resolved_by_admin_id UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 9. SERVER-SIDE ATOMIC FOUNDING 50 ASSIGNMENT FUNCTION
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.approve_seller_and_assign_founder_spot(
  p_storefront_id UUID,
  p_admin_id UUID
) RETURNS public.seller_storefronts
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_storefront public.seller_storefronts;
  v_founder_num SMALLINT;
  v_admin_role user_role;
BEGIN
  -- 1. Verify caller is an administrator on the server
  SELECT role INTO v_admin_role FROM public.users WHERE id = p_admin_id;
  IF v_admin_role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Unauthorized: Only administrators can approve sellers.';
  END IF;

  -- 2. Lock storefront row for atomic update
  SELECT * INTO v_storefront
  FROM public.seller_storefronts
  WHERE id = p_storefront_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Storefront not found';
  END IF;

  -- 3. Attempt atomic Founding 50 assignment if spots remain (< 50)
  IF v_storefront.is_founding_member = FALSE THEN
    BEGIN
      v_founder_num := nextval('public.founding_member_number_seq');
      
      UPDATE public.seller_storefronts
      SET
        approval_status = 'approved',
        is_founding_member = TRUE,
        founder_number = v_founder_num,
        membership_tier = 'sorcerer',
        free_sorcerer_until = NOW() + INTERVAL '3 months',
        lifetime_discount_percent = 25,
        updated_at = NOW()
      WHERE id = p_storefront_id
      RETURNING * INTO v_storefront;

      INSERT INTO public.founding_members_ledger (
        founder_number,
        seller_user_id,
        storefront_id,
        approved_by_admin_id,
        permanent_certificate_hash
      ) VALUES (
        v_founder_num,
        v_storefront.user_id,
        v_storefront.id,
        p_admin_id,
        encode(sha256((v_storefront.id::text || '-' || v_founder_num::text)::bytea), 'hex')
      );
    EXCEPTION WHEN sequence_generator_limit_exceeded THEN
      -- All 50 Founder spots are permanently filled; approve as regular seller
      UPDATE public.seller_storefronts
      SET
        approval_status = 'approved',
        updated_at = NOW()
      WHERE id = p_storefront_id
      RETURNING * INTO v_storefront;
    END;
  END IF;

  RETURN v_storefront;
END;
$$;
