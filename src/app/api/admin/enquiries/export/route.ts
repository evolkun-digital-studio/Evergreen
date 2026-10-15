import { requireActionUser } from "@/lib/auth/session";
import { connectDB } from "@/lib/db";
import { Enquiry } from "@/lib/models";

const csv = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;

export async function GET() {
  await requireActionUser("manageLeads");
  await connectDB();
  const rows = await Enquiry.find().sort({ createdAt: -1 }).lean();
  const lines = ["Created,Name,Phone,Email,Company,Source,Service,Status,Message,Calculator snapshot", ...rows.map((row) => [row.createdAt.toISOString(), row.name, row.phone, row.email, row.company, row.source, row.service, row.status, row.message, row.calculatorSnapshot ? JSON.stringify(row.calculatorSnapshot) : ""].map(csv).join(","))];
  return new Response(`\uFEFF${lines.join("\r\n")}`, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="evergreen-enquiries.csv"`, "Cache-Control": "no-store" } });
}
