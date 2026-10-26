import { describe, expect, it } from "vitest";
import { parseEmailList, resolveNotificationRecipients } from "@/lib/notifications";
import { settingsSchema } from "@/lib/validation/settings";
import { DEFAULT_SETTINGS } from "@/lib/cms/defaults";

describe("parseEmailList", () => {
  it("splits on commas, semicolons, spaces and new lines", () => {
    expect(parseEmailList("a@x.com, b@x.com;c@x.com\nd@x.com e@x.com")).toEqual(["a@x.com", "b@x.com", "c@x.com", "d@x.com", "e@x.com"]);
  });

  it("lowercases, drops duplicates and anything that is not an address", () => {
    expect(parseEmailList("A@X.com, a@x.com, nonsense, , b@x.com")).toEqual(["a@x.com", "b@x.com"]);
  });

  it("returns nothing for empty or missing input", () => {
    expect(parseEmailList("")).toEqual([]);
    expect(parseEmailList(undefined)).toEqual([]);
  });
});

describe("resolveNotificationRecipients", () => {
  it("prefers the admin Settings list over the environment", () => {
    expect(resolveNotificationRecipients(["boss@x.com"], "old@x.com")).toEqual(["boss@x.com"]);
  });

  it("falls back to ENQUIRY_EMAIL_TO when Settings has none", () => {
    expect(resolveNotificationRecipients([], "old@x.com, other@x.com")).toEqual(["old@x.com", "other@x.com"]);
  });

  it("sends nothing when neither is set", () => {
    expect(resolveNotificationRecipients([], undefined)).toEqual([]);
  });
});

describe("settings: notification emails", () => {
  const valid = { ...DEFAULT_SETTINGS, organization: { ...DEFAULT_SETTINGS.organization } };

  it("defaults to an empty list", () => {
    expect(DEFAULT_SETTINGS.notificationEmails).toEqual([]);
  });

  it("accepts and lowercases valid addresses", () => {
    expect(settingsSchema.parse({ ...valid, notificationEmails: [" Boss@X.com "] }).notificationEmails).toEqual(["boss@x.com"]);
  });

  it("rejects an invalid address and more than ten", () => {
    expect(settingsSchema.safeParse({ ...valid, notificationEmails: ["not-an-email"] }).success).toBe(false);
    expect(settingsSchema.safeParse({ ...valid, notificationEmails: Array.from({ length: 11 }, (_, i) => `a${i}@x.com`) }).success).toBe(false);
  });
});
