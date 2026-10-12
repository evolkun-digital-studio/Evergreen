import "./_env";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import * as models from "@/lib/models";

// Creates missing indexes and drops ones no longer declared in the schemas.
async function main() {
  await connectDB();
  for (const [name, value] of Object.entries(models)) {
    if (typeof value !== "function" || !("syncIndexes" in value)) continue;
    const model = value as mongoose.Model<unknown>;
    await model.createCollection().catch(() => undefined);
    const dropped = await model.syncIndexes();
    const indexes = await model.listIndexes();
    console.log(`✓ ${name.padEnd(13)} ${indexes.length} indexes${dropped.length ? ` (dropped: ${dropped.join(", ")})` : ""}`);
  }
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
