import "./_env";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { Author, Category, SiteSettings, User } from "@/lib/models";
import { hashPassword } from "@/lib/auth/password";
import { DEFAULT_SETTINGS } from "@/lib/cms/defaults";
import { slugify } from "@/lib/slug";

// Idempotent: creates site settings, resets the configured admin and creates default categories.

const CATEGORIES: { name: string; description: string }[] = [
  { name: "E-Waste", description: "Dismantling and recycling electronics under the E-Waste (Management) Rules." },
  { name: "Battery Recycling", description: "Safe collection, handling and recycling of waste batteries." },
  { name: "Plastic Recycling", description: "Plastic categories, recycling targets and the Plastic Waste Management Rules." },
  { name: "Metal Recovery", description: "Recovering useful metals from electronic and industrial scrap." },
  { name: "EPR & Compliance", description: "Extended Producer Responsibility targets, credits and CPCB filings for producers." },
  { name: "Sustainability", description: "Measuring and reporting the environmental effect of recycling work." },
  { name: "Company News", description: "Announcements from Ever Green E-Waste Recycling Management." },
];

const LEGACY_ADMIN = /^(admin@indiawms\.in|dev[-+.]?admin(?:@|$))/i;

async function main() {
  await connectDB();

  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  const name = "Evergreen Admin";
  if (!email || !password) throw new Error("Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD in .env first.");
  if (password.length < 12) throw new Error("SEED_ADMIN_PASSWORD must be at least 12 characters.");

  // Site settings singleton
  await SiteSettings.findOneAndUpdate(
    { key: "site" },
    { $setOnInsert: { key: "site" }, $set: DEFAULT_SETTINGS },
    { upsert: true },
  );

  // Admin user + linked author profile
  let user = await User.findOne({ email });
  if (!user) {
    user = await User.create({ name, email, passwordHash: await hashPassword(password), role: "ADMIN", active: true });
    console.log("admin created");
  } else {
    user.name = name;
    user.passwordHash = await hashPassword(password);
    user.role = "ADMIN";
    user.active = true;
    await user.save();
    console.log("admin password reset");
  }
  if (!user.authorId) {
    const author = await Author.create({
      name,
      slug: slugify(name),
      jobTitle: "Administrator",
      bio: "Administrator for Ever Green E-Waste Recycling Management.",
      expertise: ["Extended Producer Responsibility", "E-waste management", "Plastic waste management"],
      userId: user._id,
    });
    user.authorId = author._id;
    await user.save();
  } else {
    await Author.updateOne({ _id: user.authorId }, { $set: { name, userId: user._id } });
  }

  const legacyAdmins = await User.find({ _id: { $ne: user._id }, role: "ADMIN", active: true }).select({ email: 1 }).lean();
  for (const legacy of legacyAdmins.filter((candidate) => LEGACY_ADMIN.test(candidate.email))) {
    await User.updateOne({ _id: legacy._id }, { $set: { active: false } });
    console.log(`disabled admin: ${legacy.email}`);
  }

  // Categories
  for (const [i, c] of CATEGORIES.entries()) {
    const slug = slugify(c.name);
    await Category.updateOne(
      { slug },
      { $setOnInsert: { name: c.name, slug, description: c.description, sortOrder: i, seoTitle: `${c.name} Articles & Guides` } },
      { upsert: true },
    );
  }

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error instanceof Error ? error.message : "Seed failed");
  await mongoose.disconnect();
  process.exit(1);
});
