// Terms of Use + Privacy Policy acceptance, recorded on the account (consentAcceptedAt and
// consentTermsVersion). Same model as Leaner's src/lib/consent.ts.

// Bump by hand whenever /termos or /privacidade change in a way that needs a fresh acceptance, and
// update LEGAL_UPDATED_AT with it. Accounts keep the version they accepted, so a re-consent can target
// them. Nothing derives this from the text: editing the pages without bumping it means every account
// silently reads as having accepted the new wording.
export const CURRENT_TERMS_VERSION = "2026-10";
export const LEGAL_UPDATED_AT = "outubro de 2026";

// The form field the sign-up checkbox and its server action share. Here, not in a client component:
// a "use client" module's exports become client references when a server action imports them.
export const CONSENT_FIELD = "acceptTerms";

// When tracking began (the migration's timestamp). Accounts created before it were never asked and are
// not asked now; their null fields stay null. Backfilling them would record an acceptance nobody gave.
export const CONSENT_TRACKING_SINCE = new Date("2026-10-05T16:37:00.000Z");

export const needsConsent = (user: { createdAt: Date; consentAcceptedAt: Date | null }) =>
  user.consentAcceptedAt === null && user.createdAt >= CONSENT_TRACKING_SINCE;

export const consentAcceptedNow = () => ({ consentAcceptedAt: new Date(), consentTermsVersion: CURRENT_TERMS_VERSION });
