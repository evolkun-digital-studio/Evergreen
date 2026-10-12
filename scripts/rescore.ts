import "./_env";
import mongoose from "mongoose";
import { rescorePosts } from "@/lib/posts/rescore";

// Recomputes SEO/AEO/GEO/readability scores for all posts (e.g. after changing the scoring rules).
rescorePosts()
  .then((r) => console.log(`Rescored ${r.rescored} of ${r.total} posts.`))
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
