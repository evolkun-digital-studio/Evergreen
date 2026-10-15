import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  connect: vi.fn(),
  setServers: vi.fn(),
  resolverSetServers: vi.fn(),
  resolveSrv: vi.fn(),
  resolveTxt: vi.fn(),
}));

vi.mock("mongoose", () => ({
  default: {
    connect: mocks.connect,
    connection: { readyState: 0 },
  },
}));

vi.mock("node:dns", () => ({
  default: {
    setServers: mocks.setServers,
    promises: {
      Resolver: class {
        setServers = mocks.resolverSetServers;
        resolveSrv = mocks.resolveSrv;
        resolveTxt = mocks.resolveTxt;
      },
    },
  },
}));

import { connectDB } from "@/lib/db-core";

describe("MongoDB DNS configuration", () => {
  beforeEach(() => {
    process.env.MONGODB_URI = "mongodb+srv://user:password@example.mongodb.net/";
    process.env.MONGODB_DB = "evergreen";
    process.env.MONGODB_DNS_SERVERS = "1.1.1.1, 8.8.8.8";
    mocks.resolveSrv.mockResolvedValue([
      { name: "node-00.example.mongodb.net", port: 27017, priority: 0, weight: 0 },
      { name: "node-01.example.mongodb.net", port: 27017, priority: 0, weight: 0 },
    ]);
    mocks.resolveTxt.mockResolvedValue([["authSource=admin&replicaSet=atlas-example-shard-0"]]);
    mocks.connect.mockRejectedValue(new Error("stop after DNS setup"));
  });

  afterEach(() => {
    delete process.env.MONGODB_DNS_SERVERS;
    vi.clearAllMocks();
  });

  it("configures explicit DNS resolvers before connecting to an SRV cluster", async () => {
    await expect(connectDB()).rejects.toMatchObject({ code: "unknown" });

    expect(mocks.resolverSetServers).toHaveBeenCalledWith(["1.1.1.1", "8.8.8.8"]);
    expect(mocks.connect).toHaveBeenCalledWith(
      "mongodb://user:password@node-00.example.mongodb.net:27017,node-01.example.mongodb.net:27017/?authSource=admin&replicaSet=atlas-example-shard-0&tls=true",
      expect.any(Object),
    );
    expect(mocks.resolverSetServers.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.connect.mock.invocationCallOrder[0],
    );
  });
});
