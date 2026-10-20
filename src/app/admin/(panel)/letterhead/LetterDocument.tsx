"use client";

import type { CompanyBrand, LetterheadDraft } from "@/lib/letterhead/types";
import { safeLetterBodyHtml } from "@/lib/letterhead/pagination";
import { Globe2, Mail, Phone } from "lucide-react";

export function formatLetterDate(value: string) {
  if (!value) return "";
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

type Props = { draft: LetterheadDraft; company: CompanyBrand; bodyPages: string[]; zoom?: number };

export function LetterDocument({ draft, company, bodyPages, zoom = 0.72 }: Props) {
  return (
    <div className="letter-preview-stack" style={{ ["--letter-zoom" as string]: zoom } as React.CSSProperties}>
      {bodyPages.map((bodyHtml, index) => (
        <LetterPage
          key={`${index}-${bodyHtml.length}`}
          draft={draft}
          company={company}
          bodyHtml={bodyHtml}
          pageNumber={index + 1}
          pageCount={bodyPages.length}
        />
      ))}
    </div>
  );
}

function LetterPage({ draft, company, bodyHtml, pageNumber, pageCount }: { draft: LetterheadDraft; company: CompanyBrand; bodyHtml: string; pageNumber: number; pageCount: number }) {
  const isFirst = pageNumber === 1;
  const isLast = pageNumber === pageCount;
  return (
    <div className="letter-page-wrap">
      <article className="letter-page" aria-label={`Letter page ${pageNumber} of ${pageCount}`}>
        <div className="letter-watermark" aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={company.logoUrl || "/brand/evergreen-logo.png"} alt="" />
        </div>
        <header className="letter-page-header">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="letter-brand-logo" src={company.logoUrl || "/brand/evergreen-logo.png"} alt="" />
          <div className="letter-page-meta">
            {[
              { value: company.website.replace(/^https?:\/\//, ""), Icon: Globe2 },
              { value: company.email, Icon: Mail },
              { value: company.phone, Icon: Phone },
            ].filter((item) => item.value).map(({ value, Icon }) => <span key={value}><Icon size={10} strokeWidth={1.8} aria-hidden="true" />{value}</span>)}
          </div>
        </header>
        <div className="letter-accent-line" />
        <div className="letter-page-content">
          {isFirst && (
            <>
              {(draft.date || draft.referenceNumber) && (
                <div className="letter-date-line">
                  {draft.date && <span>{formatLetterDate(draft.date)}</span>}
                  {draft.referenceNumber && <span>Ref. {draft.referenceNumber}</span>}
                </div>
              )}
              {(draft.recipientName || draft.recipientAddress) && (
                <div className="letter-recipient">
                  <span className="letter-recipient-label">To</span>
                  <strong>{draft.recipientName || "Recipient"}</strong>
                  {draft.recipientAddress.split("\n").filter(Boolean).map((line) => <span key={line}>{line}</span>)}
                </div>
              )}
              {draft.subject && <div className="letter-subject"><span>Subject:</span> {draft.subject}</div>}
            </>
          )}
          <div className="letter-body" style={{ ["--paragraph-spacing" as string]: `${(draft.paragraphSpacing ?? 12) * 1.333}px` } as React.CSSProperties} dangerouslySetInnerHTML={{ __html: safeLetterBodyHtml(bodyHtml) }} />
          {isLast && (
            <div className="letter-signoff">
              <p>{draft.closing || "Sincerely,"}</p>
              {draft.signatureUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="letter-signature" style={{ width: `${(draft.signatureWidth ?? 150) * 1.333}px` }} src={draft.signatureUrl} alt="Authorized signature" />
              )}
              {draft.authorizedName && <strong>{draft.authorizedName}</strong>}
              {draft.designation && <span>{draft.designation}</span>}
            </div>
          )}
        </div>
        <footer className="letter-page-footer">
          <div />
          <span>{company.address}</span>
          <span>{[company.website.replace(/^https?:\/\//, ""), company.email, company.phone, company.alternatePhone].filter(Boolean).join("  ·  ")}</span>
          {pageCount > 1 && <small>Page {pageNumber} of {pageCount}</small>}
        </footer>
      </article>
    </div>
  );
}
