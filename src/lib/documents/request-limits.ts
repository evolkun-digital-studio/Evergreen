/**
 * How often one visitor may submit the public document request form. Generous on purpose: it stops a
 * script flooding the admin inbox, not a real person trying again or testing the form.
 */
export const REQUEST_LIMITS = {
  perIp: { max: 100, windowSeconds: 60 * 60 },
  perEmail: { max: 50, windowSeconds: 24 * 60 * 60 },
} as const;
