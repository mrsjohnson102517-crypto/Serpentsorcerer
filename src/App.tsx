/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  Search,
  Heart,
  Sparkles,
  Plus,
  Trash2,
  Edit3,
  MessageSquare,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  SlidersHorizontal,
  Flag,
  Bookmark,
  Info,
} from 'lucide-react';
import {
  FoundingProgramState,
  ListingInquiry,
  ListingStatus,
  MarketplaceCategory,
  MarketplaceListing,
  MembershipTierSlug,
  ModerationReport,
  SavedSearch,
  SellerStorefront,
  ShippingOptionType,
  SpecimenSex,
  UserAccount,
} from './types/marketplace';
import {
  INITIAL_INQUIRIES,
  INITIAL_LISTINGS,
  INITIAL_MODERATION_REPORTS,
  INITIAL_SAVED_SEARCHES,
  INITIAL_STOREFRONTS,
  INITIAL_USERS,
  MARKETPLACE_CATEGORIES,
  MEMBERSHIP_PLANS,
} from './data/initialData';
import { AppPage, MainLayout } from './components/MainLayout';
import { ResilientImage } from './components/ResilientImage';
import { InquiryThreadPanel } from './components/InquiryThreadPanel';
import { SupabaseSchemaExplorer } from './components/SupabaseSchemaExplorer';

