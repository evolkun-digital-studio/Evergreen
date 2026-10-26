import { config } from "dotenv";
import { validateProductionEnvironment } from "../src/lib/env/production.mjs";

config({ path: [".env.local", ".env"], quiet: true });
validateProductionEnvironment(process.env, { requireProduction: true });
console.log("Production environment validation passed.");
