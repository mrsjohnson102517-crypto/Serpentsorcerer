export interface SchemaTableDoc {
  tableName: string;
  purpose: string;
  primaryKey: string;
  rlsSummary: string;
  indexes: string[];
  columns: {
    name: string;
    type: string;
    nullable: boolean;
    description: string;
  }[];
}

export const SUPABASE_SCHEMA_TABLES: SchemaTableDoc[] = [
  {
    tableName: 'public.users',
    purpose:
      'Core identity profile table linked 1:1 with Supabase auth.users. Stores RBAC role (buyer, seller, admin) and regional metadata.',
    primaryKey: 'id (UUID REFERENCES auth.users(id) ON DELETE CASCADE)',
    rlsSummary:
      'Users can SELECT and UPDATE their own profile. Role elevation to seller/admin is restricted strictly to service-role or admin-verified triggers.',
    indexes: ['idx_users_role ON public.users(role)'],
    columns: [
      { name: 'id', type: 'UUID', nullable: false, description: 'Primary key matching Supabase Auth UID' },
      { name: 'email', type: 'TEXT UNIQUE', nullable: false, description: 'Verified user email address' },
      { name: 'full_name', type: 'TEXT', nullable: false, description: 'Legal or display name of buyer/breeder' },
      { name: 'role', type: "user_role ('buyer' | 'seller' | 'admin')", nullable: false, description: 'RBAC role controlling dashboard & moderation access' },
      { name: 'state_province', type: 'TEXT', nullable: true, description: 'State/Province for regional wildlife compliance' },
      { name: 'created_at', type: 'TIMESTAMPTZ', nullable: false, description: 'Account registration timestamp' },
    ],
  },
  {
    tableName: 'public.membership_plans',
    purpose:
      'Reference catalog of Serpent Sorcerer seller tiers (Hatchling, Apprentice, Enchanter, Sorcerer, Grand Sorcerer). Enforces 0% transaction commission.',
    primaryKey: 'slug (membership_tier_slug)',
    rlsSummary: 'Publicly readable (SELECT) by all users; INSERT/UPDATE restricted to administrators.',
    indexes: ['PRIMARY KEY (slug)'],
    columns: [
      { name: 'slug', type: 'membership_tier_slug', nullable: false, description: 'hatchling | apprentice | enchanter | sorcerer | grand_sorcerer' },
      { name: 'name', type: 'TEXT', nullable: false, description: 'Human-readable tier name' },
      { name: 'monthly_price_cents', type: 'INTEGER', nullable: false, description: 'Standard monthly subscription in USD cents ($0 to $39.99)' },
      { name: 'max_active_listings', type: 'INTEGER', nullable: true, description: 'Active listing quota (3, 15, 50, or NULL for Unlimited)' },
      { name: 'includes_promotional_features', type: 'BOOLEAN', nullable: false, description: 'True for Grand Sorcerer homepage spotlight rotation' },
      { name: 'commission_rate_bps', type: 'INTEGER CHECK (= 0)', nullable: false, description: 'Enforced at 0 basis points (zero transaction commissions)' },
    ],
  },
  {
    tableName: 'public.founding_members_ledger',
    purpose:
      'Immutable audit ledger of the first 50 approved breeders. Assigned atomically on the server via PostgreSQL sequence (MAXVALUE 50 NO CYCLE) — never via client counters.',
    primaryKey: 'founder_number (SMALLINT CHECK BETWEEN 1 AND 50)',
    rlsSummary:
      'Publicly readable for verifying Founder badges (#1–#50). INSERT permitted only inside SECURITY DEFINER function approve_seller_and_assign_founder_spot().',
    indexes: ['UNIQUE (seller_user_id)', 'UNIQUE (storefront_id)'],
    columns: [
      { name: 'founder_number', type: 'SMALLINT (1..50)', nullable: false, description: 'Server-assigned sequential slot #1 through #50' },
      { name: 'seller_user_id', type: 'UUID REFERENCES users(id)', nullable: false, description: 'Owner account permanently linked to this Founder slot' },
      { name: 'storefront_id', type: 'UUID REFERENCES seller_storefronts(id)', nullable: false, description: 'Breeder storefront receiving benefits' },
      { name: 'free_sorcerer_expires_at', type: 'TIMESTAMPTZ', nullable: false, description: 'NOW() + INTERVAL 3 months of complimentary Sorcerer tier' },
      { name: 'lifetime_discount_percent', type: 'SMALLINT CHECK (= 25)', nullable: false, description: 'Permanent 25% discount on all paid membership tiers' },
      { name: 'permanent_certificate_hash', type: 'TEXT', nullable: false, description: 'SHA-256 verification hash of storefront + founder slot' },
    ],
  },
  {
    tableName: 'public.seller_storefronts',
    purpose:
      'Public breeder storefronts, approval state, active membership plan, Founding 50 status, and permit/guarantee metadata.',
    primaryKey: 'id (UUID)',
    rlsSummary:
      'Approved storefronts are publicly readable. Sellers can update their own bio/tagline; approval_status and founder_number can only be mutated by Admin RPC.',
    indexes: [
      'idx_storefronts_approval ON seller_storefronts(approval_status)',
      'idx_storefronts_founder ON seller_storefronts(is_founding_member, founder_number)',
    ],
    columns: [
      { name: 'id', type: 'UUID', nullable: false, description: 'Storefront UUID' },
      { name: 'user_id', type: 'UUID UNIQUE', nullable: false, description: 'FK to public.users(id)' },
      { name: 'slug', type: 'TEXT UNIQUE', nullable: false, description: 'URL-safe storefront identifier' },
      { name: 'storefront_name', type: 'TEXT', nullable: false, description: 'Official breeder business name' },
      { name: 'approval_status', type: 'seller_approval_status', nullable: false, description: 'pending | approved | rejected | suspended' },
      { name: 'membership_tier', type: 'membership_tier_slug', nullable: false, description: 'FK to membership_plans(slug)' },
      { name: 'is_founding_member', type: 'BOOLEAN', nullable: false, description: 'True if recorded in founding_members_ledger' },
      { name: 'founder_number', type: 'SMALLINT (1..50)', nullable: true, description: 'Founder badge number (#1 to #50)' },
      { name: 'lifetime_discount_percent', type: 'SMALLINT', nullable: false, description: '25 for Founding 50 members, 0 otherwise' },
    ],
  },
  {
    tableName: 'public.listings',
    purpose:
      'All marketplace listings across the 8 categories (Snakes, Lizards/Geckos, Amphibians, Turtles/Tortoises, Live Feeders, Frozen Feeders, Enclosures, Bioactive). Checked against prohibited_species_rules before activation.',
    primaryKey: 'id (UUID)',
    rlsSummary:
      'Active listings are publicly readable. Approved sellers can INSERT/UPDATE their own listings within their tier quota. Admins can moderate any listing.',
    indexes: [
      'idx_listings_category_status ON listings(category, status)',
      'idx_listings_species_trgm USING gin (species_common gin_trgm_ops)',
      'idx_listings_morph_trgm USING gin (morph_genetics gin_trgm_ops)',
      'idx_listings_price ON listings(price_cents)',
    ],
    columns: [
      { name: 'id', type: 'UUID', nullable: false, description: 'Listing UUID' },
      { name: 'storefront_id', type: 'UUID REFERENCES seller_storefronts(id)', nullable: false, description: 'Parent breeder storefront' },
      { name: 'category', type: 'marketplace_category', nullable: false, description: 'One of the 8 core marketplace categories' },
      { name: 'species_common', type: 'TEXT', nullable: false, description: 'Common species name (e.g. Emerald Tree Boa)' },
      { name: 'species_scientific', type: 'TEXT', nullable: false, description: 'Binomial scientific name (checked by safety trigger)' },
      { name: 'morph_genetics', type: 'TEXT', nullable: false, description: 'Visual & het genetics or product specification' },
      { name: 'sex', type: "specimen_sex ('Male'|'Female'|'Unsexed'|'N/A')", nullable: false, description: 'Specimen sex or N/A for dry goods/feeders' },
      { name: 'price_cents', type: 'INTEGER CHECK (> 0)', nullable: false, description: 'Price in USD cents' },
      { name: 'shipping_options', type: 'shipping_option_type[]', nullable: false, description: 'Array of supported transport methods' },
      { name: 'is_demo_specimen', type: 'BOOLEAN', nullable: false, description: 'Clearly flags demonstration listings in v1 prototype' },
    ],
  },
  {
    tableName: 'public.inquiries & public.inquiry_messages',
    purpose:
      'Direct buyer-to-seller inquiry and threaded messaging system. Replaces live-animal cart checkout in v1 and captures buyer ZIP code, shipping hub preference, and husbandry readiness.',
    primaryKey: 'id (UUID)',
    rlsSummary:
      'Strict participant isolation: Only the inquiry buyer_id, seller_id, or an admin can SELECT or INSERT messages in an inquiry thread.',
    indexes: [
      'idx_inquiries_buyer ON inquiries(buyer_id, last_message_at DESC)',
      'idx_inquiries_seller ON inquiries(seller_id, last_message_at DESC)',
      'idx_inquiry_messages_thread ON inquiry_messages(inquiry_id, created_at ASC)',
    ],
    columns: [
      { name: 'listing_id', type: 'UUID REFERENCES listings(id)', nullable: false, description: 'Target specimen or dry-goods listing' },
      { name: 'buyer_id', type: 'UUID REFERENCES users(id)', nullable: false, description: 'Inquiring buyer account' },
      { name: 'seller_id', type: 'UUID REFERENCES users(id)', nullable: false, description: 'Receiving breeder account' },
      { name: 'buyer_zip_code', type: 'TEXT', nullable: false, description: 'Used by seller to verify overnight temperatures & FedEx hub' },
      { name: 'preferred_shipping', type: 'shipping_option_type', nullable: false, description: 'Buyer requested transport method' },
      { name: 'enclosure_ready', type: 'BOOLEAN', nullable: false, description: 'Buyer attestation that cycled habitat is ready' },
      { name: 'status', type: 'inquiry_status', nullable: false, description: 'open | seller_replied | buyer_replied | shipping_quoted | closed' },
    ],
  },
];

