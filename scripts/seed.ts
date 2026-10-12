import "./_env";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { Author, Category, SiteSettings, User } from "@/lib/models";
import { hashPassword } from "@/lib/auth/password";
import { DEFAULT_SETTINGS } from "@/lib/cms/defaults";
import { slugify } from "@/lib/slug";

// Idempotent: creates the site settings, the first admin and the default categories.

const CATEGORIES: { name: string; description: string }[] = [
  { name: "Circular Economy", description: "How recovered metals and polymers get back into Indian manufacturing." },
  { name: "E-Waste", description: "Dismantling and recycling electronics under the E-Waste (Management) Rules." },
  { name: "Plastic Waste", description: "Plastic categories, recycling targets and the Plastic Waste Management Rules." },
  { name: "EPR & Compliance", description: "Extended Producer Responsibility targets, credits and CPCB filings for producers." },
  { name: "Sustainability", description: "Measuring and reporting the environmental effect of recycling work." },
  { name: "Group News", description: "Announcements from Evergreen and its associated group company." },
];

async function main() {
  await connectDB();

  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  const name = process.env.SEED_ADMIN_NAME?.trim() || "Evergreen Editorial";
  if (!email || !password) throw new Error("Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD in .env first.");
  if (password.length < 12) throw new Error("SEED_ADMIN_PASSWORD must be at least 12 characters.");

  // Site settings singleton
  const settings = await SiteSettings.findOneAndUpdate(
    { key: "site" },
    { $setOnInsert: { key: "site", ...DEFAULT_SETTINGS } },
    { upsert: true, returnDocument: "after", includeResultMetadata: true },
  );
  console.log(settings.lastErrorObject?.updatedExisting ? "• Site settings exist" : "✓ Site settings created");

  // Admin user + linked author profile
  let user = await User.findOne({ email });
  if (!user) {
    user = await User.create({ name, email, passwordHash: await hashPassword(password), role: "ADMIN" });
    console.log(`✓ Admin user created: ${email}`);
  } else {
    console.log(`• Admin user exists: ${email}`);
  }
  if (!user.authorId) {
    const author = await Author.create({
      name,
      slug: slugify(name),
      jobTitle: "Editorial Team",
      bio: "Writes about EPR compliance and e-waste and plastic recycling in India for the Evergreen group.",
      expertise: ["Extended Producer Responsibility", "E-waste management", "Plastic waste management"],
      userId: user._id,
    });
    user.authorId = author._id;
    await user.save();
    console.log(`✓ Author profile created: ${author.slug}`);
  }

  // Categories
  for (const [i, c] of CATEGORIES.entries()) {
    const slug = slugify(c.name);
    const res = await Category.updateOne(
      { slug },
      { $setOnInsert: { name: c.name, slug, description: c.description, sortOrder: i, seoTitle: `${c.name} Articles & Guides` } },
      { upsert: true },
    );
    if (res.upsertedCount) console.log(`✓ Category: ${c.name}`);
  }

  await mongoose.disconnect();
  console.log("Seed complete.");
}

main().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
