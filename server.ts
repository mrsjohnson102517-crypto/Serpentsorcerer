import crypto from 'crypto';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import {
  INITIAL_INQUIRIES,
  INITIAL_LISTINGS,
  INITIAL_MODERATION_REPORTS,
  INITIAL_SAVED_SEARCHES,
  INITIAL_STOREFRONTS,
  INITIAL_USERS,
  MEMBERSHIP_PLANS,
  PROHIBITED_SPECIES_KEYWORDS,
} from './src/data/initialData';
import {
  FoundingProgramState,
  ListingInquiry,
  ListingStatus,
  MarketplaceListing,
  MembershipTierSlug,
  ModerationReport,
  SavedSearch,
  SellerStorefront,
  ShippingOptionType,
  UserAccount,
} from './src/types/marketplace';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // ============================================================================
  // SERVER-SIDE AUTHORITATIVE STATE (Ready for drop-in Supabase client swap)
  // ============================================================================
  const users: UserAccount[] = [...INITIAL_USERS];
  const storefronts: SellerStorefront[] = [...INITIAL_STOREFRONTS];
  const listings: MarketplaceListing[] = [...INITIAL_LISTINGS];
  const inquiries: ListingInquiry[] = [...INITIAL_INQUIRIES];
  const savedSearches: SavedSearch[] = [...INITIAL_SAVED_SEARCHES];
  const reports: ModerationReport[] = [...INITIAL_MODERATION_REPORTS];
  const favoritesByBuyer: Record<string, string[]> = {
    'usr-buyer-1': ['lst-1', 'lst-3'],
  };

  // Server-authoritative Founding 50 sequence counter (Never controlled by client)
  const MAX_FOUNDING_SPOTS = 50;
  let serverFounderSequence = storefronts.reduce(
    (max, sf) => (sf.founderNumber && sf.founderNumber > max ? sf.founderNumber : max),
    0
  );

  function getAuthenticatedUser(req: express.Request): UserAccount {
    const userId = (req.headers['x-serpent-user-id'] as string) || 'usr-buyer-1';
    return users.find((u) => u.id === userId) || users[0];
  }

  function checkProhibitedSpecies(fields: string[]): {
    prohibited: boolean;
    rule?: (typeof PROHIBITED_SPECIES_KEYWORDS)[number];
  } {
    const combined = fields.join(' ').toLowerCase();
    for (const rule of PROHIBITED_SPECIES_KEYWORDS) {
      if (combined.includes(rule.pattern.toLowerCase())) {
        return { prohibited: true, rule };
      }
    }
    return { prohibited: false };
  }

  function buildFoundingProgramState(): FoundingProgramState {
    const founderStorefronts = storefronts
      .filter((s) => s.isFoundingMember && s.founderNumber !== null)
      .sort((a, b) => (a.founderNumber || 0) - (b.founderNumber || 0));

    return {
      maxSpots: MAX_FOUNDING_SPOTS,
      assignedCount: serverFounderSequence,
      remainingSpots: Math.max(0, MAX_FOUNDING_SPOTS - serverFounderSequence),
      recentFounders: founderStorefronts.map((s) => ({
        founderNumber: s.founderNumber!,
        storefrontName: s.storefrontName,
        locationState: s.locationState,
        grantedAt: s.createdAt,
        certificateHash: s.permanentCertificateHash || 'verified-on-server',
      })),
    };
  }

  // ============================================================================
  // API ROUTES
  // ============================================================================

  // 1. Bootstrap Initial State (Never expose admin credentials in public payload)
  app.get('/api/bootstrap', (req, res) => {
    const currentUser = getAuthenticatedUser(req);
    const safeUsers = users.filter((u) => u.role !== 'admin');
    res.json({
      currentUser: currentUser.role === 'admin' ? currentUser : safeUsers.find((u) => u.id === currentUser.id) || safeUsers[0],
      users: safeUsers,
      storefronts,
      listings,
      inquiries,
      savedSearches: savedSearches.filter((s) => s.buyerId === currentUser.id),
      favorites: favoritesByBuyer[currentUser.id] || [],
      reports: currentUser.role === 'admin' ? reports : [],
      foundingProgram: buildFoundingProgramState(),
    });
  });

  // 2. Server-Verified Founding 50 Status
  app.get('/api/founders/status', (_req, res) => {
    res.json(buildFoundingProgramState());
  });

  // 2b. Buyer Registration & Login (Role assigned on server; never grants admin via frontend)
  app.post('/api/buyers/register', (req, res) => {
    const { fullName, email, locationCity, locationState } = req.body;
    if (!fullName || !email) {
      res.status(400).json({ error: 'Name and email are required for buyer registration.' });
      return;
    }
    const existing = users.find((u) => u.email.toLowerCase() === String(email).toLowerCase() && u.role !== 'admin');
    if (existing) {
      res.json({ user: existing, message: 'Signed in to existing account.' });
      return;
    }
    const newBuyer: UserAccount = {
      id: `usr-buyer-${Date.now()}`,
      email: String(email).trim(),
      fullName: String(fullName).trim(),
      role: 'buyer',
      locationCity: locationCity || 'Austin',
      locationState: locationState || 'TX',
      createdAt: new Date().toISOString(),
    };
    users.push(newBuyer);
    favoritesByBuyer[newBuyer.id] = [];
    res.status(201).json({ user: newBuyer, message: 'Buyer account created.' });
  });

  app.post('/api/auth/login', (req, res) => {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ error: 'Email address is required to sign in.' });
      return;
    }
    const account = users.find(
      (u) => u.email.toLowerCase() === String(email).trim().toLowerCase() && u.role !== 'admin'
    );
    if (!account) {
      res.status(404).json({ error: 'No buyer or seller account found with that email. Please register below.' });
      return;
    }
    res.json({ user: account });
  });

  // 3. Seller & Founding 50 Application Submission
  app.post('/api/sellers/register', (req, res) => {
    const {
      fullName,
      email,
      storefrontName,
      tagline,
      bio,
      locationCity,
      locationState,
      specialties,
      permitDeclaration,
      yearsBreeding,
      applyForFounding50,
    } = req.body;

    if (!fullName || !email || !storefrontName || !locationCity || !locationState) {
      res.status(400).json({ error: 'All required breeder registration fields must be completed.' });
      return;
    }

    const newUserId = `usr-seller-${Date.now()}`;
    const newStorefrontId = `stf-${Date.now()}`;
    const slug = storefrontName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const newUser: UserAccount = {
      id: newUserId,
      email,
      fullName,
      role: 'seller',
      locationCity,
      locationState,
      storefrontId: newStorefrontId,
      createdAt: new Date().toISOString(),
    };

    const newStorefront: SellerStorefront = {
      id: newStorefrontId,
      userId: newUserId,
      slug: `${slug}-${Math.floor(Math.random() * 900 + 100)}`,
      storefrontName,
      tagline: tagline || 'Captive-bred herpetoculture & bioactive specialists.',
      bio: bio || 'Dedicated to ethical captive propagation and documented lineage.',
      locationCity,
      locationState,
      approvalStatus: 'pending',
      membershipTier: 'hatchling',
      isFoundingMember: false,
      founderNumber: null,
      lifetimeDiscountPercent: 0,
      freeSorcererUntil: null,
      liveArrivalGuarantee: true,
      shippingHubCertified: true,
      yearsBreeding: Number(yearsBreeding) || 3,
      specialties: Array.isArray(specialties) && specialties.length > 0 ? specialties : ['Snakes'],
      permitDeclaration: permitDeclaration || 'State Wildlife & Husbandry Compliance Attested',
      createdAt: new Date().toISOString(),
    };

    users.push(newUser);
    storefronts.push(newStorefront);

    res.status(201).json({
      user: newUser,
      storefront: newStorefront,
      applyForFounding50: Boolean(applyForFounding50),
      message:
        'Breeder application recorded in moderation queue. Founding 50 slots are assigned atomically on the server upon administrator approval.',
    });
  });

  // 4. Admin Approval of Seller + Atomic Server Assignment of Founding 50 Spot
  app.post('/api/admin/storefronts/:id/approve', (req, res) => {
    const caller = getAuthenticatedUser(req);
    if (caller.role !== 'admin') {
      res.status(403).json({ error: 'Forbidden: Only administrators can approve seller storefronts.' });
      return;
    }

    const storefront = storefronts.find((s) => s.id === req.params.id);
    if (!storefront) {
      res.status(404).json({ error: 'Storefront not found.' });
      return;
    }

    storefront.approvalStatus = 'approved';

    // Server-side atomic Founding 50 assignment
    if (!storefront.isFoundingMember && serverFounderSequence < MAX_FOUNDING_SPOTS) {
      serverFounderSequence += 1;
      const assignedNumber = serverFounderSequence;
      const threeMonthsFromNow = new Date();
      threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);

      const certHash = crypto
        .createHash('sha256')
        .update(`${storefront.id}-founder-${assignedNumber}-serpent-sorcerer`)
        .digest('hex')
        .slice(0, 16);

      storefront.isFoundingMember = true;
      storefront.founderNumber = assignedNumber;
      storefront.membershipTier = 'sorcerer';
      storefront.lifetimeDiscountPercent = 25;
      storefront.freeSorcererUntil = threeMonthsFromNow.toISOString();
      storefront.permanentCertificateHash = `f50-${String(assignedNumber).padStart(3, '0')}-${certHash}`;
    }

    res.json({
      storefront,
      foundingProgram: buildFoundingProgramState(),
    });
  });

  // 5. Seller Membership Plan Upgrade / Change
  app.patch('/api/storefronts/:id/membership', (req, res) => {
    const caller = getAuthenticatedUser(req);
    const storefront = storefronts.find((s) => s.id === req.params.id);
    if (!storefront) {
      res.status(404).json({ error: 'Storefront not found.' });
      return;
    }
    if (caller.role !== 'admin' && storefront.userId !== caller.id) {
      res.status(403).json({ error: 'Unauthorized to change this storefront membership.' });
      return;
    }

    const { tierSlug } = req.body as { tierSlug: MembershipTierSlug };
    const plan = MEMBERSHIP_PLANS.find((p) => p.slug === tierSlug);
    if (!plan) {
      res.status(400).json({ error: 'Invalid membership tier slug.' });
      return;
    }

    storefront.membershipTier = plan.slug;
    res.json({ storefront });
  });

  // 6. Create Listing (Enforces Membership Quota + Prohibited Species Guardrail)
  app.post('/api/listings', (req, res) => {
    const caller = getAuthenticatedUser(req);
    if (caller.role !== 'seller' && caller.role !== 'admin') {
      res.status(403).json({ error: 'Only registered sellers can create listings.' });
      return;
    }

    const storefront =
      storefronts.find((s) => s.userId === caller.id) || storefronts[0];

    if (storefront.approvalStatus !== 'approved' && caller.role !== 'admin') {
      res.status(403).json({
        error: 'Your breeder storefront is awaiting administrator approval before publishing live listings.',
      });
      return;
    }

    const {
      title,
      category,
      speciesCommon,
      speciesScientific,
      morphGenetics,
      sex,
      hatchDate,
      weightGrams,
      feedingRegimen,
      price,
      shippingOptions,
      flatShippingRate,
      description,
      husbandryNotes,
      primaryImageUrl,
    } = req.body;

    // 1. Prohibited & Venomous Species Guardrail
    const safetyCheck = checkProhibitedSpecies([
      title || '',
      speciesCommon || '',
      speciesScientific || '',
      description || '',
    ]);

    if (safetyCheck.prohibited && safetyCheck.rule) {
      res.status(422).json({
        error: `PROHIBITED SPECIES RESTRICTION (${safetyCheck.rule.authority}): ${safetyCheck.rule.reason}`,
        prohibitedRule: safetyCheck.rule,
      });
      return;
    }

    // 2. Membership Plan Active Listing Quota Guardrail
    const plan = MEMBERSHIP_PLANS.find((p) => p.slug === storefront.membershipTier);
    const currentActiveCount = listings.filter(
      (l) => l.storefrontId === storefront.id && l.status === 'active'
    ).length;

    if (plan && plan.maxActiveListings !== null && currentActiveCount >= plan.maxActiveListings) {
      res.status(403).json({
        error: `Your ${plan.name} plan allows up to ${plan.maxActiveListings} active listings (currently ${currentActiveCount}). Upgrade your membership tier for higher capacity.`,
      });
      return;
    }

    const newListing: MarketplaceListing = {
      id: `lst-${Date.now()}`,
      storefrontId: storefront.id,
      sellerId: storefront.userId,
      sellerName: storefront.storefrontName,
      sellerSlug: storefront.slug,
      sellerFounderNumber: storefront.founderNumber,
      title,
      category,
      speciesCommon,
      speciesScientific: speciesScientific || 'Captive Specimen',
      morphGenetics: morphGenetics || 'Normal / Wild Type',
      sex: sex || 'Unsexed',
      hatchDate: hatchDate || '2026-06-01',
      weightGrams: weightGrams ? Number(weightGrams) : null,
      feedingRegimen: feedingRegimen || 'Established on appropriate diet',
      price: Number(price) || 100,
      locationCity: storefront.locationCity,
      locationState: storefront.locationState,
      shippingOptions:
        Array.isArray(shippingOptions) && shippingOptions.length > 0
          ? shippingOptions
          : ['FedEx Priority Overnight'],
      flatShippingRate: Number(flatShippingRate) || 60,
      description: `DEMONSTRATION LISTING — ${description}`,
      husbandryNotes:
        husbandryNotes || 'Standard species-appropriate temperature and humidity gradient.',
      primaryImageUrl:
        primaryImageUrl || '/src/assets/images/ball_python_morph_1791433500791.jpg',
      galleryImageUrls: [
        primaryImageUrl || '/src/assets/images/ball_python_morph_1791433500791.jpg',
      ],
      status: 'active',
      isDemoSpecimen: true,
      featured: storefront.membershipTier === 'grand_sorcerer',
      createdAt: new Date().toISOString(),
    };

    listings.unshift(newListing);
    res.status(201).json({ listing: newListing });
  });

  // 7. Update / Edit Listing
  app.put('/api/listings/:id', (req, res) => {
    const caller = getAuthenticatedUser(req);
    const index = listings.findIndex((l) => l.id === req.params.id);
    if (index === -1) {
      res.status(404).json({ error: 'Listing not found.' });
      return;
    }

    const existing = listings[index];
    if (caller.role !== 'admin' && existing.sellerId !== caller.id) {
      res.status(403).json({ error: 'You can only edit listings belonging to your storefront.' });
      return;
    }

    const safetyCheck = checkProhibitedSpecies([
      req.body.title ?? existing.title,
      req.body.speciesCommon ?? existing.speciesCommon,
      req.body.speciesScientific ?? existing.speciesScientific,
      req.body.description ?? existing.description,
    ]);

    if (safetyCheck.prohibited && safetyCheck.rule) {
      res.status(422).json({
        error: `PROHIBITED SPECIES RESTRICTION (${safetyCheck.rule.authority}): ${safetyCheck.rule.reason}`,
      });
      return;
    }

    listings[index] = {
      ...existing,
      ...req.body,
      price: req.body.price !== undefined ? Number(req.body.price) : existing.price,
    };

    res.json({ listing: listings[index] });
  });

  // 8. Delete Listing
  app.delete('/api/listings/:id', (req, res) => {
    const caller = getAuthenticatedUser(req);
    const index = listings.findIndex((l) => l.id === req.params.id);
    if (index === -1) {
      res.status(404).json({ error: 'Listing not found.' });
      return;
    }

    if (caller.role !== 'admin' && listings[index].sellerId !== caller.id) {
      res.status(403).json({ error: 'Unauthorized to remove this listing.' });
      return;
    }

    const removed = listings.splice(index, 1)[0];
    res.json({ removedId: removed.id });
  });

  // 9. Admin Moderation of Listing Status
  app.post('/api/admin/listings/:id/moderate', (req, res) => {
    const caller = getAuthenticatedUser(req);
    if (caller.role !== 'admin') {
      res.status(403).json({ error: 'Only administrators can moderate listings.' });
      return;
    }

    const listing = listings.find((l) => l.id === req.params.id);
    if (!listing) {
      res.status(404).json({ error: 'Listing not found.' });
      return;
    }

    const { status, moderationNotes } = req.body as {
      status: ListingStatus;
      moderationNotes?: string;
    };
    listing.status = status;
    listing.moderationNotes = moderationNotes;

    res.json({ listing });
  });

  // 10. Create New Buyer-to-Seller Inquiry (No Payment Collection in v1)
  app.post('/api/inquiries', (req, res) => {
    const caller = getAuthenticatedUser(req);
    const {
      listingId,
      subject,
      buyerZipCode,
      preferredShipping,
      enclosureReady,
      messageBody,
    } = req.body as {
      listingId: string;
      subject: string;
      buyerZipCode: string;
      preferredShipping: ShippingOptionType;
      enclosureReady: boolean;
      messageBody: string;
    };

    const listing = listings.find((l) => l.id === listingId);
    if (!listing) {
      res.status(404).json({ error: 'Target listing not found.' });
      return;
    }

    if (!messageBody || !messageBody.trim()) {
      res.status(400).json({ error: 'Please include a message for the breeder.' });
      return;
    }

    const now = new Date().toISOString();
    const inquiryId = `inq-${Date.now()}`;

    const newInquiry: ListingInquiry = {
      id: inquiryId,
      listingId: listing.id,
      listingTitle: listing.title,
      listingSpecies: listing.speciesScientific,
      listingPrice: listing.price,
      listingImageUrl: listing.primaryImageUrl,
      buyerId: caller.id,
      buyerName: caller.fullName,
      buyerEmail: caller.email,
      buyerZipCode: buyerZipCode || '78701',
      preferredShipping: preferredShipping || listing.shippingOptions[0] || 'FedEx Priority Overnight',
      enclosureReady: Boolean(enclosureReady),
      sellerId: listing.sellerId,
      storefrontId: listing.storefrontId,
      storefrontName: listing.sellerName,
      subject: subject || `Inquiry regarding ${listing.title}`,
      status: 'open',
      lastMessageAt: now,
      createdAt: now,
      messages: [
        {
          id: `msg-${Date.now()}`,
          inquiryId,
          senderId: caller.id,
          senderName: caller.fullName,
          senderRole: caller.role,
          body: messageBody.trim(),
          createdAt: now,
        },
      ],
    };

    inquiries.unshift(newInquiry);
    res.status(201).json({ inquiry: newInquiry });
  });

  // 11. Reply to an Inquiry Thread (Buyer or Seller)
  app.post('/api/inquiries/:id/messages', (req, res) => {
    const caller = getAuthenticatedUser(req);
    const inquiry = inquiries.find((i) => i.id === req.params.id);
    if (!inquiry) {
      res.status(404).json({ error: 'Inquiry thread not found.' });
      return;
    }

    const { body, statusOverride } = req.body as {
      body: string;
      statusOverride?: ListingInquiry['status'];
    };

    if (!body || !body.trim()) {
      res.status(400).json({ error: 'Reply message cannot be empty.' });
      return;
    }

    const now = new Date().toISOString();
    const isSellerSender = caller.id === inquiry.sellerId || caller.role === 'seller';

    const newMessage = {
      id: `msg-${Date.now()}`,
      inquiryId: inquiry.id,
      senderId: caller.id,
      senderName: isSellerSender ? inquiry.storefrontName : caller.fullName,
      senderRole: caller.role,
      body: body.trim(),
      createdAt: now,
    };

    inquiry.messages.push(newMessage);
    inquiry.lastMessageAt = now;
    if (statusOverride) {
      inquiry.status = statusOverride;
    } else {
      inquiry.status = isSellerSender ? 'seller_replied' : 'buyer_replied';
    }

    res.status(201).json({ inquiry, message: newMessage });
  });

  // 12. Update Inquiry Status (e.g. Mark Shipping Quoted or Closed)
  app.patch('/api/inquiries/:id/status', (req, res) => {
    const inquiry = inquiries.find((i) => i.id === req.params.id);
    if (!inquiry) {
      res.status(404).json({ error: 'Inquiry not found.' });
      return;
    }
    const { status } = req.body as { status: ListingInquiry['status'] };
    inquiry.status = status;
    res.json({ inquiry });
  });

  // 13. Buyer Favorites Toggle
  app.post('/api/favorites/toggle', (req, res) => {
    const caller = getAuthenticatedUser(req);
    const { listingId } = req.body as { listingId: string };
    const current = favoritesByBuyer[caller.id] || [];
    const exists = current.includes(listingId);
    favoritesByBuyer[caller.id] = exists
      ? current.filter((id) => id !== listingId)
      : [...current, listingId];

    res.json({ favorites: favoritesByBuyer[caller.id] });
  });

  // 14. Buyer Saved Searches
  app.post('/api/saved-searches', (req, res) => {
    const caller = getAuthenticatedUser(req);
    const { label, category, speciesQuery, morphQuery, sex, maxPrice, shippingOption } = req.body;
    const newSearch: SavedSearch = {
      id: `svs-${Date.now()}`,
      buyerId: caller.id,
      label: label || `${category || 'All Categories'} · ${morphQuery || 'Any Morph'}`,
      category: category || 'All',
      speciesQuery: speciesQuery || '',
      morphQuery: morphQuery || '',
      sex: sex || 'All',
      maxPrice: maxPrice ? Number(maxPrice) : null,
      shippingOption: shippingOption || 'All',
      createdAt: new Date().toISOString(),
    };
    savedSearches.unshift(newSearch);
    res.status(201).json({
      savedSearches: savedSearches.filter((s) => s.buyerId === caller.id),
    });
  });

  app.delete('/api/saved-searches/:id', (req, res) => {
    const caller = getAuthenticatedUser(req);
    const idx = savedSearches.findIndex((s) => s.id === req.params.id);
    if (idx !== -1) {
      savedSearches.splice(idx, 1);
    }
    res.json({
      savedSearches: savedSearches.filter((s) => s.buyerId === caller.id),
    });
  });

  // 15. Moderation Reports
  app.post('/api/reports', (req, res) => {
    const caller = getAuthenticatedUser(req);
    const { listingId, listingTitle, reasonCategory, details } = req.body;
    const newReport: ModerationReport = {
      id: `rep-${Date.now()}`,
      listingId,
      listingTitle: listingTitle || 'Marketplace Listing',
      reporterName: caller.fullName,
      reasonCategory: reasonCategory || 'Welfare Concern',
      details: details || 'Submitted for steward review.',
      resolved: false,
      createdAt: new Date().toISOString(),
    };
    reports.unshift(newReport);
    res.status(201).json({ report: newReport });
  });

  app.patch('/api/admin/reports/:id/resolve', (req, res) => {
    const caller = getAuthenticatedUser(req);
    if (caller.role !== 'admin') {
      res.status(403).json({ error: 'Only administrators can resolve reports.' });
      return;
    }
    const report = reports.find((r) => r.id === req.params.id);
    if (!report) {
      res.status(404).json({ error: 'Report not found.' });
      return;
    }
    report.resolved = true;
    report.resolutionNotes = req.body.resolutionNotes || 'Reviewed and resolved by Sanctum Steward.';
    res.json({ report });
  });

  // ============================================================================
  // VITE MIDDLEWARE / STATIC ASSETS
  // ============================================================================
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Serpent Sorcerer server listening on http://localhost:${PORT}`);
  });
}

startServer();
