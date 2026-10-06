// Fire-and-forget product event. No-op without a PostHog key, never throws, never blocks the click.
export function track(event: string, props?: Record<string, string | number | boolean>) {
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
  import("posthog-js").then(({ default: posthog }) => posthog.capture(event, props)).catch(() => {});
}
