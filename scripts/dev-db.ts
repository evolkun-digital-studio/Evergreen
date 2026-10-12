// Local development database: a single-node MongoDB replica set (transactions work) with data
// persisted in ./.mongo-data. Use it when you don't have Atlas or Docker handy:
//   pnpm db:dev      then set MONGODB_URI=mongodb://127.0.0.1:27017/?replicaSet=rs0
import { mkdirSync } from "node:fs";
import { MongoMemoryReplSet } from "mongodb-memory-server";

const port = Number(process.env.DEV_DB_PORT ?? 27017);
const dbPath = ".mongo-data";
mkdirSync(dbPath, { recursive: true });

const replSet = await MongoMemoryReplSet.create({
  replSet: { count: 1, name: "rs0", storageEngine: "wiredTiger" },
  instanceOpts: [{ port, dbPath }],
});

console.log(`MongoDB replica set ready: mongodb://127.0.0.1:${port}/?replicaSet=rs0`);
console.log("Press Ctrl+C to stop.");

const stop = async () => {
  await replSet.stop({ doCleanup: false });
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
