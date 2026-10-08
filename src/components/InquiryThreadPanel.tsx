import React, { useState } from 'react';
import { Send, CheckCircle2, Clock, MapPin, ShieldAlert, ArrowUpRight } from 'lucide-react';
import { ListingInquiry, UserAccount } from '../types/marketplace';
import { ResilientImage } from './ResilientImage';

interface InquiryThreadPanelProps {
  inquiries: ListingInquiry[];
  currentUser: UserAccount;
  perspective: 'buyer' | 'seller';
  onSendMessage: (
    inquiryId: string,
    body: string,
    statusOverride?: ListingInquiry['status']
  ) => Promise<void>;
  onUpdateStatus: (inquiryId: string, status: ListingInquiry['status']) => Promise<void>;
  onSelectListing: (listingId: string) => void;
}

const STATUS_LABELS: Record<ListingInquiry['status'], string> = {
  open: 'Awaiting Breeder Response',
  seller_replied: 'Breeder Responded',
  buyer_replied: 'Buyer Responded',
  shipping_quoted: 'FedEx Hub & Shipping Quoted',
  closed: 'Archived / Resolved',
};

export const InquiryThreadPanel: React.FC<InquiryThreadPanelProps> = ({
  inquiries,
  currentUser,
  perspective,
  onSendMessage,
  onUpdateStatus,
  onSelectListing,
}) => {
  const [selectedId, setSelectedId] = useState<string | null>(
    inquiries[0]?.id || null
  );
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const activeInquiry =
    inquiries.find((i) => i.id === selectedId) || inquiries[0] || null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeInquiry || !replyText.trim() || submitting) return;
    setSubmitting(true);
    try {
      await onSendMessage(activeInquiry.id, replyText.trim());
      setReplyText('');
    } finally {
      setSubmitting(false);
    }
  };

  const applyQuickTemplate = (template: string) => {
    setReplyText(template);
  };

  if (inquiries.length === 0) {
    return (
      <div className="border border-[#1E3329] bg-[#0D1512] rounded-xl p-8 text-center">
        <p className="font-serif-display text-2xl text-[#F5F3EE] mb-2">
          {perspective === 'buyer'
            ? 'No Active Specimen Inquiries Yet'
            : 'No Incoming Buyer Inquiries Yet'}
        </p>
        <p className="text-sm text-[#A3ABA6] max-w-md mx-auto">
          {perspective === 'buyer'
            ? 'Use the "Inquire with Breeder" button on any marketplace listing to discuss lineage, overnight FedEx Hold-for-Pickup hubs, and weather windows.'
            : 'When prospective keepers inquire about your listings, their husbandry details, ZIP code, and messages appear here.'}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start w-full max-w-full overflow-x-hidden">
      {/* Left Column: Thread List */}
      <div className="lg:col-span-5 border border-[#1E3329] bg-[#0D1512] rounded-xl overflow-hidden min-w-0">
        <div className="px-5 py-4 border-b border-[#1E3329] flex items-center justify-between">
          <div>
            <h3 className="font-serif-display text-xl font-semibold text-[#F5F3EE]">
              {perspective === 'buyer' ? 'My Breeder Inquiries' : 'Breeder Inquiry Inbox'}
            </h3>
            <p className="text-xs text-[#A3ABA6]">
              {inquiries.length} active conversation{inquiries.length === 1 ? '' : 's'} · 0% Commission
            </p>
          </div>
        </div>

        <div className="divide-y divide-[#1E3329] max-h-[540px] overflow-y-auto">
          {inquiries.map((inq) => {
            const isSelected = activeInquiry?.id === inq.id;
            const lastMsg = inq.messages[inq.messages.length - 1];
            return (
              <button
                key={inq.id}
                type="button"
                onClick={() => setSelectedId(inq.id)}
                className={`w-full text-left p-4 transition-colors flex gap-3.5 items-start ${
                  isSelected
                    ? 'bg-[#15251E] border-l-2 border-l-[#C6A355]'
                    : 'hover:bg-[#111D17]'
                }`}
              >
                <ResilientImage
                  src={inq.listingImageUrl}
                  alt={inq.listingTitle}
                  className="w-14 h-14 rounded-lg object-cover shrink-0 border border-[#1E3329]"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span className="text-xs text-[#C6A355] truncate">
                      {perspective === 'buyer' ? inq.storefrontName : `Buyer: ${inq.buyerName}`}
                    </span>
                    <span className="font-tabular text-xs text-[#A3ABA6] shrink-0">
                      ${inq.listingPrice.toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-[#F5F3EE] truncate">
                    {inq.listingTitle}
                  </p>
                  <p className="text-xs text-[#A3ABA6] line-clamp-1 mt-1">
                    {lastMsg ? `${lastMsg.senderName}: ${lastMsg.body}` : inq.subject}
                  </p>
                  <div className="flex items-center gap-1.5 text-[11px] text-[#8E9892] mt-2">
                    <span>{STATUS_LABELS[inq.status]}</span>
                    <span aria-hidden="true">·</span>
                    <span>ZIP {inq.buyerZipCode}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Right Column: Active Conversation & Husbandry Dossier */}
      {activeInquiry && (
        <div className="lg:col-span-7 border border-[#1E3329] bg-[#0D1512] rounded-xl overflow-hidden flex flex-col min-w-0">
          {/* Header Dossier */}
          <div className="p-5 border-b border-[#1E3329] bg-[#101B16]">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs text-[#C6A355] mb-1">
                  <span>{activeInquiry.storefrontName}</span>
                  <span aria-hidden="true">·</span>
                  <span className="italic">{activeInquiry.listingSpecies}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-tabular">${activeInquiry.listingPrice.toLocaleString()}</span>
                </div>
                <h3 className="font-serif-display text-2xl font-semibold text-[#F5F3EE]">
                  {activeInquiry.subject}
                </h3>
                <p className="text-xs text-[#A3ABA6] mt-1">
                  Regarding listing: <span className="text-[#F5F3EE]">{activeInquiry.listingTitle}</span>
                </p>
              </div>

              <button
                type="button"
                onClick={() => onSelectListing(activeInquiry.listingId)}
                className="px-3 py-1.5 text-xs font-medium text-[#C6A355] border border-[#C6A355]/40 rounded-lg hover:bg-[#C6A355]/10 transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <span>View Specimen</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Husbandry & Transport Metadata Bar (Zero-Pill Clean Text) */}
            <div className="mt-4 pt-3 border-t border-[#1E3329] flex flex-wrap items-center justify-between gap-3 text-xs text-[#A3ABA6]">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 text-[#F5F3EE]">
                  <MapPin className="w-3.5 h-3.5 text-[#C6A355]" />
                  Destination ZIP: <strong className="font-tabular">{activeInquiry.buyerZipCode}</strong>
                </span>
                <span aria-hidden="true">·</span>
                <span>{activeInquiry.preferredShipping}</span>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1 text-[#A7D7B8]">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {activeInquiry.enclosureReady
                    ? 'Cycled Habitat Attested'
                    : 'Habitat Setup In Progress'}
                </span>
              </div>

              {perspective === 'seller' && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onUpdateStatus(activeInquiry.id, 'shipping_quoted')}
                    className="px-2.5 py-1 text-xs rounded border border-[#274235] text-[#F5F3EE] hover:border-[#C6A355] transition-colors whitespace-nowrap"
                  >
                    Mark Shipping Quoted
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateStatus(activeInquiry.id, 'closed')}
                    className="px-2.5 py-1 text-xs rounded border border-[#274235] text-[#A3ABA6] hover:text-[#F5F3EE] transition-colors whitespace-nowrap"
                  >
                    Close Thread
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Version 1 No-Checkout Compliance Notice */}
          <div className="px-5 py-2.5 bg-[#13221B] border-b border-[#1E3329] flex items-center gap-2.5 text-xs text-[#C6A355]">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>
              <strong>Version 1 Inquiry Protocol:</strong> Serpent Sorcerer takes 0% commission and does not process live-animal payments or checkout in v1. Coordinate FedEx Priority Overnight hub hold and weather windows directly below.
            </span>
          </div>

          {/* Message History */}
          <div className="p-5 space-y-4 max-h-[380px] overflow-y-auto bg-[#090D0B]/60">
            {activeInquiry.messages.map((msg) => {
              const isMine =
                msg.senderId === currentUser.id ||
                (perspective === 'seller' && msg.senderRole === 'seller') ||
                (perspective === 'buyer' && msg.senderRole === 'buyer');

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                >
                  <div className="flex items-center gap-2 text-[11px] text-[#8E9892] mb-1 px-1">
                    <span className="font-medium text-[#F5F3EE]/90">{msg.senderName}</span>
                    <span aria-hidden="true">·</span>
                    <span>{msg.senderRole === 'seller' ? 'Verified Breeder' : 'Prospective Keeper'}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-tabular">
                      {new Date(msg.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <div
                    className={`max-w-xl rounded-xl px-4 py-3 text-sm leading-relaxed border ${
                      isMine
                        ? 'bg-[#14281F] border-[#264938] text-[#F5F3EE]'
                        : 'bg-[#111714] border-[#1E2B24] text-[#E2E6E3]'
                    }`}
                  >
                    {msg.body}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick-Reply Assistance for Sellers / Buyers */}
          <div className="px-5 pt-3 pb-2 bg-[#0D1512] border-t border-[#1E3329]">
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              <span className="text-[11px] text-[#8E9892] shrink-0">Quick Prompts:</span>
              {perspective === 'seller' ? (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      applyQuickTemplate(
                        `Hello ${activeInquiry.buyerName}, I verified overnight lows for ZIP ${activeInquiry.buyerZipCode}. We can ship Tuesday via FedEx Priority Overnight Hold-for-Pickup ($65 flat rate) with our 100% Live Arrival Guarantee.`
                      )
                    }
                    className="px-2.5 py-1 text-xs bg-[#13201A] hover:bg-[#1A2C24] text-[#C6A355] rounded border border-[#23392E] transition-colors whitespace-nowrap shrink-0"
                  >
                    Quote FedEx Hub Hold
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      applyQuickTemplate(
                        `She fed eagerly on a thawed hopper last night and shed complete 6 days ago. I am happy to share dam/sire lineage records and a live perch video.`
                      )
                    }
                    className="px-2.5 py-1 text-xs bg-[#13201A] hover:bg-[#1A2C24] text-[#C6A355] rounded border border-[#23392E] transition-colors whitespace-nowrap shrink-0"
                  >
                    Share Feeding & Lineage Note
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      applyQuickTemplate(
                        `Thank you! Could you confirm the nearest approved FedEx Ship Center for Hold-for-Pickup in ZIP ${activeInquiry.buyerZipCode}, and share recent weight and feeding dates?`
                      )
                    }
                    className="px-2.5 py-1 text-xs bg-[#13201A] hover:bg-[#1A2C24] text-[#C6A355] rounded border border-[#23392E] transition-colors whitespace-nowrap shrink-0"
                  >
                    Ask FedEx Hub & Weight
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      applyQuickTemplate(
                        `My bioactive enclosure has been cycled for 4 weeks with a Herpstat dimming thermostat. Tuesday or Wednesday morning hub pickup works great for my schedule.`
                      )
                    }
                    className="px-2.5 py-1 text-xs bg-[#13201A] hover:bg-[#1A2C24] text-[#C6A355] rounded border border-[#23392E] transition-colors whitespace-nowrap shrink-0"
                  >
                    Confirm Husbandry & Pickup Day
                  </button>
                </>
              )}
            </div>

            {/* Reply Input Form */}
            <form onSubmit={handleSend} className="flex gap-3 pt-1 pb-2">
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={
                  perspective === 'seller'
                    ? `Reply to ${activeInquiry.buyerName} as ${activeInquiry.storefrontName}...`
                    : `Send message to ${activeInquiry.storefrontName}...`
                }
                className="flex-1 bg-[#090D0B] border border-[#23392E] rounded-lg px-3.5 py-2.5 text-sm text-[#F5F3EE] placeholder-[#6E7A74] focus:outline-none focus:border-[#C6A355]"
              />
              <button
                type="submit"
                disabled={!replyText.trim() || submitting}
                className="px-4 py-2.5 bg-[#C6A355] text-[#090D0B] font-semibold text-xs rounded-lg hover:bg-[#DFC07A] disabled:opacity-40 transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{submitting ? 'Sending...' : 'Send Reply'}</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
