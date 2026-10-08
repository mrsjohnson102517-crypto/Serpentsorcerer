import React from 'react';
import {
  Compass,
  Store,
  Crown,
  Sparkles,
  Heart,
  LayoutDashboard,
  ShieldCheck,
  Database,
  MessageSquare,
  UserCheck,
  Home,
} from 'lucide-react';
import { UserAccount } from '../types/marketplace';

export type AppPage =
  | 'home'
  | 'marketplace'
  | 'listing-detail'
  | 'breeders'
  | 'storefront-detail'
  | 'memberships'
  | 'founding-50'
  | 'seller-auth'
  | 'seller-dashboard'
  | 'buyer-account'
  | 'admin-dashboard'
  | 'schema-docs';

interface MainLayoutProps {
  activePage: AppPage;
  onNavigate: (page: AppPage) => void;
  currentUser: UserAccount;
  unreadInquiryCount: number;
  favoritesCount: number;
  foundingRemaining: number;
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  activePage,
  onNavigate,
  currentUser,
  unreadInquiryCount,
  favoritesCount,
  foundingRemaining,
  children,
}) => {
  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden flex flex-col bg-[#090D0B] text-[#F5F3EE] pb-16 md:pb-0">
      {/* ====================================================================
          TOP NAVIGATION HEADER (3-Zone Contract: Brand · Nav Links · Actions)
          ==================================================================== */}
      <header className="sticky top-0 z-40 h-14 w-full bg-[#090D0B]/95 backdrop-blur-md border-b border-[#1E3329] px-3 sm:px-6 lg:px-8 flex items-center justify-between gap-2">
        {/* Zone 1: Single Text Element Wordmark */}
        <button
          type="button"
          onClick={() => onNavigate('home')}
          className="font-serif-display text-xl sm:text-2xl font-semibold tracking-tight text-[#F5F3EE] hover:text-[#C6A355] transition-colors whitespace-nowrap shrink-0"
        >
          Serpent Sorcerer
        </button>

        {/* Zone 2: Primary Navigation Links */}
        <nav className="hidden md:flex items-center gap-5 lg:gap-6 text-sm font-medium text-[#A3ABA6] min-w-0">
          <button
            type="button"
            onClick={() => onNavigate('marketplace')}
            className={`py-1 transition-colors whitespace-nowrap border-b-2 ${
              activePage === 'marketplace' || activePage === 'listing-detail'
                ? 'text-[#F5F3EE] border-[#C6A355]'
                : 'border-transparent hover:text-[#F5F3EE]'
            }`}
          >
            Marketplace
          </button>
          <button
            type="button"
            onClick={() => onNavigate('breeders')}
            className={`py-1 transition-colors whitespace-nowrap border-b-2 ${
              activePage === 'breeders' || activePage === 'storefront-detail'
                ? 'text-[#F5F3EE] border-[#C6A355]'
                : 'border-transparent hover:text-[#F5F3EE]'
            }`}
          >
            Breeders
          </button>
          <button
            type="button"
            onClick={() => onNavigate('memberships')}
            className={`py-1 transition-colors whitespace-nowrap border-b-2 ${
              activePage === 'memberships'
                ? 'text-[#F5F3EE] border-[#C6A355]'
                : 'border-transparent hover:text-[#F5F3EE]'
            }`}
          >
            Memberships
          </button>
          <button
            type="button"
            onClick={() => onNavigate('founding-50')}
            className={`py-1 transition-colors whitespace-nowrap border-b-2 ${
              activePage === 'founding-50'
                ? 'text-[#C6A355] border-[#C6A355]'
                : 'border-transparent text-[#C6A355]/90 hover:text-[#C6A355]'
            }`}
          >
            Founding 50
          </button>
          <button
            type="button"
            onClick={() => onNavigate('schema-docs')}
            className={`hidden xl:inline-block py-1 transition-colors whitespace-nowrap border-b-2 ${
              activePage === 'schema-docs'
                ? 'text-[#F5F3EE] border-[#C6A355]'
                : 'border-transparent hover:text-[#F5F3EE]'
            }`}
          >
            Supabase Schema
          </button>
        </nav>

        {/* Zone 3: 2 Primary Actions (Inbox + Account / Sign In) */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() =>
              onNavigate(
                currentUser.role === 'seller' ? 'seller-dashboard' : 'buyer-account'
              )
            }
            className="px-2.5 sm:px-3 py-1.5 text-xs font-medium text-[#F5F3EE] bg-[#12211A] border border-[#233B2E] rounded-lg hover:border-[#C6A355] transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <MessageSquare className="w-3.5 h-3.5 text-[#C6A355] shrink-0" />
            <span>Inbox ({unreadInquiryCount})</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('seller-auth')}
            className="px-2.5 sm:px-3.5 py-1.5 text-xs font-semibold text-[#090D0B] bg-[#C6A355] rounded-lg hover:bg-[#DFC07A] transition-colors whitespace-nowrap shrink-0"
          >
            Sign In / Register
          </button>
        </div>
      </header>

      {/* ====================================================================
          MAIN BODY: RESPONSIVE SIDEBAR RAIL (Desktop) + CONTENT OUTLET
          ==================================================================== */}
      <div className="flex-1 flex flex-col lg:flex-row max-w-[1440px] w-full mx-auto min-w-0">
        {/* Desktop Left Navigation Sidebar */}
        <aside className="hidden lg:flex lg:w-64 shrink-0 flex-col justify-between border-r border-[#1E3329] bg-[#0B110E] p-5">
          <div className="space-y-6">
            <div className="pb-4 border-b border-[#1E3329]">
              <div className="flex items-center gap-2.5 text-[#C6A355] mb-1">
                <svg
                  className="w-5 h-5 shrink-0"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path d="M12 2a4 4 0 0 1 4 4c0 2.5-2.5 4-5 5.5S6 14.5 6 17a4 4 0 0 0 4 4c2.5 0 4.5-1.5 5-3.5" />
                  <path d="M19 5l1 2 2 1-2 1-1 2-1-2-2-1 2-1 1-2z" />
                </svg>
                <span className="text-xs font-medium tracking-wide text-[#C6A355]">
                  Sanctum Navigation
                </span>
              </div>
              <p className="text-[11px] text-[#8E9892] leading-relaxed">
                {foundingRemaining} Founding Breeder Spots Available · 0% Commission
              </p>
            </div>

            {/* Primary Navigation */}
            <div className="space-y-1">
              <p className="px-2.5 text-[11px] font-medium text-[#8E9892] mb-1.5">
                Marketplace & Storefronts
              </p>
              <SidebarNavButton
                active={activePage === 'home'}
                onClick={() => onNavigate('home')}
                icon={<Home className="w-4 h-4" />}
                label="Homepage"
              />
              <SidebarNavButton
                active={activePage === 'marketplace' || activePage === 'listing-detail'}
                onClick={() => onNavigate('marketplace')}
                icon={<Compass className="w-4 h-4" />}
                label="Browse Marketplace"
              />
              <SidebarNavButton
                active={activePage === 'breeders' || activePage === 'storefront-detail'}
                onClick={() => onNavigate('breeders')}
                icon={<Store className="w-4 h-4" />}
                label="Breeder Storefronts"
              />
              <SidebarNavButton
                active={activePage === 'memberships'}
                onClick={() => onNavigate('memberships')}
                icon={<Crown className="w-4 h-4" />}
                label="Membership Pricing"
              />
              <SidebarNavButton
                active={activePage === 'founding-50'}
                onClick={() => onNavigate('founding-50')}
                icon={<Sparkles className="w-4 h-4" />}
                label="Founding 50 Registry"
              />
            </div>

            <div className="space-y-1 pt-4 border-t border-[#1E3329]">
              <p className="px-2.5 text-[11px] font-medium text-[#8E9892] mb-1.5">
                Accounts & Dashboards
              </p>
              <SidebarNavButton
                active={activePage === 'buyer-account'}
                onClick={() => onNavigate('buyer-account')}
                icon={<Heart className="w-4 h-4" />}
                label={`Buyer Account (${favoritesCount})`}
              />
              <SidebarNavButton
                active={activePage === 'seller-dashboard'}
                onClick={() => onNavigate('seller-dashboard')}
                icon={<LayoutDashboard className="w-4 h-4" />}
                label="Seller Dashboard"
              />
              <SidebarNavButton
                active={activePage === 'seller-auth'}
                onClick={() => onNavigate('seller-auth')}
                icon={<UserCheck className="w-4 h-4" />}
                label="Registration & Login"
              />
              {currentUser.role === 'admin' && (
                <SidebarNavButton
                  active={activePage === 'admin-dashboard'}
                  onClick={() => onNavigate('admin-dashboard')}
                  icon={<ShieldCheck className="w-4 h-4" />}
                  label="Admin Moderation"
                />
              )}
              <SidebarNavButton
                active={activePage === 'schema-docs'}
                onClick={() => onNavigate('schema-docs')}
                icon={<Database className="w-4 h-4" />}
                label="Supabase DB Schema"
              />
            </div>
          </div>

          {/* Active Session Summary (No Frontend Role-Switching Controls) */}
          <div className="pt-5 border-t border-[#1E3329] space-y-2">
            <p className="text-xs font-medium text-[#F5F3EE]">
              Signed-In Account
            </p>
            <p className="text-[11px] text-[#8E9892] truncate">
              <strong className="text-[#C6A355]">{currentUser.fullName}</strong> ({currentUser.role})
            </p>
            <button
              type="button"
              onClick={() => onNavigate('seller-auth')}
              className="w-full py-1.5 px-3 text-xs font-medium text-[#F5F3EE] bg-[#122019] border border-[#23392E] rounded-lg hover:border-[#C6A355] transition-colors"
            >
              Switch / Register Account
            </button>
          </div>
        </aside>

        {/* Page Content Outlet */}
        <main className="flex-1 min-w-0 w-full max-w-full overflow-x-hidden px-3.5 sm:px-6 lg:px-10 py-5 md:py-8">
          {/* Compact Mobile Sub-Navigation Bar (Responsive, Never Overflows) */}
          <div className="flex lg:hidden flex-wrap items-center justify-between gap-2 mb-5 pb-3 border-b border-[#1E3329] text-xs">
            <span className="text-[#C6A355] font-medium truncate">
              {foundingRemaining} Founding Breeder Spots Available
            </span>
            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => onNavigate('memberships')}
                className="text-[#A3ABA6] hover:text-[#F5F3EE] underline"
              >
                Pricing
              </button>
              <button
                type="button"
                onClick={() => onNavigate('breeders')}
                className="text-[#A3ABA6] hover:text-[#F5F3EE] underline"
              >
                Breeders
              </button>
              <button
                type="button"
                onClick={() => onNavigate('schema-docs')}
                className="text-[#A3ABA6] hover:text-[#F5F3EE] underline"
              >
                Schema
              </button>
            </div>
          </div>

          {children}
        </main>
      </div>

      {/* ====================================================================
          FOOTER (Quiet Legal, Prototype Status & Quick Links)
          ==================================================================== */}
      <footer className="border-t border-[#1E3329] bg-[#070A08] px-4 lg:px-10 py-8 mt-12 w-full max-w-full overflow-x-hidden">
        <div className="max-w-[1440px] mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="min-w-0">
            <p className="font-serif-display text-xl text-[#F5F3EE]">
              Serpent Sorcerer Marketplace
            </p>
            <p className="text-xs text-[#8E9892] mt-1 max-w-2xl leading-relaxed break-words">
              Prototype Notice: Working backend features in this build include buyer/seller registration, listing creation with prohibited-species validation, saved searches, favorites, and session inquiry messaging. Sample listings and storefronts are clearly labeled as demonstrations and do not represent actual available animals or verified breeders. Admin access is restricted strictly to backend authorization.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs text-[#A3ABA6]">
            <button
              type="button"
              onClick={() => onNavigate('marketplace')}
              className="hover:text-[#C6A355] transition-colors"
            >
              Browse Animals
            </button>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => onNavigate('founding-50')}
              className="hover:text-[#C6A355] transition-colors"
            >
              Founding 50
            </button>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => onNavigate('memberships')}
              className="hover:text-[#C6A355] transition-colors"
            >
              Memberships
            </button>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => onNavigate('schema-docs')}
              className="hover:text-[#C6A355] transition-colors"
            >
              Supabase Schema
            </button>
          </div>
        </div>
      </footer>

      {/* ====================================================================
          MOBILE BOTTOM NAVIGATION BAR (Home, Browse, Founders, Inbox, Seller)
          ==================================================================== */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 h-14 w-full max-w-full bg-[#090D0B]/95 backdrop-blur-md border-t border-[#1E3329] grid grid-cols-5 items-center px-1">
        <MobileNavTab
          active={activePage === 'home'}
          onClick={() => onNavigate('home')}
          icon={<Home className="w-4 h-4" />}
          label="Home"
        />
        <MobileNavTab
          active={activePage === 'marketplace' || activePage === 'listing-detail'}
          onClick={() => onNavigate('marketplace')}
          icon={<Compass className="w-4 h-4" />}
          label="Browse"
        />
        <MobileNavTab
          active={activePage === 'founding-50' || activePage === 'memberships'}
          onClick={() => onNavigate('founding-50')}
          icon={<Sparkles className="w-4 h-4" />}
          label="Founders"
        />
        <MobileNavTab
          active={activePage === 'buyer-account'}
          onClick={() => onNavigate('buyer-account')}
          icon={<MessageSquare className="w-4 h-4" />}
          label="Inbox"
        />
        <MobileNavTab
          active={
            activePage === 'seller-dashboard' ||
            activePage === 'seller-auth'
          }
          onClick={() => onNavigate('seller-dashboard')}
          icon={<LayoutDashboard className="w-4 h-4" />}
          label="Seller"
        />
      </nav>
    </div>
  );
};

const SidebarNavButton: React.FC<{
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}> = ({ active, onClick, icon, label }) => (
  <button
    type="button"
    onClick={onClick}
    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
      active
        ? 'bg-[#15261E] text-[#C6A355] border border-[#C6A355]/30'
        : 'text-[#A3ABA6] hover:text-[#F5F3EE] hover:bg-[#111C16]'
    }`}
  >
    <span className="text-[#C6A355] shrink-0">{icon}</span>
    <span className="truncate">{label}</span>
  </button>
);

const MobileNavTab: React.FC<{
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}> = ({ active, onClick, icon, label }) => (
  <button
    type="button"
    onClick={onClick}
    className={`min-w-0 flex flex-col items-center justify-center py-1 text-[11px] font-medium transition-colors ${
      active ? 'text-[#C6A355]' : 'text-[#A3ABA6]'
    }`}
  >
    {icon}
    <span className="mt-0.5 truncate max-w-full px-0.5">{label}</span>
  </button>
);
