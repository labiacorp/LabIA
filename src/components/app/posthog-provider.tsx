"use client";

import { useEffect } from "react";

// Product analytics, off unless NEXT_PUBLIC_POSTHOG_KEY is set (the key is a public write-only token). Session
// replay stays off on purpose: screens show users' generated images. person_profiles "identified_only" keeps
// anonymous visitors cheap. posthog-js is imported lazily so it stays out of every route's first bundle.
export function PostHogProvider() {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!key || navigator.doNotTrack === "1") return;
    const timer = setTimeout(() => {
      import("posthog-js").then(({ default: posthog }) => {
        if (posthog.__loaded) return;
        posthog.init(key, {
          api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
          person_profiles: "identified_only",
          capture_pageview: "history_change",
          disable_session_recording: true,
        });
      });
    }, 1000);
    return () => clearTimeout(timer);
  }, []);
  return null;
}
