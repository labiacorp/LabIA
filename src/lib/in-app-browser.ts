// Every campaign link this app hands out gets opened from somewhere, and
// for the ones a KOL posts to their story or bio that somewhere is an
// in-app webview -- Instagram's own browser, not Safari or Chrome. That
// webview is a dead end for two things this flow depends on: a PWA cannot
// be installed from inside it (no "add to home screen" exists there), and
// nothing the page does can escape it on iOS. target="_blank" is inert:
// the webview has no concept of another tab to open into.
//
// So the page has to notice where it is and say something different. This
// is deliberately a pure function over a user-agent string rather than a
// hook or a component, so the decision is unit-testable against real UA
// strings instead of only observable by opening Instagram on a phone.
//
// UA sniffing is a heuristic and this one is allowed to be wrong: every
// caller uses it additively (show an extra hint, swap one section's
// copy), never to block or gate anything. A false negative costs a user
// nothing they don't already have today; a false positive costs them one
// dismissible bar.

export type InAppBrowserApp =
  | "instagram"
  | "facebook"
  | "threads"
  | "tiktok"
  | "linkedin"
  | "other";

export type MobilePlatform = "ios" | "android" | "unknown";

export type InAppBrowserInfo = {
  // null means "an ordinary browser, as far as we can tell" -- the case
  // every existing behaviour already handles.
  app: InAppBrowserApp | null;
  platform: MobilePlatform;
  // Android intents genuinely hand the URL to the real browser. iOS has
  // no equivalent: no scheme, no API, nothing a page can call escapes a
  // WKWebView, which is why the iOS branch of every caller is
  // instructions pointing at the host app's own menu rather than a
  // button. Confirmed behaviour, not an untested assumption -- if this
  // ever becomes false on iOS, this flag is the single place to flip.
  canEscapeProgrammatically: boolean;
};

export function detectMobilePlatform(userAgent: string): MobilePlatform {
  if (/iPad|iPhone|iPod/.test(userAgent)) return "ios";
  if (/Android/.test(userAgent)) return "android";
  return "unknown";
}

export function detectInAppBrowser(userAgent: string): InAppBrowserInfo {
  const platform = detectMobilePlatform(userAgent);
  const app = detectApp(userAgent);
  return {
    app,
    platform,
    canEscapeProgrammatically: app !== null && platform === "android",
  };
}

function detectApp(userAgent: string): InAppBrowserApp | null {
  // Instagram tags its webview on both platforms with a plain
  // "Instagram" token. Threads ships the Barcelona token and also carries
  // Facebook's FB* tokens, so it has to be tested before them.
  if (/Instagram/i.test(userAgent)) return "instagram";
  if (/Barcelona|Threads/i.test(userAgent)) return "threads";
  // FBAN/FBAV are Facebook's app-name/app-version tokens; FB_IAB is the
  // in-app-browser marker specifically. Messenger reuses the same family.
  if (/FBAN|FBAV|FB_IAB|FBIOS|Messenger/i.test(userAgent)) return "facebook";
  if (/musical_ly|Bytedance|TikTok/i.test(userAgent)) return "tiktok";
  if (/LinkedInApp/i.test(userAgent)) return "linkedin";
  // WhatsApp is deliberately NOT here. It has no distinctive iOS token to
  // match on, and on both platforms it hands ordinary https links to the
  // real browser rather than keeping them in a webview -- so there is
  // nothing to warn about and no reliable way to detect it. Adding a
  // guess for it would only produce false positives on real browsers.
  return null;
}

// Hands the current URL to the device's real browser. Android only, by
// construction -- callers must check canEscapeProgrammatically first
// rather than calling this and hoping.
//
// The `browser_fallback_url` is what makes this safe: if no matching
// browser is installed, Android loads that instead of showing an error
// page, so the worst case is the user staying exactly where they already
// were. `package` is deliberately left off -- pinning com.android.chrome
// fails outright on a device whose browser is Samsung Internet or
// Firefox, and the unpinned form lets Android pick the user's default.
export function androidBrowserIntentUrl(url: string): string {
  const withoutScheme = url.replace(/^https?:\/\//, "");
  return `intent://${withoutScheme}#Intent;scheme=https;action=android.intent.action.VIEW;S.browser_fallback_url=${encodeURIComponent(url)};end`;
}
