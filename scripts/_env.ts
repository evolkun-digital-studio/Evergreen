// Loads .env.local then .env for standalone scripts (Next.js does this itself for the app).
import { config } from "dotenv";

config({ path: [".env.local", ".env"], quiet: true });
