// Kept apart from posts.ts so accounts.ts and media.ts can throw it without an import cycle.
export class SocialError extends Error {}
