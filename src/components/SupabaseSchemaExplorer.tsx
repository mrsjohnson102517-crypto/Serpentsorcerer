import React, { useState } from 'react';
import { Copy, Check, Database, ShieldCheck, Lock, FileCode2 } from 'lucide-react';
import { SUPABASE_SCHEMA_TABLES, SUPABASE_SQL_SNIPPET } from '../data/supabaseSchemaDocs';

export const SupabaseSchemaExplorer: React.FC = () => {
  const [selectedTable, setSelectedTable] = useState<string>(
    SUPABASE_SCHEMA_TABLES[0].tableName
  );
  const [copiedSql, setCopiedSql] = useState(false);

  const activeDoc =
    SUPABASE_SCHEMA_TABLES.find((t) => t.tableName === selectedTable) ||
    SUPABASE_SCHEMA_TABLES[0];

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SNIPPET);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  return (
    <div className="space-y-8 sm:space-y-10 w-full max-w-full overflow-x-hidden">
      {/* Architectural Summary Banner */}
      <div className="border border-[#1E3329] bg-[#0D1512] rounded-xl p-4 sm:p-6 md:p-8 min-w-0">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div className="min-w-0">
            <p className="text-xs text-[#C6A355] mb-1 break-words">
              Supabase PostgreSQL 15+ Reference Architecture · Full DDL in /supabase/schema.sql
            </p>
            <h1 className="font-serif-display text-2xl sm:text-3xl md:text-4xl font-semibold text-[#F5F3EE] break-words">
              Scalable Marketplace Database Schema & Security Specification
            </h1>
          </div>
          <button
            type="button"
            onClick={handleCopySql}
            className="px-4 py-2 bg-[#C6A355] text-[#090D0B] text-xs font-semibold rounded-lg hover:bg-[#DFC07A] transition-colors inline-flex items-center gap-2 whitespace-nowrap shrink-0"
          >
            {copiedSql ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copiedSql ? 'Copied PL/pgSQL Triggers' : 'Copy Supabase SQL Triggers'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-[#1E3329]">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#F5F3EE] mb-1.5">
              <Lock className="w-4 h-4 text-[#C6A355] shrink-0" />
              <span>Server-Assigned Founding 50 Sequence</span>
            </div>
            <p className="text-xs text-[#A3ABA6] leading-relaxed break-words">
              Uses a PostgreSQL sequence (<code className="text-[#C6A355]">MAXVALUE 50 NO CYCLE</code>) inside a <code className="text-[#C6A355]">SECURITY DEFINER</code> transaction. Founder slots #1–#50, 3 months of free Sorcerer tier, and the permanent 25% lifetime discount are assigned atomically on the server.
            </p>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#F5F3EE] mb-1.5">
              <ShieldCheck className="w-4 h-4 text-[#C6A355] shrink-0" />
              <span>Row-Level Security & Prohibited Species Trigger</span>
            </div>
            <p className="text-xs text-[#A3ABA6] leading-relaxed break-words">
              Every listing mutation executes <code className="text-[#C6A355]">enforce_listing_guardrails()</code> to block front-fanged venomous and CITES Appendix I species, and verifies active listing counts against the seller’s membership plan (<code className="text-[#C6A355]">3 / 15 / 50 / NULL</code>).
            </p>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#F5F3EE] mb-1.5">
              <Database className="w-4 h-4 text-[#C6A355] shrink-0" />
              <span>Zero-Commission Inquiry Architecture</span>
            </div>
            <p className="text-xs text-[#A3ABA6] leading-relaxed break-words">
              Version 1 stores structured <code className="text-[#C6A355]">public.inquiries</code> and <code className="text-[#C6A355]">public.inquiry_messages</code> with participant-isolated RLS policies rather than payment cards, keeping <code className="text-[#C6A355]">commission_rate_bps = 0</code>.
            </p>
          </div>
        </div>
      </div>

      {/* Interactive Table Dictionary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start min-w-0">
        <div className="lg:col-span-4 border border-[#1E3329] bg-[#0D1512] rounded-xl p-4 space-y-1.5 min-w-0">
          <p className="px-3 py-2 text-xs font-semibold text-[#A3ABA6]">
            Select Database Table ({SUPABASE_SCHEMA_TABLES.length} Core Entities)
          </p>
          {SUPABASE_SCHEMA_TABLES.map((tbl) => (
            <button
              key={tbl.tableName}
              type="button"
              onClick={() => setSelectedTable(tbl.tableName)}
              className={`w-full text-left px-3.5 py-3 rounded-lg text-xs font-tabular transition-colors flex items-center justify-between min-w-0 ${
                selectedTable === tbl.tableName
                  ? 'bg-[#162920] text-[#C6A355] border border-[#C6A355]/40 font-semibold'
                  : 'text-[#F5F3EE] hover:bg-[#121F18]'
              }`}
            >
              <span className="truncate">{tbl.tableName}</span>
              <span className="text-[11px] text-[#8E9892] ml-2 shrink-0">
                {tbl.columns.length} cols
              </span>
            </button>
          ))}
        </div>

        <div className="lg:col-span-8 border border-[#1E3329] bg-[#0D1512] rounded-xl p-4 sm:p-6 min-w-0">
          <div className="border-b border-[#1E3329] pb-4 mb-5 min-w-0">
            <span className="font-tabular text-xs text-[#C6A355]">
              Primary Key: {activeDoc.primaryKey}
            </span>
            <h2 className="font-serif-display text-2xl font-semibold text-[#F5F3EE] mt-1 break-words">
              {activeDoc.tableName}
            </h2>
            <p className="text-sm text-[#A3ABA6] mt-1 break-words">{activeDoc.purpose}</p>
          </div>

          <div className="mb-5 p-3.5 rounded-lg bg-[#111D17] border border-[#1E3329] text-xs text-[#A3ABA6] break-words">
            <strong className="text-[#F5F3EE]">Supabase RLS Policy: </strong>
            {activeDoc.rlsSummary}
          </div>

          <div className="overflow-x-auto max-w-full">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#1E3329] text-xs text-[#A3ABA6]">
                  <th className="py-2.5 pr-4 font-medium">Column</th>
                  <th className="py-2.5 pr-4 font-medium">PostgreSQL Type</th>
                  <th className="py-2.5 pr-4 font-medium">Nullable</th>
                  <th className="py-2.5 font-medium">Developer Specification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E3329]/60 text-xs">
                {activeDoc.columns.map((col) => (
                  <tr key={col.name}>
                    <td className="py-3 pr-4 font-tabular font-semibold text-[#F5F3EE] whitespace-nowrap">
                      {col.name}
                    </td>
                    <td className="py-3 pr-4 font-tabular text-[#C6A355] whitespace-nowrap">
                      {col.type}
                    </td>
                    <td className="py-3 pr-4 font-tabular text-[#A3ABA6]">
                      {col.nullable ? 'NULL' : 'NOT NULL'}
                    </td>
                    <td className="py-3 text-[#A3ABA6] min-w-[180px]">{col.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-5 pt-4 border-t border-[#1E3329] flex flex-wrap items-center gap-2 text-xs text-[#8E9892]">
            <span className="text-[#F5F3EE] font-medium">Indexes:</span>
            {activeDoc.indexes.map((idx, i) => (
              <React.Fragment key={idx}>
                {i > 0 && <span aria-hidden="true">·</span>}
                <code className="font-tabular text-[#C6A355] break-all">{idx}</code>
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* PL/pgSQL Trigger & RLS Code Block */}
      <div className="border border-[#1E3329] bg-[#0D1512] rounded-xl overflow-hidden min-w-0">
        <div className="px-4 sm:px-6 py-4 border-b border-[#1E3329] flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <FileCode2 className="w-4 h-4 text-[#C6A355] shrink-0" />
            <h3 className="font-serif-display text-lg sm:text-xl font-semibold text-[#F5F3EE] break-words">
              Production PL/pgSQL Triggers & Row-Level Security Policies
            </h3>
          </div>
          <span className="font-tabular text-xs text-[#A3ABA6]">/supabase/schema.sql</span>
        </div>
        <pre className="p-4 sm:p-6 text-xs font-tabular text-[#D5DDD8] overflow-x-auto max-w-full leading-relaxed bg-[#080B0A]">
          <code>{SUPABASE_SQL_SNIPPET}</code>
        </pre>
      </div>
    </div>
  );
};