export default function App() {
  // Navigation & Selected Entities
  const [activePage, setActivePage] = useState<AppPage>('home');
  const [selectedListingId, setSelectedListingId] = useState<string>('lst-1');
  const [selectedStorefrontId, setSelectedStorefrontId] = useState<string>('stf-1');

  // Application State (Hydrated from Express server.ts with instant local fallback)
  const [currentUserId, setCurrentUserId] = useState<string>('usr-buyer-1');
  const [users, setUsers] = useState<UserAccount[]>(
    INITIAL_USERS.filter((u) => u.role !== 'admin')
  );
  const [storefronts, setStorefronts] = useState<SellerStorefront[]>(INITIAL_STOREFRONTS);
  const [listings, setListings] = useState<MarketplaceListing[]>(INITIAL_LISTINGS);
  const [inquiries, setInquiries] = useState<ListingInquiry[]>(INITIAL_INQUIRIES);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>(INITIAL_SAVED_SEARCHES);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [reports, setReports] = useState<ModerationReport[]>(INITIAL_MODERATION_REPORTS);

  // Founding 50 State: Strictly 50 available until real approved seller records exist
  const [foundingProgram, setFoundingProgram] = useState<FoundingProgramState>({
    maxSpots: 50,
    assignedCount: 0,
    remainingSpots: 50,
    recentFounders: [],
  });

  // Marketplace Filters State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [filterSpecies, setFilterSpecies] = useState<string>('');
  const [filterMorph, setFilterMorph] = useState<string>('');
  const [filterSex, setFilterSex] = useState<string>('All');
  const [filterMaxPrice, setFilterMaxPrice] = useState<string>('');
  const [filterState, setFilterState] = useState<string>('All');
  const [filterShipping, setFilterShipping] = useState<string>('All');

  // Notification banner for user actions
  const [toastMessage, setToastMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 5000);
  };

  // Fetch authoritative state from Express backend on load & user change
  useEffect(() => {
    let cancelled = false;
    async function hydrateFromServer() {
      try {
        const res = await fetch('/api/bootstrap', {
          headers: { 'x-serpent-user-id': currentUserId },
        });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        if (data.users) setUsers(data.users);
        if (data.storefronts) setStorefronts(data.storefronts);
        if (data.listings) setListings(data.listings);
        if (data.inquiries) setInquiries(data.inquiries);
        if (data.savedSearches) setSavedSearches(data.savedSearches);
        if (data.favorites) setFavorites(data.favorites);
        if (data.reports) setReports(data.reports);
        if (data.foundingProgram) setFoundingProgram(data.foundingProgram);
      } catch {
        // Fallback state is already loaded
      }
    }
    hydrateFromServer();
    return () => {
      cancelled = true;
    };
  }, [currentUserId]);

  const currentUser = useMemo(
    () => users.find((u) => u.id === currentUserId) || users[0],
    [users, currentUserId]
  );

  const activeSellerStorefront = useMemo(() => {
    if (currentUser.storefrontId) {
      return (
        storefronts.find((s) => s.id === currentUser.storefrontId) || storefronts[0]
      );
    }
    return storefronts.find((s) => s.userId === currentUser.id) || storefronts[0];
  }, [currentUser, storefronts]);

  // Filtered Marketplace Listings
  const filteredListings = useMemo(() => {
    return listings.filter((item) => {
      if (item.status !== 'active') return false;
      if (filterCategory !== 'All' && item.category !== filterCategory) return false;
      if (filterSex !== 'All' && item.sex !== filterSex) return false;
      if (filterState !== 'All' && item.locationState !== filterState) return false;
      if (
        filterShipping !== 'All' &&
        !item.shippingOptions.includes(filterShipping as ShippingOptionType)
      ) {
        return false;
      }
      if (filterMaxPrice && item.price > Number(filterMaxPrice)) return false;

      if (filterSpecies.trim()) {
        const q = filterSpecies.toLowerCase();
        if (
          !item.speciesCommon.toLowerCase().includes(q) &&
          !item.speciesScientific.toLowerCase().includes(q)
        ) {
          return false;
        }
      }

      if (filterMorph.trim()) {
        const m = filterMorph.toLowerCase();
        if (!item.morphGenetics.toLowerCase().includes(m)) return false;
      }

      if (searchQuery.trim()) {
        const sq = searchQuery.toLowerCase();
        const haystack =
          `${item.title} ${item.speciesCommon} ${item.speciesScientific} ${item.morphGenetics} ${item.sellerName} ${item.category}`.toLowerCase();
        if (!haystack.includes(sq)) return false;
      }

      return true;
    });
  }, [
    listings,
    filterCategory,
    filterSex,
    filterState,
    filterShipping,
    filterMaxPrice,
    filterSpecies,
    filterMorph,
    searchQuery,
  ]);

  // Handlers
  const handleOpenListing = (listingId: string) => {
    setSelectedListingId(listingId);
    setActivePage('listing-detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenStorefront = (storefrontId: string) => {
    setSelectedStorefrontId(storefrontId);
    setActivePage('storefront-detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleToggleFavorite = async (listingId: string) => {
    const exists = favorites.includes(listingId);
    const optimistic = exists
      ? favorites.filter((id) => id !== listingId)
      : [...favorites, listingId];
    setFavorites(optimistic);

    try {
      const res = await fetch('/api/favorites/toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-serpent-user-id': currentUser.id,
        },
        body: JSON.stringify({ listingId }),
      });
      if (res.ok) {
        const data = await res.json();
        setFavorites(data.favorites);
      }
    } catch {
      // Optimistic state retained
    }
  };

  const handleCreateInquiry = async (payload: {
    listingId: string;
    subject: string;
    buyerZipCode: string;
    preferredShipping: ShippingOptionType;
    enclosureReady: boolean;
    messageBody: string;
  }) => {
    const res = await fetch('/api/inquiries', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-serpent-user-id': currentUser.id,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json();
      showToast('error', err.error || 'Could not send inquiry.');
      return;
    }

    const data = await res.json();
    setInquiries((prev) => [data.inquiry, ...prev]);
    showToast(
      'success',
      'Inquiry transmitted! Opening your Buyer Inquiry Inbox.'
    );
    setActivePage('buyer-account');
  };

  const handleSendInquiryMessage = async (
    inquiryId: string,
    body: string,
    statusOverride?: ListingInquiry['status']
  ) => {
    const res = await fetch(`/api/inquiries/${inquiryId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-serpent-user-id': currentUser.id,
      },
      body: JSON.stringify({ body, statusOverride }),
    });
    if (res.ok) {
      const data = await res.json();
      setInquiries((prev) =>
        prev.map((i) => (i.id === inquiryId ? data.inquiry : i))
      );
      showToast('success', 'Message posted to inquiry thread.');
    }
  };

  const handleUpdateInquiryStatus = async (
    inquiryId: string,
    status: ListingInquiry['status']
  ) => {
    const res = await fetch(`/api/inquiries/${inquiryId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-serpent-user-id': currentUser.id,
      },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      const data = await res.json();
      setInquiries((prev) =>
        prev.map((i) => (i.id === inquiryId ? data.inquiry : i))
      );
      showToast('success', `Inquiry status updated to ${status.replace('_', ' ')}.`);
    }
  };

  const userRelevantInquiries = useMemo(() => {
    if (currentUser.role === 'seller') {
      return inquiries.filter(
        (i) =>
          i.sellerId === currentUser.id ||
          i.storefrontId === activeSellerStorefront.id
      );
    }
    return inquiries;
  }, [inquiries, currentUser, activeSellerStorefront]);

  // ==========================================================================
  // PAGE 1: HOMEPAGE
  // ==========================================================================
  const renderHomePage = () => {
    const featuredItems = listings.filter((l) => l.status === 'active').slice(0, 6);
    const sampleStorefronts = storefronts.filter((s) => s.approvalStatus === 'approved');

    return (
      <div className="space-y-10 sm:space-y-14 w-full max-w-full overflow-x-hidden">
        {/* Hero Section */}
        <section className="relative rounded-2xl overflow-hidden border border-[#1E3329] bg-[#0D1512] w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 items-center">
            <div className="lg:col-span-7 p-5 sm:p-8 lg:p-12 space-y-5 min-w-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#C6A355]">
                <span>0% Transaction Commissions</span>
                <span aria-hidden="true">·</span>
                <span>{foundingProgram.remainingSpots} Founding Breeder Spots Available</span>
              </div>

              <h1 className="font-serif-display text-3xl sm:text-5xl font-semibold text-[#F5F3EE] leading-[1.14] break-words">
                Extraordinary Reptiles. Trusted Breeders. Endless Possibilities.
              </h1>

              <p className="text-sm sm:text-base text-[#A3ABA6] max-w-xl leading-relaxed">
                Discover reptiles, amphibians, feeders, enclosures, and supplies from breeders and sellers across the country.
              </p>

              {/* Prominent Primary & Secondary CTAs */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setActivePage('marketplace')}
                  className="px-6 py-3.5 bg-[#C6A355] text-[#090D0B] font-semibold text-sm rounded-lg hover:bg-[#DFC07A] transition-colors inline-flex items-center justify-center gap-2"
                >
                  <span>Browse Animals</span>
                  <ArrowRight className="w-4 h-4 shrink-0" />
                </button>
                <button
                  type="button"
                  onClick={() => setActivePage('seller-auth')}
                  className="px-6 py-3.5 bg-[#12221B] text-[#F5F3EE] font-semibold text-sm rounded-lg border border-[#C6A355]/50 hover:border-[#C6A355] hover:bg-[#172B22] transition-colors inline-flex items-center justify-center"
                >
                  Become a Seller
                </button>
              </div>

              {/* Integrated Search Bar */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setActivePage('marketplace');
                }}
                className="flex flex-col sm:flex-row gap-2.5 max-w-xl pt-2"
              >
                <div className="relative flex-1 min-w-0">
                  <Search className="w-4 h-4 text-[#C6A355] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search snakes, geckos, dart frogs, enclosures..."
                    className="w-full pl-10 pr-4 py-2.5 bg-[#090D0B] border border-[#243D30] rounded-lg text-xs sm:text-sm text-[#F5F3EE] placeholder-[#6E7A74] focus:outline-none focus:border-[#C6A355]"
                  />
                </div>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#172A21] text-[#C6A355] border border-[#284637] font-semibold text-xs sm:text-sm rounded-lg hover:border-[#C6A355] transition-colors whitespace-nowrap shrink-0"
                >
                  Search Catalog
                </button>
              </form>
            </div>

            <div className="lg:col-span-5 relative h-64 sm:h-80 lg:h-full min-h-[260px] w-full">
              <ResilientImage
                src="/src/assets/images/hero_emerald_boa_1791433492336.jpg"
                alt="Emerald Tree Boa coiled on a mossy branch"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0D1512] via-transparent to-transparent lg:bg-gradient-to-r lg:from-[#0D1512] lg:via-transparent lg:to-transparent" />
              <div className="absolute bottom-3 right-3 left-3 lg:left-auto bg-[#090D0B]/90 backdrop-blur-md border border-[#1E3329] rounded-lg px-3.5 py-2 text-xs">
                <p className="text-[#C6A355] font-medium truncate">
                  Sample Demonstration Visual · Corallus caninus
                </p>
                <p className="text-[#A3ABA6] text-[11px] truncate">
                  50 Founding Breeder Spots Available
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Prototype Transparency Notice: Working Backend vs Demonstration Data */}
        <section className="rounded-xl border border-[#254032] bg-[#0E1914] p-4 sm:p-5 flex items-start gap-3">
          <Info className="w-5 h-5 text-[#C6A355] shrink-0 mt-0.5" />
          <div className="text-xs text-[#D5DDD8] space-y-1 min-w-0 leading-relaxed">
            <p className="font-semibold text-[#F5F3EE]">
              Prototype Status — Working Features vs. Sample Demonstration Data
            </p>
            <p className="text-[#A3ABA6]">
              <strong>Working Backend Features (Express Server):</strong> Category & morph filtering, Buyer & Seller registration/login, creating/editing/removing listings with automated prohibited-species restrictions, saving searches, favoriting items, and sending live session inquiries.{' '}
              <strong>Demonstration Data:</strong> Pre-loaded listings and storefronts are labeled <em>Sample Demo</em> for layout preview only and do not represent actual available animals or verified breeders. No fabricated inquiries are preloaded, and all <strong>50 Founding Breeder Spots Available</strong> remain open until real approved seller records exist in production Supabase.
            </p>
          </div>
        </section>

        {/* Section 2: All 8 Marketplace Categories (Attractive Category Cards) */}
        <section className="space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[#1E3329] pb-4">
            <div className="min-w-0">
              <p className="text-xs text-[#C6A355] mb-1">Explore by Category</p>
              <h2 className="font-serif-display text-2xl sm:text-3xl font-semibold text-[#F5F3EE]">
                Marketplace Categories
              </h2>
            </div>
            <button
              type="button"
              onClick={() => {
                setFilterCategory('All');
                setActivePage('marketplace');
              }}
              className="text-xs font-medium text-[#C6A355] hover:underline inline-flex items-center gap-1 shrink-0"
            >
              <span>View Full Catalog</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {MARKETPLACE_CATEGORIES.map((cat) => (
              <button
                key={cat.name}
                type="button"
                onClick={() => {
                  setFilterCategory(cat.name);
                  setActivePage('marketplace');
                }}
                className="group text-left p-5 rounded-xl border border-[#1E3329] bg-gradient-to-b from-[#101C16] to-[#0B120F] hover:border-[#C6A355] transition-all flex flex-col justify-between min-w-0"
              >
                <div className="space-y-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-[#15271F] border border-[#264436] flex items-center justify-center text-[#C6A355] group-hover:bg-[#C6A355] group-hover:text-[#090D0B] transition-colors">
                    <CategoryEmblem category={cat.name} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] text-[#C6A355] truncate">
                      {cat.specimenCountLabel}
                    </p>
                    <h3 className="font-serif-display text-xl font-semibold text-[#F5F3EE] mt-0.5 break-words">
                      {cat.name}
                    </h3>
                    <p className="text-xs text-[#A3ABA6] mt-1.5 leading-relaxed">
                      {cat.description}
                    </p>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-[#1E3329]/80 flex items-center justify-between text-xs font-medium text-[#C6A355]">
                  <span>Explore {cat.shortLabel}</span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 shrink-0" />
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Section 3: Sample Demonstration Listings */}
        <section className="space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[#1E3329] pb-4">
            <div className="min-w-0">
              <p className="text-xs text-[#C6A355] mb-1">
                Sample Demonstration Listings · Not Actual Available Animals
              </p>
              <h2 className="font-serif-display text-2xl sm:text-3xl font-semibold text-[#F5F3EE]">
                Featured Marketplace Previews
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setActivePage('marketplace')}
              className="px-4 py-2 text-xs font-semibold bg-[#13221B] text-[#C6A355] border border-[#254032] rounded-lg hover:border-[#C6A355] transition-colors shrink-0"
            >
              Browse All {listings.filter((l) => l.status === 'active').length} Sample Listings
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 sm:gap-6">
            {featuredItems.map((item) => (
              <ListingCard
                key={item.id}
                listing={item}
                isFavorited={favorites.includes(item.id)}
                onToggleFavorite={() => handleToggleFavorite(item.id)}
                onOpen={() => handleOpenListing(item.id)}
              />
            ))}
          </div>
        </section>

        {/* Section 4: Sample Storefront Previews & Founding 50 Callout */}
        <section className="space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[#1E3329] pb-4">
            <div className="min-w-0">
              <p className="text-xs text-[#C6A355] mb-1">
                Storefront Layout Previews · {foundingProgram.remainingSpots} Founding Breeder Spots Available
              </p>
              <h2 className="font-serif-display text-2xl sm:text-3xl font-semibold text-[#F5F3EE]">
                Sample Breeder Storefronts
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setActivePage('founding-50')}
              className="text-xs font-medium text-[#C6A355] hover:underline inline-flex items-center gap-1 shrink-0"
            >
              <span>Apply for Founding 50</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {sampleStorefronts.map((sf) => (
              <div
                key={sf.id}
                className="border border-[#1E3329] bg-[#0D1512] rounded-xl p-5 flex flex-col justify-between min-w-0"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#C6A355] mb-2">
                    <span>
                      {sf.isFoundingMember
                        ? `Founding Breeder #${sf.founderNumber}`
                        : 'Sample Demo Storefront'}
                    </span>
                    <span className="text-[#A3ABA6]">
                      {sf.locationCity}, {sf.locationState}
                    </span>
                  </div>
                  <h3 className="font-serif-display text-xl sm:text-2xl font-semibold text-[#F5F3EE] break-words">
                    {sf.storefrontName}
                  </h3>
                  <p className="text-xs text-[#A3ABA6] mt-2 leading-relaxed">
                    {sf.tagline}
                  </p>
                  <div className="mt-4 pt-3 border-t border-[#1E3329] text-xs text-[#8E9892] break-words">
                    {sf.specialties.join(' · ')}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenStorefront(sf.id)}
                  className="mt-5 w-full py-2.5 px-4 bg-[#13221B] hover:bg-[#192D24] text-[#F5F3EE] border border-[#254032] rounded-lg text-xs font-medium transition-colors"
                >
                  Preview Storefront Layout
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>
    );
  };

  // ==========================================================================
  // PAGE 2: MARKETPLACE BROWSING PAGE
  // ==========================================================================
  const renderMarketplacePage = () => {
    const handleSaveCurrentSearch = async () => {
      const label = `${filterCategory === 'All' ? 'All Categories' : filterCategory} · ${
        filterMorph || filterSpecies || 'Custom Filter'
      }`;
      const res = await fetch('/api/saved-searches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-serpent-user-id': currentUser.id,
        },
        body: JSON.stringify({
          label,
          category: filterCategory,
          speciesQuery: filterSpecies,
          morphQuery: filterMorph,
          sex: filterSex,
          maxPrice: filterMaxPrice ? Number(filterMaxPrice) : null,
          shippingOption: filterShipping,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setSavedSearches(data.savedSearches);
        showToast('success', 'Filter configuration saved to your Buyer Account.');
      }
    };

    const resetFilters = () => {
      setSearchQuery('');
      setFilterCategory('All');
      setFilterSpecies('');
      setFilterMorph('');
      setFilterSex('All');
      setFilterMaxPrice('');
      setFilterState('All');
      setFilterShipping('All');
    };

    return (
      <div className="space-y-6 sm:space-y-8 w-full max-w-full overflow-x-hidden">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#1E3329] pb-5">
          <div className="min-w-0">
            <p className="text-xs text-[#C6A355] mb-1">
              Demonstration Catalog · 0% Commission · Direct Inquiry System
            </p>
            <h1 className="font-serif-display text-3xl sm:text-4xl font-semibold text-[#F5F3EE]">
              Browse Marketplace
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleSaveCurrentSearch}
              className="px-3.5 py-2 text-xs font-medium bg-[#13221B] text-[#C6A355] border border-[#254032] rounded-lg hover:border-[#C6A355] transition-colors inline-flex items-center gap-1.5"
            >
              <Bookmark className="w-3.5 h-3.5 shrink-0" />
              <span>Save Search</span>
            </button>
            <button
              type="button"
              onClick={resetFilters}
              className="px-3.5 py-2 text-xs font-medium text-[#A3ABA6] hover:text-[#F5F3EE] border border-[#1E3329] rounded-lg transition-colors"
            >
              Reset Filters
            </button>
          </div>
        </div>

        {/* Multi-Facet Filter Console */}
        <div className="border border-[#1E3329] bg-[#0D1512] rounded-xl p-4 sm:p-5 space-y-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#C6A355]">
            <SlidersHorizontal className="w-4 h-4 shrink-0" />
            <span>Filter by Category, Species, Morph, Sex, Price, Location & Shipping</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div>
              <label className="block text-[11px] text-[#A3ABA6] mb-1">Category</label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full bg-[#090D0B] border border-[#23392E] rounded-lg px-3 py-2 text-xs text-[#F5F3EE] focus:outline-none focus:border-[#C6A355]"
              >
                <option value="All">All 8 Marketplace Categories</option>
                {MARKETPLACE_CATEGORIES.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-[#A3ABA6] mb-1">
                Species (Common or Scientific)
              </label>
              <input
                type="text"
                value={filterSpecies}
                onChange={(e) => setFilterSpecies(e.target.value)}
                placeholder="e.g. Emerald Tree Boa, Crested..."
                className="w-full bg-[#090D0B] border border-[#23392E] rounded-lg px-3 py-2 text-xs text-[#F5F3EE] placeholder-[#6E7A74] focus:outline-none focus:border-[#C6A355]"
              />
            </div>

            <div>
              <label className="block text-[11px] text-[#A3ABA6] mb-1">
                Morph / Genetics / Spec
              </label>
              <input
                type="text"
                value={filterMorph}
                onChange={(e) => setFilterMorph(e.target.value)}
                placeholder="e.g. Lilly White, Piebald, Sunset..."
                className="w-full bg-[#090D0B] border border-[#23392E] rounded-lg px-3 py-2 text-xs text-[#F5F3EE] placeholder-[#6E7A74] focus:outline-none focus:border-[#C6A355]"
              />
            </div>

            <div>
              <label className="block text-[11px] text-[#A3ABA6] mb-1">Specimen Sex</label>
              <select
                value={filterSex}
                onChange={(e) => setFilterSex(e.target.value)}
                className="w-full bg-[#090D0B] border border-[#23392E] rounded-lg px-3 py-2 text-xs text-[#F5F3EE] focus:outline-none focus:border-[#C6A355]"
              >
                <option value="All">Any Sex</option>
                <option value="Female">Female</option>
                <option value="Male">Male</option>
                <option value="Unsexed">Unsexed</option>
                <option value="N/A">N/A (Enclosures / Supplies)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-[#A3ABA6] mb-1">
                Max Price (USD)
              </label>
              <input
                type="number"
                value={filterMaxPrice}
                onChange={(e) => setFilterMaxPrice(e.target.value)}
                placeholder="No upper limit"
                className="w-full bg-[#090D0B] border border-[#23392E] rounded-lg px-3 py-2 text-xs font-tabular text-[#F5F3EE] placeholder-[#6E7A74] focus:outline-none focus:border-[#C6A355]"
              />
            </div>

            <div>
              <label className="block text-[11px] text-[#A3ABA6] mb-1">
                Seller Location (State)
              </label>
              <select
                value={filterState}
                onChange={(e) => setFilterState(e.target.value)}
                className="w-full bg-[#090D0B] border border-[#23392E] rounded-lg px-3 py-2 text-xs text-[#F5F3EE] focus:outline-none focus:border-[#C6A355]"
              >
                <option value="All">All US States</option>
                <option value="FL">Florida (FL)</option>
                <option value="OR">Oregon (OR)</option>
                <option value="AZ">Arizona (AZ)</option>
                <option value="WA">Washington (WA)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-[#A3ABA6] mb-1">
                Shipping & Transport
              </label>
              <select
                value={filterShipping}
                onChange={(e) => setFilterShipping(e.target.value)}
                className="w-full bg-[#090D0B] border border-[#23392E] rounded-lg px-3 py-2 text-xs text-[#F5F3EE] focus:outline-none focus:border-[#C6A355]"
              >
                <option value="All">All Transport Methods</option>
                <option value="FedEx Priority Overnight">FedEx Priority Overnight</option>
                <option value="Local Pickup">Local Pickup</option>
                <option value="Regional Freight">Regional Freight</option>
                <option value="Standard Ground (Dry Goods)">Standard Ground (Dry Goods)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-[#A3ABA6] mb-1">
                Keyword Search
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search title or notes..."
                className="w-full bg-[#090D0B] border border-[#23392E] rounded-lg px-3 py-2 text-xs text-[#F5F3EE] placeholder-[#6E7A74] focus:outline-none focus:border-[#C6A355]"
              />
            </div>
          </div>
        </div>

        {/* Results Count */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#A3ABA6]">
          <span>
            Showing <strong className="font-tabular text-[#F5F3EE]">{filteredListings.length}</strong> sample demonstration listing{filteredListings.length === 1 ? '' : 's'}
          </span>
          <span>Sample Data Only (Not Actual Available Animals)</span>
        </div>

        {/* Product Grid */}
        {filteredListings.length === 0 ? (
          <div className="border border-[#1E3329] bg-[#0D1512] rounded-xl p-8 sm:p-12 text-center space-y-3">
            <p className="font-serif-display text-2xl text-[#F5F3EE]">
              No Sample Listings Match Your Current Filters
            </p>
            <p className="text-xs text-[#A3ABA6] max-w-md mx-auto">
              Try clearing your morph or price filter, or save this search to your Buyer Account.
            </p>
            <button
              type="button"
              onClick={resetFilters}
              className="px-4 py-2 bg-[#C6A355] text-[#090D0B] text-xs font-semibold rounded-lg"
            >
              Reset All Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 sm:gap-6">
            {filteredListings.map((item) => (
              <ListingCard
                key={item.id}
                listing={item}
                isFavorited={favorites.includes(item.id)}
                onToggleFavorite={() => handleToggleFavorite(item.id)}
                onOpen={() => handleOpenListing(item.id)}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  // ==========================================================================
  // PAGE 3: INDIVIDUAL LISTING PAGE (PDP + DIRECT INQUIRY MODULE)
  // ==========================================================================
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [inquiryZip, setInquiryZip] = useState('78701');
  const [inquiryShipping, setInquiryShipping] = useState<ShippingOptionType>('FedEx Priority Overnight');
  const [inquiryEnclosureReady, setInquiryEnclosureReady] = useState(true);
  const [inquiryMessage, setInquiryMessage] = useState(
    'Hello! I am testing the Serpent Sorcerer inquiry system on this demonstration listing.'
  );
  const [reportReason, setReportReason] =
    useState<ModerationReport['reasonCategory']>('Misrepresented Genetics');
  const [reportDetails, setReportDetails] = useState('');
  const [showReportForm, setShowReportForm] = useState(false);

  const renderListingDetailPage = () => {
    const listing =
      listings.find((l) => l.id === selectedListingId) || listings[0];
    const storefront =
      storefronts.find((s) => s.id === listing.storefrontId) || storefronts[0];
    const gallery =
      listing.galleryImageUrls.length > 0
        ? listing.galleryImageUrls
        : [listing.primaryImageUrl];
    const mainImage = gallery[activeImageIndex] || listing.primaryImageUrl;

    const handleSubmitInquiryForm = async (e: React.FormEvent) => {
      e.preventDefault();
      await handleCreateInquiry({
        listingId: listing.id,
        subject: `Inquiry: ${listing.title}`,
        buyerZipCode: inquiryZip,
        preferredShipping: inquiryShipping,
        enclosureReady: inquiryEnclosureReady,
        messageBody: inquiryMessage,
      });
    };

    const handleSubmitReport = async (e: React.FormEvent) => {
      e.preventDefault();
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-serpent-user-id': currentUser.id,
        },
        body: JSON.stringify({
          listingId: listing.id,
          listingTitle: listing.title,
          reasonCategory: reportReason,
          details: reportDetails,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setReports((prev) => [data.report, ...prev]);
        setShowReportForm(false);
        setReportDetails('');
        showToast('success', 'Listing report recorded in backend moderation queue.');
      }
    };

    return (
      <div className="space-y-6 sm:space-y-8 w-full max-w-full overflow-x-hidden">
        {/* Breadcrumb */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#A3ABA6]">
          <div className="flex flex-wrap items-center gap-1.5 min-w-0">
            <button
              type="button"
              onClick={() => setActivePage('marketplace')}
              className="hover:text-[#C6A355]"
            >
              Marketplace
            </button>
            <span aria-hidden="true">/</span>
            <button
              type="button"
              onClick={() => {
                setFilterCategory(listing.category);
                setActivePage('marketplace');
              }}
              className="hover:text-[#C6A355]"
            >
              {listing.category}
            </button>
          </div>

          <span className="text-[#C6A355]">
            Sample Demonstration Listing · Not an Actual Available Animal
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
          {/* Left Column: Image Gallery + Detailed Husbandry & Lineage */}
          <div className="lg:col-span-7 space-y-6 min-w-0">
            <div className="border border-[#1E3329] bg-[#0D1512] rounded-xl overflow-hidden">
              <div className="aspect-[4/3] w-full bg-[#090D0B]">
                <ResilientImage
                  src={mainImage}
                  alt={listing.title}
                  className="w-full h-full object-cover"
                />
              </div>
              {gallery.length > 1 && (
                <div className="p-3 border-t border-[#1E3329] flex items-center gap-3 overflow-x-auto">
                  {gallery.map((imgUrl, idx) => (
                    <button
                      key={imgUrl + idx}
                      type="button"
                      onClick={() => setActiveImageIndex(idx)}
                      className={`w-20 h-16 rounded-lg overflow-hidden border-2 shrink-0 transition-all ${
                        activeImageIndex === idx
                          ? 'border-[#C6A355]'
                          : 'border-transparent opacity-60 hover:opacity-100'
                      }`}
                    >
                      <ResilientImage
                        src={imgUrl}
                        alt={`${listing.title} view ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Specimen Specifications Table */}
            <div className="border border-[#1E3329] bg-[#0D1512] rounded-xl p-4 sm:p-6 space-y-5">
              <h2 className="font-serif-display text-2xl font-semibold text-[#F5F3EE]">
                Genetics, Lineage & Husbandry Dossier
              </h2>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2 border-t border-[#1E3329] text-xs">
                <div>
                  <span className="text-[#8E9892] block">Common Species</span>
                  <span className="text-[#F5F3EE] font-medium mt-0.5 block break-words">
                    {listing.speciesCommon}
                  </span>
                </div>
                <div>
                  <span className="text-[#8E9892] block">Scientific Taxonomy</span>
                  <span className="text-[#C6A355] italic mt-0.5 block break-words">
                    {listing.speciesScientific}
                  </span>
                </div>
                <div>
                  <span className="text-[#8E9892] block">Morph / Genetics</span>
                  <span className="text-[#F5F3EE] font-medium mt-0.5 block break-words">
                    {listing.morphGenetics}
                  </span>
                </div>
                <div>
                  <span className="text-[#8E9892] block">Sex</span>
                  <span className="text-[#F5F3EE] font-medium mt-0.5 block">
                    {listing.sex}
                  </span>
                </div>
                <div>
                  <span className="text-[#8E9892] block">Hatch / Batch Date</span>
                  <span className="font-tabular text-[#F5F3EE] mt-0.5 block">
                    {listing.hatchDate}
                  </span>
                </div>
                <div>
                  <span className="text-[#8E9892] block">Current Weight</span>
                  <span className="font-tabular text-[#F5F3EE] mt-0.5 block">
                    {listing.weightGrams ? `${listing.weightGrams} g` : 'N/A (Dry Goods)'}
                  </span>
                </div>
              </div>

              <div className="pt-4 border-t border-[#1E3329] space-y-3 text-sm text-[#D5DDD8] leading-relaxed">
                <p>{listing.description}</p>
                <div className="p-4 rounded-lg bg-[#090D0B] border border-[#1E3329] text-xs space-y-1.5">
                  <p className="text-[#C6A355] font-semibold">
                    Current Feeding Regimen & Husbandry Protocol
                  </p>
                  <p className="text-[#F5F3EE]">
                    <strong>Diet:</strong> {listing.feedingRegimen}
                  </p>
                  <p className="text-[#A3ABA6]">{listing.husbandryNotes}</p>
                </div>
              </div>

              {/* Report Listing Action */}
              <div className="pt-3 border-t border-[#1E3329] flex flex-wrap items-center justify-between gap-2 text-xs text-[#8E9892]">
                <span>Listing ID: {listing.id} · Demonstration Record</span>
                <button
                  type="button"
                  onClick={() => setShowReportForm((v) => !v)}
                  className="text-[#A3ABA6] hover:text-[#C6A355] inline-flex items-center gap-1"
                >
                  <Flag className="w-3.5 h-3.5" />
                  <span>Report Listing</span>
                </button>
              </div>

              {showReportForm && (
                <form
                  onSubmit={handleSubmitReport}
                  className="p-4 rounded-lg bg-[#141A17] border border-[#C6A355]/40 space-y-3"
                >
                  <p className="text-xs font-semibold text-[#C6A355]">
                    Submit Compliance or Welfare Report
                  </p>
                  <select
                    value={reportReason}
                    onChange={(e) =>
                      setReportReason(
                        e.target.value as ModerationReport['reasonCategory']
                      )
                    }
                    className="w-full bg-[#090D0B] border border-[#23392E] rounded px-3 py-2 text-xs text-[#F5F3EE]"
                  >
                    <option value="Prohibited Species">Prohibited or Venomous Species</option>
                    <option value="Misrepresented Genetics">Misrepresented Genetics / Lineage</option>
                    <option value="Welfare Concern">Animal Welfare or Condition Concern</option>
                    <option value="Off-Platform Payment Demand">Suspicious Payment Demand</option>
                  </select>
                  <textarea
                    rows={2}
                    required
                    value={reportDetails}
                    onChange={(e) => setReportDetails(e.target.value)}
                    placeholder="Provide details for moderation review..."
                    className="w-full bg-[#090D0B] border border-[#23392E] rounded p-2.5 text-xs text-[#F5F3EE]"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowReportForm(false)}
                      className="px-3 py-1.5 text-xs text-[#A3ABA6]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-3.5 py-1.5 text-xs bg-[#C6A355] text-[#090D0B] font-semibold rounded"
                    >
                      Submit Report
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>

          {/* Right Column: Contiguous Inquiry & Breeder Dossier Module */}
          <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-20 min-w-0">
            <div className="border border-[#1E3329] bg-[#0D1512] rounded-xl p-4 sm:p-6 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#C6A355]">
                <span>{listing.category}</span>
                <span>·</span>
                <span>
                  {listing.locationCity}, {listing.locationState}
                </span>
              </div>

              <h1 className="font-serif-display text-2xl sm:text-3xl font-semibold text-[#F5F3EE] break-words">
                {listing.title}
              </h1>

              <div className="flex flex-wrap items-baseline justify-between gap-2 pt-2 border-t border-[#1E3329]">
                <div>
                  <span className="font-tabular text-2xl sm:text-3xl font-semibold text-[#F5F3EE]">
                    ${listing.price.toLocaleString()}
                  </span>
                  <span className="text-xs text-[#A3ABA6] ml-2 font-tabular">
                    + ${listing.flatShippingRate} {listing.shippingOptions[0]}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleFavorite(listing.id)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-medium inline-flex items-center gap-1.5 transition-colors ${
                    favorites.includes(listing.id)
                      ? 'bg-[#C6A355]/15 border-[#C6A355] text-[#C6A355]'
                      : 'border-[#23392E] text-[#A3ABA6] hover:text-[#F5F3EE]'
                  }`}
                >
                  <Heart
                    className={`w-3.5 h-3.5 ${
                      favorites.includes(listing.id) ? 'fill-[#C6A355]' : ''
                    }`}
                  />
                  <span>{favorites.includes(listing.id) ? 'Saved' : 'Favorite'}</span>
                </button>
              </div>

              {/* Direct Breeder Inquiry Form (Working Session Backend Feature) */}
              <form
                onSubmit={handleSubmitInquiryForm}
                className="pt-4 border-t border-[#1E3329] space-y-3.5"
              >
                <div className="p-3 rounded-lg bg-[#12211A] border border-[#233B2E] text-xs text-[#C6A355]">
                  <strong>Working Inquiry Feature (No Payment Collection in v1):</strong> Submit an inquiry below to create a live message thread in your Buyer Account Inbox and Seller Dashboard Inbox.
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-[#A3ABA6] mb-1">
                      Destination ZIP Code
                    </label>
                    <input
                      type="text"
                      required
                      value={inquiryZip}
                      onChange={(e) => setInquiryZip(e.target.value)}
                      className="w-full bg-[#090D0B] border border-[#23392E] rounded-lg px-3 py-2 text-xs font-tabular text-[#F5F3EE]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-[#A3ABA6] mb-1">
                      Preferred Transport
                    </label>
                    <select
                      value={inquiryShipping}
                      onChange={(e) =>
                        setInquiryShipping(e.target.value as ShippingOptionType)
                      }
                      className="w-full bg-[#090D0B] border border-[#23392E] rounded-lg px-3 py-2 text-xs text-[#F5F3EE]"
                    >
                      {listing.shippingOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <label className="flex items-start gap-2 text-xs text-[#D5DDD8] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={inquiryEnclosureReady}
                    onChange={(e) => setInquiryEnclosureReady(e.target.checked)}
                    className="accent-[#C6A355] mt-0.5"
                  />
                  <span>
                    I have a temperature-regulated enclosure ready for this species
                  </span>
                </label>

                <div>
                  <label className="block text-[11px] text-[#A3ABA6] mb-1">
                    Message to Seller
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={inquiryMessage}
                    onChange={(e) => setInquiryMessage(e.target.value)}
                    className="w-full bg-[#090D0B] border border-[#23392E] rounded-lg p-3 text-xs text-[#F5F3EE] focus:outline-none focus:border-[#C6A355]"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 px-4 bg-[#C6A355] text-[#090D0B] font-semibold text-sm rounded-lg hover:bg-[#DFC07A] transition-colors inline-flex items-center justify-center gap-2"
                >
                  <MessageSquare className="w-4 h-4 shrink-0" />
                  <span>Send Inquiry to Seller</span>
                </button>
              </form>

              {/* Seller Storefront Summary Card */}
              <div className="pt-4 border-t border-[#1E3329] space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-1 text-xs">
                  <span className="text-[#C6A355] font-medium">
                    {storefront.isFoundingMember
                      ? `Founding Breeder #${storefront.founderNumber}`
                      : 'Sample Demo Storefront'}
                  </span>
                  <span className="text-[#A3ABA6]">
                    {storefront.locationCity}, {storefront.locationState}
                  </span>
                </div>
                <p className="font-serif-display text-xl font-semibold text-[#F5F3EE] break-words">
                  {storefront.storefrontName}
                </p>
                <p className="text-xs text-[#A3ABA6]">{storefront.permitDeclaration}</p>
                <button
                  type="button"
                  onClick={() => handleOpenStorefront(storefront.id)}
                  className="text-xs text-[#C6A355] hover:underline inline-flex items-center gap-1 pt-1"
                >
                  <span>View Storefront Profile</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ==========================================================================
  // PAGE 4 & 8: BUYER / SELLER REGISTRATION & LOGIN + FOUNDING 50 PAGE
  // ==========================================================================
  const [authTab, setAuthTab] = useState<'seller-register' | 'buyer-register' | 'login'>(
    'seller-register'
  );
  const [loginEmail, setLoginEmail] = useState('');
  const [buyerName, setBuyerName] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [buyerCity, setBuyerCity] = useState('');
  const [buyerState, setBuyerState] = useState('TX');

  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regStorefrontName, setRegStorefrontName] = useState('');
  const [regCity, setRegCity] = useState('');
  const [regState, setRegState] = useState('FL');
  const [regTagline, setRegTagline] = useState('');
  const [regPermit, setRegPermit] = useState('');
  const [regSpecialties, setRegSpecialties] = useState<MarketplaceCategory[]>(['Snakes']);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: loginEmail }),
    });
    const data = await res.json();
    if (!res.ok) {
      showToast('error', data.error || 'Account not found.');
      return;
    }
    setCurrentUserId(data.user.id);
    showToast('success', `Signed in as ${data.user.fullName} (${data.user.role}).`);
    setActivePage(
      data.user.role === 'seller' ? 'seller-dashboard' : 'buyer-account'
    );
  };

  const handleBuyerRegistrationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/buyers/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: buyerName,
        email: buyerEmail,
        locationCity: buyerCity,
        locationState: buyerState,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      showToast('error', data.error || 'Buyer registration failed.');
      return;
    }
    setUsers((prev) =>
      prev.some((u) => u.id === data.user.id) ? prev : [...prev, data.user]
    );
    setCurrentUserId(data.user.id);
    showToast('success', `Welcome ${data.user.fullName}! Buyer account active.`);
    setActivePage('buyer-account');
  };

  const handleSellerRegistrationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/sellers/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: regFullName,
        email: regEmail,
        storefrontName: regStorefrontName,
        locationCity: regCity,
        locationState: regState,
        tagline: regTagline,
        permitDeclaration: regPermit,
        specialties: regSpecialties,
        applyForFounding50: true,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      showToast('error', err.error || 'Registration failed.');
      return;
    }

    const data = await res.json();
    setUsers((prev) => [...prev, data.user]);
    setStorefronts((prev) => [...prev, data.storefront]);
    setCurrentUserId(data.user.id);
    showToast(
      'success',
      'Seller application submitted! Founding 50 spots remain at 50 available until backend administrator verification.'
    );
    setActivePage('seller-dashboard');
  };

  const renderSellerAuthAndFoundingPage = (isFounding50Focus: boolean) => {
    return (
      <div className="space-y-8 sm:space-y-10 w-full max-w-full overflow-x-hidden">
        {/* Founding 50 Promotion Hero Banner */}
        <div className="border border-[#C6A355]/40 bg-gradient-to-br from-[#13241B] via-[#0D1512] to-[#090D0B] rounded-2xl p-5 sm:p-8 lg:p-10 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-[#C6A355]">
              <Sparkles className="w-4 h-4 shrink-0" />
              <span>Founding 50 Breeder Charter · Server-Verified Assignment</span>
            </div>
            <div className="font-tabular text-xs font-semibold text-[#090D0B] bg-[#C6A355] px-3.5 py-1.5 rounded-lg">
              {foundingProgram.remainingSpots} Founding Breeder Spots Available
            </div>
          </div>

          <h1 className="font-serif-display text-3xl sm:text-5xl font-semibold text-[#F5F3EE] max-w-3xl break-words">
            {isFounding50Focus
              ? '50 Founding Breeder Spots Available — 3 Months Free Sorcerer + 25% Off for Life'
              : 'Buyer & Seller Registration and Sign-In'}
          </h1>

          <p className="text-sm sm:text-base text-[#A3ABA6] max-w-2xl leading-relaxed">
            The first 50 approved sellers receive <strong>three months of free Sorcerer membership</strong> (unlimited active listings), followed by <strong>25% off paid membership plans for life</strong>. Founder status is permanently recorded and assigned securely on the backend only when real seller records are approved — never simulated or decreased by demonstration data.
          </p>
        </div>

        {/* Auth Mode Selector Tabs */}
        <div className="flex flex-wrap items-center gap-2 p-1 bg-[#0D1512] border border-[#1E3329] rounded-lg w-fit max-w-full">
          <button
            type="button"
            onClick={() => setAuthTab('seller-register')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors ${
              authTab === 'seller-register'
                ? 'bg-[#C6A355] text-[#090D0B]'
                : 'text-[#A3ABA6] hover:text-[#F5F3EE]'
            }`}
          >
            Become a Seller / Founding 50
          </button>
          <button
            type="button"
            onClick={() => setAuthTab('buyer-register')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors ${
              authTab === 'buyer-register'
                ? 'bg-[#C6A355] text-[#090D0B]'
                : 'text-[#A3ABA6] hover:text-[#F5F3EE]'
            }`}
          >
            Register as Buyer
          </button>
          <button
            type="button"
            onClick={() => setAuthTab('login')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors ${
              authTab === 'login'
                ? 'bg-[#C6A355] text-[#090D0B]'
                : 'text-[#A3ABA6] hover:text-[#F5F3EE]'
            }`}
          >
            Sign In to Account
          </button>
        </div>

        {authTab === 'seller-register' && (
          <form
            onSubmit={handleSellerRegistrationSubmit}
            className="border border-[#1E3329] bg-[#0D1512] rounded-xl p-5 sm:p-6 space-y-4 max-w-3xl"
          >
            <h2 className="font-serif-display text-2xl font-semibold text-[#F5F3EE]">
              Seller Registration & Founding 50 Application
            </h2>
            <p className="text-xs text-[#A3ABA6]">
              Register your breeder storefront below. Admin approval and Founding 50 slot assignment are handled strictly on the backend.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-[#A3ABA6] mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={regFullName}
                  onChange={(e) => setRegFullName(e.target.value)}
                  placeholder="Your full name"
                  className="w-full bg-[#090D0B] border border-[#23392E] rounded-lg px-3.5 py-2.5 text-xs text-[#F5F3EE]"
                />
              </div>
              <div>
                <label className="block text-xs text-[#A3ABA6] mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="you@breeder.com"
                  className="w-full bg-[#090D0B] border border-[#23392E] rounded-lg px-3.5 py-2.5 text-xs text-[#F5F3EE]"
                />
              </div>
              <div>
                <label className="block text-xs text-[#A3ABA6] mb-1">Storefront Name</label>
                <input
                  type="text"
                  required
                  value={regStorefrontName}
                  onChange={(e) => setRegStorefrontName(e.target.value)}
                  placeholder="Your Breeder or Storefront Name"
                  className="w-full bg-[#090D0B] border border-[#23392E] rounded-lg px-3.5 py-2.5 text-xs text-[#F5F3EE]"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-[#A3ABA6] mb-1">City</label>
                  <input
                    type="text"
                    required
                    value={regCity}
                    onChange={(e) => setRegCity(e.target.value)}
                    placeholder="City"
                    className="w-full bg-[#090D0B] border border-[#23392E] rounded-lg px-3 py-2.5 text-xs text-[#F5F3EE]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#A3ABA6] mb-1">State</label>
                  <input
                    type="text"
                    required
                    maxLength={2}
                    value={regState}
                    onChange={(e) => setRegState(e.target.value.toUpperCase())}
                    className="w-full bg-[#090D0B] border border-[#23392E] rounded-lg px-3 py-2.5 text-xs text-[#F5F3EE]"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs text-[#A3ABA6] mb-1">
                Specialization & Storefront Tagline
              </label>
              <input
                type="text"
                required
                value={regTagline}
                onChange={(e) => setRegTagline(e.target.value)}
                placeholder="Describe your species, morph projects, or supplies"
                className="w-full bg-[#090D0B] border border-[#23392E] rounded-lg px-3.5 py-2.5 text-xs text-[#F5F3EE]"
              />
            </div>

            <div>
              <label className="block text-xs text-[#A3ABA6] mb-1">
                State Wildlife Permit / Compliance Declaration
              </label>
              <input
                type="text"
                required
                value={regPermit}
                onChange={(e) => setRegPermit(e.target.value)}
                placeholder="Applicable state permits & non-venomous compliance declaration"
                className="w-full bg-[#090D0B] border border-[#23392E] rounded-lg px-3.5 py-2.5 text-xs text-[#F5F3EE]"
              />
            </div>

            <div>
              <label className="block text-xs text-[#A3ABA6] mb-1.5">
                Primary Marketplace Categories
              </label>
              <div className="flex flex-wrap gap-2">
                {MARKETPLACE_CATEGORIES.map((c) => {
                  const selected = regSpecialties.includes(c.name);
                  return (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() =>
                        setRegSpecialties((prev) =>
                          selected
                            ? prev.filter((item) => item !== c.name)
                            : [...prev, c.name]
                        )
                      }
                      className={`px-2.5 py-1 rounded text-xs border transition-colors ${
                        selected
                          ? 'bg-[#C6A355]/20 border-[#C6A355] text-[#C6A355]'
                          : 'bg-[#090D0B] border-[#23392E] text-[#A3ABA6]'
                      }`}
                    >
                      {c.shortLabel}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-[#C6A355] text-[#090D0B] font-semibold text-sm rounded-lg hover:bg-[#DFC07A] transition-colors"
            >
              Submit Seller & Founding 50 Application
            </button>
          </form>
        )}

        {authTab === 'buyer-register' && (
          <form
            onSubmit={handleBuyerRegistrationSubmit}
            className="border border-[#1E3329] bg-[#0D1512] rounded-xl p-5 sm:p-6 space-y-4 max-w-xl"
          >
            <h2 className="font-serif-display text-2xl font-semibold text-[#F5F3EE]">
              Create a Buyer Account
            </h2>
            <p className="text-xs text-[#A3ABA6]">
              Save favorite listings, store custom morph searches, and message breeders directly.
            </p>
            <div>
              <label className="block text-xs text-[#A3ABA6] mb-1">Full Name</label>
              <input
                type="text"
                required
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
                placeholder="Your name"
                className="w-full bg-[#090D0B] border border-[#23392E] rounded-lg px-3.5 py-2.5 text-xs text-[#F5F3EE]"
              />
            </div>
            <div>
              <label className="block text-xs text-[#A3ABA6] mb-1">Email Address</label>
              <input
                type="email"
                required
                value={buyerEmail}
                onChange={(e) => setBuyerEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-[#090D0B] border border-[#23392E] rounded-lg px-3.5 py-2.5 text-xs text-[#F5F3EE]"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-[#A3ABA6] mb-1">City</label>
                <input
                  type="text"
                  required
                  value={buyerCity}
                  onChange={(e) => setBuyerCity(e.target.value)}
                  placeholder="Austin"
                  className="w-full bg-[#090D0B] border border-[#23392E] rounded-lg px-3.5 py-2.5 text-xs text-[#F5F3EE]"
                />
              </div>
              <div>
                <label className="block text-xs text-[#A3ABA6] mb-1">State</label>
                <input
                  type="text"
                  required
                  maxLength={2}
                  value={buyerState}
                  onChange={(e) => setBuyerState(e.target.value.toUpperCase())}
                  className="w-full bg-[#090D0B] border border-[#23392E] rounded-lg px-3.5 py-2.5 text-xs text-[#F5F3EE]"
                />
              </div>
            </div>
            <button
              type="submit"
              className="w-full py-3 bg-[#C6A355] text-[#090D0B] font-semibold text-sm rounded-lg hover:bg-[#DFC07A] transition-colors"
            >
              Register Buyer Account
            </button>
          </form>
        )}

        {authTab === 'login' && (
          <form
            onSubmit={handleLoginSubmit}
            className="border border-[#1E3329] bg-[#0D1512] rounded-xl p-5 sm:p-6 space-y-4 max-w-xl"
          >
            <h2 className="font-serif-display text-2xl font-semibold text-[#F5F3EE]">
              Sign In to Buyer or Seller Account
            </h2>
            <p className="text-xs text-[#A3ABA6]">
              Enter your registered email address. Role permissions are verified on the backend.
            </p>
            <div>
              <label className="block text-xs text-[#A3ABA6] mb-1">Email Address</label>
              <input
                type="email"
                required
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="Enter registered email"
                className="w-full bg-[#090D0B] border border-[#23392E] rounded-lg px-3.5 py-2.5 text-xs text-[#F5F3EE]"
              />
            </div>
            <button
              type="submit"
              className="w-full py-3 bg-[#C6A355] text-[#090D0B] font-semibold text-sm rounded-lg hover:bg-[#DFC07A] transition-colors"
            >
              Sign In
            </button>
          </form>
        )}
      </div>
    );
  };

  // ==========================================================================
  // PAGE 5: SELLER DASHBOARD (CREATE, EDIT, REMOVE LISTINGS + INQUIRY INBOX)
  // ==========================================================================
  const [sellerTab, setSellerTab] = useState<'inventory' | 'inquiries'>('inventory');
  const [editingListingId, setEditingListingId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState<MarketplaceCategory>('Snakes');
  const [formSpeciesCommon, setFormSpeciesCommon] = useState('');
  const [formSpeciesScientific, setFormSpeciesScientific] = useState('');
  const [formMorph, setFormMorph] = useState('');
  const [formSex, setFormSex] = useState<SpecimenSex>('Female');
  const [formPrice, setFormPrice] = useState('650');
  const [formDescription, setFormDescription] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const renderSellerDashboardPage = () => {
    const sf = activeSellerStorefront;
    const plan =
      MEMBERSHIP_PLANS.find((p) => p.slug === sf.membershipTier) ||
      MEMBERSHIP_PLANS[0];
    const myListings = listings.filter((l) => l.storefrontId === sf.id);
    const activeCount = myListings.filter((l) => l.status === 'active').length;

    const populateEditForm = (item: MarketplaceListing) => {
      setEditingListingId(item.id);
      setFormTitle(item.title);
      setFormCategory(item.category);
      setFormSpeciesCommon(item.speciesCommon);
      setFormSpeciesScientific(item.speciesScientific);
      setFormMorph(item.morphGenetics);
      setFormSex(item.sex);
      setFormPrice(String(item.price));
      setFormDescription(item.description.replace(/^DEMONSTRATION LISTING — /, ''));
      setFormError(null);
    };

    const resetListingForm = () => {
      setEditingListingId(null);
      setFormTitle('');
      setFormSpeciesCommon('');
      setFormSpeciesScientific('');
      setFormMorph('');
      setFormPrice('650');
      setFormDescription('');
      setFormError(null);
    };

    const handleSaveListing = async (e: React.FormEvent) => {
      e.preventDefault();
      setFormError(null);

      const url = editingListingId
        ? `/api/listings/${editingListingId}`
        : '/api/listings';
      const method = editingListingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-serpent-user-id': sf.userId,
        },
        body: JSON.stringify({
          title: formTitle,
          category: formCategory,
          speciesCommon: formSpeciesCommon,
          speciesScientific: formSpeciesScientific,
          morphGenetics: formMorph,
          sex: formSex,
          price: Number(formPrice),
          description: formDescription,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || 'Could not save listing.');
        showToast('error', data.error || 'Blocked by moderation guardrail.');
        return;
      }

      if (editingListingId) {
        setListings((prev) =>
          prev.map((l) => (l.id === editingListingId ? data.listing : l))
        );
        showToast('success', 'Listing updated.');
      } else {
        setListings((prev) => [data.listing, ...prev]);
        showToast('success', 'New demonstration listing published.');
      }
      resetListingForm();
    };

    const handleDeleteListing = async (id: string) => {
      const res = await fetch(`/api/listings/${id}`, {
        method: 'DELETE',
        headers: { 'x-serpent-user-id': sf.userId },
      });
      if (res.ok) {
        setListings((prev) => prev.filter((l) => l.id !== id));
        showToast('success', 'Listing removed from marketplace.');
      }
    };

    const fillProhibitedTest = () => {
      setFormTitle('Adult Indonesian King Cobra');
      setFormCategory('Snakes');
      setFormSpeciesCommon('King Cobra');
      setFormSpeciesScientific('Ophiophagus hannah');
      setFormMorph('Wild Caught Venomous Elapid');
      setFormPrice('1200');
      setFormDescription('Testing prohibited venomous species filter.');
      setFormError(null);
    };

    return (
      <div className="space-y-6 sm:space-y-8 w-full max-w-full overflow-x-hidden">
        {/* Storefront Status & Membership Banner */}
        <div className="border border-[#1E3329] bg-[#0D1512] rounded-xl p-4 sm:p-6 flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs text-[#C6A355] mb-1">
              <span>
                {sf.isFoundingMember
                  ? `Founding 50 Breeder #${sf.founderNumber}`
                  : `Storefront Status: ${sf.approvalStatus.toUpperCase()}`}
              </span>
              <span>·</span>
              <span>Plan: {plan.name}</span>
              <span>·</span>
              <span className="font-tabular">
                Active Quota: {activeCount} /{' '}
                {plan.maxActiveListings === null ? 'Unlimited' : plan.maxActiveListings}
              </span>
            </div>
            <h1 className="font-serif-display text-2xl sm:text-3xl font-semibold text-[#F5F3EE] break-words">
              {sf.storefrontName} — Seller Dashboard
            </h1>
            <p className="text-xs text-[#A3ABA6] mt-1">{sf.permitDeclaration}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleOpenStorefront(sf.id)}
              className="px-3.5 py-2 text-xs font-medium border border-[#23392E] rounded-lg text-[#F5F3EE] hover:border-[#C6A355]"
            >
              Public Storefront
            </button>
            <button
              type="button"
              onClick={() => setActivePage('memberships')}
              className="px-3.5 py-2 text-xs font-semibold bg-[#C6A355] text-[#090D0B] rounded-lg hover:bg-[#DFC07A]"
            >
              Membership Plans
            </button>
          </div>
        </div>

        {/* Workspace Segmented Tabs */}
        <div className="flex flex-wrap items-center gap-2 p-1 bg-[#0D1512] border border-[#1E3329] rounded-lg w-fit max-w-full">
          <button
            type="button"
            onClick={() => setSellerTab('inventory')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors ${
              sellerTab === 'inventory'
                ? 'bg-[#C6A355] text-[#090D0B]'
                : 'text-[#A3ABA6] hover:text-[#F5F3EE]'
            }`}
          >
            Manage Listings ({myListings.length})
          </button>
          <button
            type="button"
            onClick={() => setSellerTab('inquiries')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors ${
              sellerTab === 'inquiries'
                ? 'bg-[#C6A355] text-[#090D0B]'
                : 'text-[#A3ABA6] hover:text-[#F5F3EE]'
            }`}
          >
            Seller Inquiry Inbox ({userRelevantInquiries.length})
          </button>
        </div>

        {sellerTab === 'inquiries' ? (
          <InquiryThreadPanel
            inquiries={userRelevantInquiries}
            currentUser={currentUser}
            perspective="seller"
            onSendMessage={handleSendInquiryMessage}
            onUpdateStatus={handleUpdateInquiryStatus}
            onSelectListing={handleOpenListing}
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
            {/* Left: Create / Edit Listing Form */}
            <form
              onSubmit={handleSaveListing}
              className="lg:col-span-5 border border-[#1E3329] bg-[#0D1512] rounded-xl p-4 sm:p-6 space-y-4 min-w-0"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-serif-display text-2xl font-semibold text-[#F5F3EE]">
                  {editingListingId ? 'Edit Listing' : 'Create New Listing'}
                </h2>
                <button
                  type="button"
                  onClick={fillProhibitedTest}
                  className="text-[11px] text-[#C6A355] underline"
                >
                  Test Prohibited Species Filter
                </button>
              </div>

              {formError && (
                <div className="p-3.5 rounded-lg bg-[#2C1215] border border-[#E5484D] text-xs text-[#FFD1D3] flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-[#E5484D] shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs text-[#A3ABA6] mb-1">Listing Title</label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Suriname Emerald Tree Boa Yearling"
                  className="w-full bg-[#090D0B] border border-[#23392E] rounded-lg px-3 py-2 text-xs text-[#F5F3EE]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[#A3ABA6] mb-1">Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) =>
                      setFormCategory(e.target.value as MarketplaceCategory)
                    }
                    className="w-full bg-[#090D0B] border border-[#23392E] rounded-lg px-3 py-2 text-xs text-[#F5F3EE]"
                  >
                    {MARKETPLACE_CATEGORIES.map((c) => (
                      <option key={c.name} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-[#A3ABA6] mb-1">Price (USD)</label>
                  <input
                    type="number"
                    required
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    className="w-full bg-[#090D0B] border border-[#23392E] rounded-lg px-3 py-2 text-xs font-tabular text-[#F5F3EE]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[#A3ABA6] mb-1">Common Species</label>
                  <input
                    type="text"
                    required
                    value={formSpeciesCommon}
                    onChange={(e) => setFormSpeciesCommon(e.target.value)}
                    placeholder="e.g. Ball Python"
                    className="w-full bg-[#090D0B] border border-[#23392E] rounded-lg px-3 py-2 text-xs text-[#F5F3EE]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#A3ABA6] mb-1">
                    Scientific Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formSpeciesScientific}
                    onChange={(e) => setFormSpeciesScientific(e.target.value)}
                    placeholder="e.g. Python regius"
                    className="w-full bg-[#090D0B] border border-[#23392E] rounded-lg px-3 py-2 text-xs text-[#F5F3EE]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[#A3ABA6] mb-1">Morph / Spec</label>
                  <input
                    type="text"
                    required
                    value={formMorph}
                    onChange={(e) => setFormMorph(e.target.value)}
                    placeholder="e.g. Banana Piebald"
                    className="w-full bg-[#090D0B] border border-[#23392E] rounded-lg px-3 py-2 text-xs text-[#F5F3EE]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#A3ABA6] mb-1">Sex</label>
                  <select
                    value={formSex}
                    onChange={(e) => setFormSex(e.target.value as SpecimenSex)}
                    className="w-full bg-[#090D0B] border border-[#23392E] rounded-lg px-3 py-2 text-xs text-[#F5F3EE]"
                  >
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Unsexed">Unsexed</option>
                    <option value="N/A">N/A</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs text-[#A3ABA6] mb-1">
                  Description & Lineage Notes
                </label>
                <textarea
                  rows={3}
                  required
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Describe feeding history, dam/sire genetics, and temperament..."
                  className="w-full bg-[#090D0B] border border-[#23392E] rounded-lg p-3 text-xs text-[#F5F3EE]"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-4 bg-[#C6A355] text-[#090D0B] font-semibold text-xs rounded-lg hover:bg-[#DFC07A] inline-flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4 shrink-0" />
                  <span>
                    {editingListingId ? 'Save Changes' : 'Publish Listing'}
                  </span>
                </button>
                {editingListingId && (
                  <button
                    type="button"
                    onClick={resetListingForm}
                    className="px-3.5 py-2.5 text-xs text-[#A3ABA6] border border-[#23392E] rounded-lg"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>

            {/* Right: Active Storefront Inventory */}
            <div className="lg:col-span-7 space-y-4 min-w-0">
              {myListings.map((item) => (
                <div
                  key={item.id}
                  className="border border-[#1E3329] bg-[#0D1512] rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 min-w-0"
                >
                  <div className="flex items-center gap-3.5 min-w-0 w-full sm:w-auto">
                    <ResilientImage
                      src={item.primaryImageUrl}
                      alt={item.title}
                      className="w-16 h-14 sm:w-20 sm:h-16 rounded-lg object-cover shrink-0 border border-[#1E3329]"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5 text-xs text-[#C6A355]">
                        <span>{item.category}</span>
                        <span>·</span>
                        <span className="font-tabular">${item.price.toLocaleString()}</span>
                      </div>
                      <h3 className="font-serif-display text-lg sm:text-xl font-semibold text-[#F5F3EE] truncate">
                        {item.title}
                      </h3>
                      <p className="text-xs text-[#A3ABA6] truncate">
                        {item.speciesCommon} · {item.morphGenetics}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => populateEditForm(item)}
                      className="px-3 py-1.5 text-xs border border-[#23392E] rounded-lg text-[#F5F3EE] hover:border-[#C6A355] inline-flex items-center gap-1"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteListing(item.id)}
                      className="px-3 py-1.5 text-xs border border-[#3A1D20] rounded-lg text-[#F28B8E] hover:bg-[#2C1215] inline-flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // ==========================================================================
  // PAGE 6: PUBLIC BREEDER STOREFRONTS (DIRECTORY & INDIVIDUAL VIEW)
  // ==========================================================================
  const renderBreedersDirectoryPage = () => (
    <div className="space-y-6 sm:space-y-8 w-full max-w-full overflow-x-hidden">
      <div className="border-b border-[#1E3329] pb-5">
        <p className="text-xs text-[#C6A355] mb-1">
          Sample Demonstration Storefront Directory · {foundingProgram.remainingSpots} Founding Breeder Spots Available
        </p>
        <h1 className="font-serif-display text-3xl sm:text-4xl font-semibold text-[#F5F3EE]">
          Public Breeder Storefronts
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
        {storefronts
          .filter((s) => s.approvalStatus === 'approved')
          .map((sf) => {
            const count = listings.filter(
              (l) => l.storefrontId === sf.id && l.status === 'active'
            ).length;
            return (
              <div
                key={sf.id}
                className="border border-[#1E3329] bg-[#0D1512] rounded-xl p-5 sm:p-6 flex flex-col justify-between space-y-5 min-w-0"
              >
                <div className="space-y-2 min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#C6A355]">
                    <span>
                      {sf.isFoundingMember
                        ? `Founding 50 Breeder #${sf.founderNumber}`
                        : 'Sample Demonstration Storefront'}
                    </span>
                    <span className="font-tabular">{count} Sample Listings</span>
                  </div>
                  <h2 className="font-serif-display text-2xl font-semibold text-[#F5F3EE] break-words">
                    {sf.storefrontName}
                  </h2>
                  <p className="text-xs text-[#F5F3EE]/90">{sf.tagline}</p>
                  <p className="text-xs text-[#A3ABA6] leading-relaxed">{sf.bio}</p>
                </div>

                <div className="pt-4 border-t border-[#1E3329] flex flex-wrap items-center justify-between gap-3">
                  <span className="text-xs text-[#8E9892]">
                    {sf.locationCity}, {sf.locationState}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleOpenStorefront(sf.id)}
                    className="px-4 py-2 bg-[#C6A355] text-[#090D0B] text-xs font-semibold rounded-lg hover:bg-[#DFC07A]"
                  >
                    Open Storefront
                  </button>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );

  const renderStorefrontDetailPage = () => {
    const sf =
      storefronts.find((s) => s.id === selectedStorefrontId) || storefronts[0];
    const sfListings = listings.filter(
      (l) => l.storefrontId === sf.id && l.status === 'active'
    );

    return (
      <div className="space-y-6 sm:space-y-8 w-full max-w-full overflow-x-hidden">
        <div className="border border-[#1E3329] bg-[#0D1512] rounded-2xl p-5 sm:p-8 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#C6A355]">
            <span>
              {sf.isFoundingMember
                ? `Founding 50 Breeder #${sf.founderNumber}`
                : 'Sample Demonstration Storefront (Not a Real Verified Breeder)'}
            </span>
            <span>
              {sf.locationCity}, {sf.locationState}
            </span>
          </div>
          <h1 className="font-serif-display text-2xl sm:text-4xl font-semibold text-[#F5F3EE] break-words">
            {sf.storefrontName}
          </h1>
          <p className="text-sm text-[#D5DDD8] max-w-3xl leading-relaxed">{sf.bio}</p>
          <div className="pt-3 border-t border-[#1E3329] flex flex-wrap items-center gap-3 text-xs text-[#A3ABA6]">
            <span>{sf.permitDeclaration}</span>
            <span>·</span>
            <span className="text-[#A7D7B8]">Live Arrival Guarantee Template</span>
          </div>
        </div>

        <h2 className="font-serif-display text-2xl font-semibold text-[#F5F3EE]">
          Storefront Sample Listings ({sfListings.length})
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 sm:gap-6">
          {sfListings.map((item) => (
            <ListingCard
              key={item.id}
              listing={item}
              isFavorited={favorites.includes(item.id)}
              onToggleFavorite={() => handleToggleFavorite(item.id)}
              onOpen={() => handleOpenListing(item.id)}
            />
          ))}
        </div>
      </div>
    );
  };

  // ==========================================================================
  // PAGE 7: MEMBERSHIP PRICING PAGE
  // ==========================================================================
  const [previewFounderDiscount, setPreviewFounderDiscount] = useState(true);

  const renderMembershipsPage = () => {
    const handleSelectPlan = async (tierSlug: MembershipTierSlug) => {
      const res = await fetch(
        `/api/storefronts/${activeSellerStorefront.id}/membership`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'x-serpent-user-id': activeSellerStorefront.userId,
          },
          body: JSON.stringify({ tierSlug }),
        }
      );
      if (res.ok) {
        const data = await res.json();
        setStorefronts((prev) =>
          prev.map((s) => (s.id === data.storefront.id ? data.storefront : s))
        );
        showToast(
          'success',
          `Updated ${activeSellerStorefront.storefrontName} to ${tierSlug.replace('_', ' ')} membership.`
        );
      }
    };

    return (
      <div className="space-y-8 sm:space-y-10 w-full max-w-full overflow-x-hidden">
        <div className="border-b border-[#1E3329] pb-6 flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs text-[#C6A355] mb-1">
              0% Transaction Commissions · {foundingProgram.remainingSpots} Founding Breeder Spots Available
            </p>
            <h1 className="font-serif-display text-3xl sm:text-5xl font-semibold text-[#F5F3EE]">
              Seller Membership Plans
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-[#0D1512] border border-[#1E3329] rounded-lg">
            <button
              type="button"
              onClick={() => setPreviewFounderDiscount(false)}
              className={`px-3 py-1.5 text-xs font-medium rounded ${
                !previewFounderDiscount
                  ? 'bg-[#C6A355] text-[#090D0B] font-semibold'
                  : 'text-[#A3ABA6]'
              }`}
            >
              Standard Monthly
            </button>
            <button
              type="button"
              onClick={() => setPreviewFounderDiscount(true)}
              className={`px-3 py-1.5 text-xs font-medium rounded ${
                previewFounderDiscount
                  ? 'bg-[#C6A355] text-[#090D0B] font-semibold'
                  : 'text-[#A3ABA6]'
              }`}
            >
              Founding 50 (25% Off for Life)
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-5">
          {MEMBERSHIP_PLANS.map((plan) => {
            const isCurrent = activeSellerStorefront.membershipTier === plan.slug;
            const displayPrice = previewFounderDiscount
              ? plan.founderMonthlyPrice
              : plan.monthlyPrice;

            return (
              <div
                key={plan.slug}
                className={`border rounded-xl p-5 sm:p-6 flex flex-col justify-between min-w-0 ${
                  plan.slug === 'sorcerer'
                    ? 'border-[#C6A355] bg-[#101D17]'
                    : 'border-[#1E3329] bg-[#0D1512]'
                }`}
              >
                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-[#C6A355] font-medium">
                      {plan.maxActiveListings === null
                        ? 'Unlimited Active Listings'
                        : `${plan.maxActiveListings} Active Listings`}
                    </p>
                    <h2 className="font-serif-display text-2xl font-semibold text-[#F5F3EE] mt-0.5">
                      {plan.name}
                    </h2>
                  </div>

                  <div>
                    <span className="font-tabular text-3xl font-semibold text-[#F5F3EE]">
                      {displayPrice === 0 ? 'Free' : `$${displayPrice.toFixed(2)}`}
                    </span>
                    {displayPrice > 0 && (
                      <span className="text-xs text-[#A3ABA6]"> / month</span>
                    )}
                    {previewFounderDiscount && plan.monthlyPrice > 0 && (
                      <p className="text-[11px] text-[#A7D7B8] mt-1 font-tabular">
                        Standard ${plan.monthlyPrice.toFixed(2)}/mo · 25% Founder Discount
                      </p>
                    )}
                  </div>

                  <p className="text-xs text-[#A3ABA6] leading-relaxed">
                    {plan.tagline}
                  </p>

                  <ul className="space-y-2 pt-3 border-t border-[#1E3329] text-xs text-[#D5DDD8]">
                    {plan.features.map((feat) => (
                      <li key={feat} className="flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#C6A355] shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={() => handleSelectPlan(plan.slug)}
                  className={`mt-6 w-full py-2.5 px-3 rounded-lg text-xs font-semibold transition-colors ${
                    isCurrent
                      ? 'bg-[#1B3126] text-[#C6A355] border border-[#C6A355]/50'
                      : 'bg-[#C6A355] text-[#090D0B] hover:bg-[#DFC07A]'
                  }`}
                >
                  {isCurrent ? 'Current Tier' : `Select ${plan.name}`}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ==========================================================================
  // PAGE 9: ADMIN DASHBOARD (RESTRICTED TO BACKEND-AUTHORIZED ADMIN ONLY)
  // ==========================================================================
  const renderAdminDashboardPage = () => {
    const handleApproveSeller = async (storefrontId: string) => {
      const res = await fetch(`/api/admin/storefronts/${storefrontId}/approve`, {
        method: 'POST',
        headers: { 'x-serpent-user-id': currentUser.id },
      });
      if (res.ok) {
        const data = await res.json();
        setStorefronts((prev) =>
          prev.map((s) => (s.id === storefrontId ? data.storefront : s))
        );
        if (data.foundingProgram) setFoundingProgram(data.foundingProgram);
        showToast('success', 'Storefront approved on backend.');
      }
    };

    const handleModerateListing = async (
      listingId: string,
      status: ListingStatus
    ) => {
      const res = await fetch(`/api/admin/listings/${listingId}/moderate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-serpent-user-id': currentUser.id,
        },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        const data = await res.json();
        setListings((prev) =>
          prev.map((l) => (l.id === listingId ? data.listing : l))
        );
        showToast('success', `Listing status updated to ${status}.`);
      }
    };

    if (currentUser.role !== 'admin') {
      return (
        <div className="border border-[#1E3329] bg-[#0D1512] rounded-xl p-6 sm:p-8 text-center space-y-3">
          <h1 className="font-serif-display text-2xl text-[#F5F3EE]">
            Administrator Access Required
          </h1>
          <p className="text-xs text-[#A3ABA6] max-w-md mx-auto leading-relaxed">
            Admin privileges are assigned strictly through backend authentication and are never exposed via public frontend role controls.
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-6 sm:space-y-8 w-full max-w-full overflow-x-hidden">
        <div className="border-b border-[#1E3329] pb-5">
          <h1 className="font-serif-display text-2xl sm:text-4xl font-semibold text-[#F5F3EE]">
            Admin Moderation Console
          </h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {storefronts.map((sf) => (
            <div
              key={sf.id}
              className="border border-[#1E3329] bg-[#0D1512] rounded-xl p-4 flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#F5F3EE] truncate">
                  {sf.storefrontName}
                </p>
                <p className="text-xs text-[#A3ABA6]">Status: {sf.approvalStatus}</p>
              </div>
              {sf.approvalStatus !== 'approved' && (
                <button
                  type="button"
                  onClick={() => handleApproveSeller(sf.id)}
                  className="px-3 py-1.5 bg-[#C6A355] text-[#090D0B] text-xs font-semibold rounded-lg shrink-0"
                >
                  Approve
                </button>
              )}
            </div>
          ))}
        </div>
        <div className="space-y-3">
          {listings.map((item) => (
            <div
              key={item.id}
              className="border border-[#1E3329] bg-[#0D1512] rounded-xl p-4 flex flex-wrap items-center justify-between gap-3"
            >
              <span className="text-xs text-[#F5F3EE] truncate">{item.title}</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleModerateListing(item.id, 'active')}
                  className="px-2.5 py-1 text-xs border border-[#23392E] rounded text-[#A7D7B8]"
                >
                  Approve
                </button>
                <button
                  type="button"
                  onClick={() => handleModerateListing(item.id, 'rejected')}
                  className="px-2.5 py-1 text-xs border border-[#3A1D20] rounded text-[#F28B8E]"
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ==========================================================================
  // PAGE 10: BUYER ACCOUNT (INQUIRY INBOX, FAVORITES & SAVED SEARCHES)
  // ==========================================================================
  const [buyerTab, setBuyerTab] = useState<'inquiries' | 'favorites' | 'searches'>(
    'inquiries'
  );

  const renderBuyerAccountPage = () => {
    const favoriteListings = listings.filter((l) => favorites.includes(l.id));

    const handleApplySavedSearch = (s: SavedSearch) => {
      setFilterCategory(s.category || 'All');
      setFilterSpecies(s.speciesQuery || '');
      setFilterMorph(s.morphQuery || '');
      setFilterSex(s.sex || 'All');
      setFilterMaxPrice(s.maxPrice ? String(s.maxPrice) : '');
      setFilterShipping(s.shippingOption || 'All');
      setActivePage('marketplace');
    };

    const handleDeleteSavedSearch = async (id: string) => {
      const res = await fetch(`/api/saved-searches/${id}`, {
        method: 'DELETE',
        headers: { 'x-serpent-user-id': currentUser.id },
      });
      if (res.ok) {
        const data = await res.json();
        setSavedSearches(data.savedSearches);
      } else {
        setSavedSearches((prev) => prev.filter((item) => item.id !== id));
      }
    };

    return (
      <div className="space-y-6 sm:space-y-8 w-full max-w-full overflow-x-hidden">
        <div className="border-b border-[#1E3329] pb-5 flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs text-[#C6A355] mb-1">
              Buyer Account · {currentUser.fullName}
            </p>
            <h1 className="font-serif-display text-2xl sm:text-4xl font-semibold text-[#F5F3EE]">
              Buyer Inbox, Favorites & Saved Searches
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 p-1 bg-[#0D1512] border border-[#1E3329] rounded-lg w-fit max-w-full">
          <button
            type="button"
            onClick={() => setBuyerTab('inquiries')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors ${
              buyerTab === 'inquiries'
                ? 'bg-[#C6A355] text-[#090D0B]'
                : 'text-[#A3ABA6] hover:text-[#F5F3EE]'
            }`}
          >
            Inquiry Inbox ({inquiries.length})
          </button>
          <button
            type="button"
            onClick={() => setBuyerTab('favorites')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors ${
              buyerTab === 'favorites'
                ? 'bg-[#C6A355] text-[#090D0B]'
                : 'text-[#A3ABA6] hover:text-[#F5F3EE]'
            }`}
          >
            Favorites ({favoriteListings.length})
          </button>
          <button
            type="button"
            onClick={() => setBuyerTab('searches')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors ${
              buyerTab === 'searches'
                ? 'bg-[#C6A355] text-[#090D0B]'
                : 'text-[#A3ABA6] hover:text-[#F5F3EE]'
            }`}
          >
            Saved Searches ({savedSearches.length})
          </button>
        </div>

        {buyerTab === 'inquiries' && (
          <InquiryThreadPanel
            inquiries={inquiries}
            currentUser={currentUser}
            perspective="buyer"
            onSendMessage={handleSendInquiryMessage}
            onUpdateStatus={handleUpdateInquiryStatus}
            onSelectListing={handleOpenListing}
          />
        )}

        {buyerTab === 'favorites' && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 sm:gap-6">
            {favoriteListings.length === 0 ? (
              <div className="col-span-full border border-[#1E3329] bg-[#0D1512] rounded-xl p-8 text-center">
                <p className="font-serif-display text-2xl text-[#F5F3EE]">
                  No Favorited Listings Yet
                </p>
                <p className="text-xs text-[#A3ABA6] mt-1">
                  Tap the heart icon on any marketplace listing to bookmark it here.
                </p>
              </div>
            ) : (
              favoriteListings.map((item) => (
                <ListingCard
                  key={item.id}
                  listing={item}
                  isFavorited={true}
                  onToggleFavorite={() => handleToggleFavorite(item.id)}
                  onOpen={() => handleOpenListing(item.id)}
                />
              ))
            )}
          </div>
        )}

        {buyerTab === 'searches' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {savedSearches.length === 0 ? (
              <div className="col-span-full border border-[#1E3329] bg-[#0D1512] rounded-xl p-8 text-center">
                <p className="font-serif-display text-2xl text-[#F5F3EE]">
                  No Saved Searches Yet
                </p>
                <p className="text-xs text-[#A3ABA6] mt-1">
                  Use the "Save Search" button on the Browse Marketplace page to store your custom filters.
                </p>
              </div>
            ) : (
              savedSearches.map((s) => (
                <div
                  key={s.id}
                  className="border border-[#1E3329] bg-[#0D1512] rounded-xl p-4 sm:p-5 flex items-center justify-between gap-4 min-w-0"
                >
                  <div className="min-w-0">
                    <p className="text-xs text-[#C6A355] truncate">
                      {s.category} · Sex: {s.sex} · Max:{' '}
                      {s.maxPrice ? `$${s.maxPrice}` : 'Any'}
                    </p>
                    <h3 className="font-serif-display text-xl font-semibold text-[#F5F3EE] truncate">
                      {s.label}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleApplySavedSearch(s)}
                      className="px-3.5 py-2 bg-[#C6A355] text-[#090D0B] text-xs font-semibold rounded-lg"
                    >
                      Run
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteSavedSearch(s.id)}
                      className="p-2 text-[#A3ABA6] hover:text-[#F28B8E]"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <MainLayout
      activePage={activePage}
      onNavigate={(page) => {
        setActivePage(page);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }}
      currentUser={currentUser}
      unreadInquiryCount={inquiries.length}
      favoritesCount={favorites.length}
      foundingRemaining={foundingProgram.remainingSpots}
    >
      {toastMessage && (
        <div
          className={`mb-6 px-4 py-3 rounded-xl border text-xs flex items-center justify-between gap-3 ${
            toastMessage.type === 'error'
              ? 'bg-[#2C1215] border-[#E5484D] text-[#FFD1D3]'
              : 'bg-[#13261D] border-[#C6A355] text-[#F5F3EE]'
          }`}
        >
          <span className="break-words">{toastMessage.text}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-[#C6A355] font-semibold shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {activePage === 'home' && renderHomePage()}
      {activePage === 'marketplace' && renderMarketplacePage()}
      {activePage === 'listing-detail' && renderListingDetailPage()}
      {activePage === 'seller-auth' && renderSellerAuthAndFoundingPage(false)}
      {activePage === 'founding-50' && renderSellerAuthAndFoundingPage(true)}
      {activePage === 'seller-dashboard' && renderSellerDashboardPage()}
      {activePage === 'breeders' && renderBreedersDirectoryPage()}
      {activePage === 'storefront-detail' && renderStorefrontDetailPage()}
      {activePage === 'memberships' && renderMembershipsPage()}
      {activePage === 'admin-dashboard' && renderAdminDashboardPage()}
      {activePage === 'buyer-account' && renderBuyerAccountPage()}
      {activePage === 'schema-docs' && <SupabaseSchemaExplorer />}
    </MainLayout>
  );
}

// ============================================================================
// ATTRACTIVE BESPOKE CATEGORY EMBLEM SVGs
// ============================================================================
const CategoryEmblem: React.FC<{ category: MarketplaceCategory }> = ({ category }) => {
  switch (category) {
    case 'Snakes':
      return (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
          <path d="M12 3c-4 0-7 2.5-7 6 0 3 3 4.5 6 5.5s5 2.5 5 4.5c0 1.5-1.5 2-3 2-2 0-3.5-1-4-2.5" />
          <circle cx="12" cy="6.5" r="1" fill="currentColor" />
        </svg>
      );
    case 'Lizards and Geckos':
      return (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
          <path d="M17 4c-3 1-6 4-7 8-1 4-3 7-6 8" />
          <path d="M14 7l4-1M10 12l5 1M8 15l-4-2M12 9L8 6" />
        </svg>
      );
    case 'Amphibians':
      return (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
          <ellipse cx="12" cy="13" rx="6" ry="5" />
          <circle cx="9.5" cy="7.5" r="1.5" />
          <circle cx="14.5" cy="7.5" r="1.5" />
          <path d="M6 15l-3 3M18 15l3 3" />
        </svg>
      );
    case 'Turtles and Tortoises':
      return (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
          <path d="M5 15a7 7 0 0 1 14 0H5z" />
          <path d="M19 13l2-1M7 15l-1 3M17 15l1 3" />
        </svg>
      );
    case 'Live Feeder Insects':
      return (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
          <ellipse cx="12" cy="13" rx="4" ry="6" />
          <path d="M9 6L7 3M15 6l2-3M8 11l-3-1M16 11l3-1M8 15l-3 1M16 15l3 1" />
        </svg>
      );
    case 'Frozen Feeders':
      return (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
          <path d="M12 3v18M4.5 7.5l15 9M19.5 7.5l-15 9" />
        </svg>
      );
    case 'Reptile Enclosures and Equipment':
      return (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="M3 9h18M12 9v10" />
        </svg>
      );
    case 'Bioactive Supplies and Plants':
      return (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
          <path d="M12 20V10" />
          <path d="M12 14c-4 0-6-3-6-7 4 0 6 3 6 7z" />
          <path d="M12 12c4 0 6-3 6-7-4 0-6 3-6 7z" />
        </svg>
      );
  }
};

// ============================================================================
// REUSABLE PRODUCT LISTING CARD (Responsive, Clearly Marked Sample Demo)
// ============================================================================
const ListingCard: React.FC<{
  listing: MarketplaceListing;
  isFavorited: boolean;
  onToggleFavorite: () => void;
  onOpen: () => void;
}> = ({ listing, isFavorited, onToggleFavorite, onOpen }) => {
  return (
    <div className="group border border-[#1E3329] bg-[#0D1512] rounded-xl overflow-hidden flex flex-col justify-between transition-transform duration-150 hover:-translate-y-0.5 hover:border-[#C6A355]/50 min-w-0">
      <div className="min-w-0">
        <div className="relative aspect-[4/3] w-full bg-[#090D0B] overflow-hidden">
          <button
            type="button"
            onClick={onOpen}
            className="w-full h-full block text-left"
          >
            <ResilientImage
              src={listing.primaryImageUrl}
              alt={listing.title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            />
          </button>
          <button
            type="button"
            onClick={onToggleFavorite}
            aria-label="Toggle favorite"
            className="absolute top-3 right-3 w-9 h-9 rounded-full bg-[#090D0B]/80 backdrop-blur-sm border border-[#1E3329] flex items-center justify-center text-[#F5F3EE] hover:text-[#C6A355] transition-colors"
          >
            <Heart
              className={`w-4 h-4 ${
                isFavorited ? 'fill-[#C6A355] text-[#C6A355]' : ''
              }`}
            />
          </button>
        </div>

        <div className="p-4 sm:p-5 space-y-2 min-w-0">
          {/* Clean Unboxed Metadata with Typographic Separators */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-[#C6A355]">
            <span>{listing.category}</span>
            <span aria-hidden="true">·</span>
            <span className="text-[#A3ABA6]">{listing.sex}</span>
            <span aria-hidden="true">·</span>
            <span className="text-[#8E9892]">Sample Demo</span>
          </div>

          <button
            type="button"
            onClick={onOpen}
            className="text-left block w-full min-w-0"
          >
            <h3 className="font-serif-display text-lg sm:text-xl font-semibold text-[#F5F3EE] group-hover:text-[#C6A355] transition-colors line-clamp-1">
              {listing.title}
            </h3>
          </button>

          <p className="text-xs text-[#A3ABA6] line-clamp-1">
            {listing.speciesCommon} · {listing.morphGenetics}
          </p>
        </div>
      </div>

      <div className="px-4 sm:px-5 pb-4 sm:pb-5 pt-3 border-t border-[#1E3329]/80 flex items-center justify-between gap-2 min-w-0">
        <div className="min-w-0">
          <span className="font-tabular text-lg font-semibold text-[#F5F3EE]">
            ${listing.price.toLocaleString()}
          </span>
          <p className="text-[11px] text-[#8E9892] truncate">
            {listing.sellerName} ({listing.locationState})
          </p>
        </div>

        <button
          type="button"
          onClick={onOpen}
          className="px-3 py-2 bg-[#13221B] group-hover:bg-[#C6A355] text-[#F5F3EE] group-hover:text-[#090D0B] text-xs font-semibold rounded-lg border border-[#243E31] transition-colors whitespace-nowrap shrink-0"
        >
          View / Inquire
        </button>
      </div>
    </div>
  );
};
