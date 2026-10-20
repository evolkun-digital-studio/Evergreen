export type LetterheadRecord = {
  id: string;
  name: string;
  referenceNumber: string;
  date: string;
  recipientName: string;
  recipientAddress: string;
  subject: string;
  bodyHtml: string;
  closing: string;
  authorizedName: string;
  designation: string;
  signatureKey: string | null;
  signatureMimeType: string | null;
  signatureUrl: string | null;
  signatureWidth: number;
  paragraphSpacing: number;
  createdAt: string;
  updatedAt: string;
};

export type LetterheadDraft = Omit<LetterheadRecord, "id" | "signatureUrl" | "createdAt" | "updatedAt"> & {
  id?: string;
  signatureUrl?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type CompanyBrand = {
  name: string;
  legalName: string;
  logoUrl: string;
  website: string;
  email: string;
  phone: string;
  alternatePhone: string;
  address: string;
};

export const DEFAULT_LETTER_BODY = "";

export function emptyLetterheadDraft(): LetterheadDraft {
  return {
    name: "Untitled letter",
    referenceNumber: "",
    date: new Date().toISOString().slice(0, 10),
    recipientName: "",
    recipientAddress: "",
    subject: "",
    bodyHtml: DEFAULT_LETTER_BODY,
    closing: "Sincerely,",
    authorizedName: "",
    designation: "",
    signatureKey: null,
    signatureMimeType: null,
    signatureWidth: 150,
    paragraphSpacing: 12,
  };
}
