import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/admin/PageHeader";
import { ListSkeleton } from "@/components/admin/skeletons";
import { requirePageUser } from "@/lib/auth/session";
import { connectDB } from "@/lib/db";
import { Enquiry } from "@/lib/models";
import { EnquiriesManager } from "./EnquiriesManager";

export const metadata: Metadata = { title: "Enquiries" };
export default function EnquiriesPage() { return <><PageHeader title="Enquiries" description="Pickup, contact and EPR calculator leads." /><Suspense fallback={<ListSkeleton title="Latest enquiries" rows={6} />}><EnquiriesLoader /></Suspense></>; }

async function EnquiriesLoader() {
  await requirePageUser("manageLeads");
  await connectDB();
  const rows = await Enquiry.find().sort({ createdAt: -1 }).limit(200).lean();
  return <EnquiriesManager rows={rows.map((row) => ({ id: row._id.toString(), name: row.name, phone: row.phone, email: row.email, company: row.company, service: row.service, message: row.message, source: row.source, status: row.status, createdAt: row.createdAt.toISOString(), snapshot: (row.calculatorSnapshot as Record<string, unknown> | null) ?? null, notes: (row.notes ?? []).map((note) => ({ text: note.text, createdAt: note.createdAt.toISOString() })) }))} />;
}