export const SUPABASE_SQL_SNIPPET = `-- Atomic Server-Side Founding 50 Sequence & Trigger (PostgreSQL / Supabase)
CREATE SEQUENCE public.founding_member_number_seq
  AS SMALLINT INCREMENT BY 1 MINVALUE 1 MAXVALUE 50 NO CYCLE;

-- Enforce Membership Listing Quota & Prohibited Species Check Before Insert/Update
CREATE OR REPLACE FUNCTION public.enforce_listing_guardrails()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_max_listings INTEGER;
  v_current_active INTEGER;
  v_prohibited RECORD;
BEGIN
  -- 1. Check Prohibited & Venomous Species Registry
  SELECT * INTO v_prohibited FROM public.prohibited_species_rules
  WHERE LOWER(NEW.species_common) LIKE '%' || LOWER(scientific_or_common_pattern) || '%'
     OR LOWER(NEW.species_scientific) LIKE '%' || LOWER(scientific_or_common_pattern) || '%'
     OR LOWER(NEW.title) LIKE '%' || LOWER(scientific_or_common_pattern) || '%'
  LIMIT 1;

  IF FOUND THEN
    RAISE EXCEPTION 'PROHIBITED SPECIES BLOCKED (%): %',
      v_prohibited.regulatory_authority, v_prohibited.restriction_reason;
  END IF;

  -- 2. Enforce Membership Active Listing Cap
  IF NEW.status = 'active' THEN
    SELECT mp.max_active_listings INTO v_max_listings
    FROM public.seller_storefronts sf
    JOIN public.membership_plans mp ON mp.slug = sf.membership_tier
    WHERE sf.id = NEW.storefront_id;

    IF v_max_listings IS NOT NULL THEN
      SELECT COUNT(*) INTO v_current_active
      FROM public.listings
      WHERE storefront_id = NEW.storefront_id
        AND status = 'active'
        AND id IS DISTINCT FROM NEW.id;

      IF v_current_active >= v_max_listings THEN
        RAISE EXCEPTION 'Membership quota reached (% active listings max). Upgrade tier to publish more.', v_max_listings;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_listings_guardrails
BEFORE INSERT OR UPDATE ON public.listings
FOR EACH ROW EXECUTE FUNCTION public.enforce_listing_guardrails();

-- Row Level Security (RLS) for Inquiry Threads
ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inquiry_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view their own inquiries"
  ON public.inquiries FOR SELECT
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

CREATE POLICY "Buyers can create inquiries on active listings"
  ON public.inquiries FOR INSERT
  WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Participants can read and post messages in their thread"
  ON public.inquiry_messages FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.inquiries i
      WHERE i.id = inquiry_messages.inquiry_id
        AND (i.buyer_id = auth.uid() OR i.seller_id = auth.uid())
    )
  );`;
