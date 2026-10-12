import { z } from "zod";
import { services } from "@/content/services";

export const SERVICE_OPTIONS = services.map(s => s.title) as [string, ...string[]];

export const enquirySchema = z.object({
  name: z.string().trim().min(2, "Please enter your name.").max(120),
  phone: z
    .string()
    .trim()
    .regex(/^[+\d][\d\s-]{7,16}$/, "Please enter a valid phone number."),
  email: z.union([z.literal(""), z.string().trim().email("Please enter a valid email address.").max(200)]),
  company: z.string().trim().max(160).optional().default(""),
  service: z.enum(SERVICE_OPTIONS, { message: "Please choose a service." }),
  message: z.string().trim().min(10, "Please describe the waste, quantity and location.").max(4000),
  consent: z.literal(true, { message: "Please agree so that we can contact you." }),
  // Honeypot: must stay empty.
  website: z.string().max(0).optional().default(""),
});

export type EnquiryInput = z.input<typeof enquirySchema>;
