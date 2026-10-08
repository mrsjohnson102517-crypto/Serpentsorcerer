export type UserRole = 'buyer' | 'seller' | 'admin';

export type SellerApprovalStatus = 'none' | 'pending' | 'approved' | 'rejected' | 'suspended';

export type MembershipTierSlug =
  | 'hatchling'
  | 'apprentice'
  | 'enchanter'
  | 'sorcerer'
  | 'grand_sorcerer';

export type MarketplaceCategory =
  | 'Snakes'
  | 'Lizards and Geckos'
  | 'Amphibians'
  | 'Turtles and Tortoises'
  | 'Live Feeder Insects'
  | 'Frozen Feeders'
  | 'Reptile Enclosures and Equipment'
  | 'Bioactive Supplies and Plants';

export type SpecimenSex = 'Male' | 'Female' | 'Unsexed' | 'N/A';

export type ShippingOptionType =
  | 'FedEx Priority Overnight'
  | 'Local Pickup'
  | 'Regional Freight'
  | 'Standard Ground (Dry Goods)';

export type ListingStatus =
  | 'active'
  | 'pending_moderation'
  | 'on_hold'
  | 'sold'
  | 'rejected';

export type InquiryStatus =
  | 'open'
  | 'seller_replied'
  | 'buyer_replied'
  | 'shipping_quoted'
  | 'closed';

export interface MembershipPlan {
  slug: MembershipTierSlug;
  name: string;
  monthlyPrice: number;
  founderMonthlyPrice: number;
  maxActiveListings: number | null; // null = Unlimited
  promotionalFeatures: boolean;
  tagline: string;
  features: string[];
}

export interface UserAccount {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  locationCity: string;
  locationState: string;
  storefrontId?: string;
  createdAt: string;
}

export interface SellerStorefront {
  id: string;
  userId: string;
  slug: string;
  storefrontName: string;
  tagline: string;
  bio: string;
  locationCity: string;
  locationState: string;
  approvalStatus: SellerApprovalStatus;
  membershipTier: MembershipTierSlug;
  isFoundingMember: boolean;
  founderNumber: number | null;
  lifetimeDiscountPercent: number;
  freeSorcererUntil: string | null;
  permanentCertificateHash?: string;
  liveArrivalGuarantee: boolean;
  shippingHubCertified: boolean;
  yearsBreeding: number;
  specialties: MarketplaceCategory[];
  permitDeclaration: string;
  createdAt: string;
}

export interface MarketplaceListing {
  id: string;
  storefrontId: string;
  sellerId: string;
  sellerName: string;
  sellerSlug: string;
  sellerFounderNumber: number | null;
  title: string;
  category: MarketplaceCategory;
  speciesCommon: string;
  speciesScientific: string;
  morphGenetics: string;
  sex: SpecimenSex;
  hatchDate: string;
  weightGrams: number | null;
  feedingRegimen: string;
  price: number;
  locationCity: string;
  locationState: string;
  shippingOptions: ShippingOptionType[];
  flatShippingRate: number;
  description: string;
  husbandryNotes: string;
  primaryImageUrl: string;
  galleryImageUrls: string[];
  status: ListingStatus;
  moderationNotes?: string;
  isDemoSpecimen: boolean;
  featured: boolean;
  createdAt: string;
}

export interface InquiryMessage {
  id: string;
  inquiryId: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  body: string;
  createdAt: string;
}

export interface ListingInquiry {
  id: string;
  listingId: string;
  listingTitle: string;
  listingSpecies: string;
  listingPrice: number;
  listingImageUrl: string;
  buyerId: string;
  buyerName: string;
  buyerEmail: string;
  buyerZipCode: string;
  preferredShipping: ShippingOptionType;
  enclosureReady: boolean;
  sellerId: string;
  storefrontId: string;
  storefrontName: string;
  subject: string;
  status: InquiryStatus;
  lastMessageAt: string;
  createdAt: string;
  messages: InquiryMessage[];
}

export interface SavedSearch {
  id: string;
  buyerId: string;
  label: string;
  category: string;
  speciesQuery: string;
  morphQuery: string;
  sex: string;
  maxPrice: number | null;
  shippingOption: string;
  createdAt: string;
}

export interface ModerationReport {
  id: string;
  listingId: string;
  listingTitle: string;
  reporterName: string;
  reasonCategory: 'Prohibited Species' | 'Misrepresented Genetics' | 'Welfare Concern' | 'Off-Platform Payment Demand';
  details: string;
  resolved: boolean;
  resolutionNotes?: string;
  createdAt: string;
}

export interface FoundingProgramState {
  maxSpots: number;
  assignedCount: number;
  remainingSpots: number;
  recentFounders: {
    founderNumber: number;
    storefrontName: string;
    locationState: string;
    grantedAt: string;
    certificateHash: string;
  }[];
}
