import { describe, expect, it } from "vitest";
import {
  androidBrowserIntentUrl,
  detectInAppBrowser,
  detectMobilePlatform,
} from "./in-app-browser";

// Real user-agent strings, not invented ones -- the whole value of this
// module is that it matches what the actual apps send, so a test built
// from a guessed UA would prove nothing.
const UA = {
  instagramIos:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/21F90 Instagram 336.0.0.25.90 (iPhone14,3; iOS 17_5_1; pt_BR; pt-BR; scale=3.00; 1284x2778; 600882900)",
  instagramAndroid:
    "Mozilla/5.0 (Linux; Android 13; SM-A536E Build/TP1A.220624.014; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/122.0.6261.90 Mobile Safari/537.36 Instagram 322.0.0.37.95 Android",
  facebookIos:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBDV/iPhone15,2;FBMD/iPhone;FBSN/iOS;FBSV/17.4;FBID/phone;FBLC/pt_BR]",
  threadsAndroid:
    "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36 Barcelona 320.0.0.32.110 Android",
  tiktokAndroid:
    "Mozilla/5.0 (Linux; Android 12; V2111) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/106.0.5249.126 Mobile Safari/537.36 musical_ly_2022803040 JsSdk/1.0 NetType/WIFI",
  linkedinIos:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 LinkedInApp/9.29.0",
  safariIos:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
  chromeAndroid:
    "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.6422.72 Mobile Safari/537.36",
  chromeDesktop:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  whatsappAndroid:
    "Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Mobile Safari/537.36",
};

describe("detectMobilePlatform", () => {
  it("reads the platform out of real mobile agents", () => {
    expect(detectMobilePlatform(UA.instagramIos)).toBe("ios");
    expect(detectMobilePlatform(UA.instagramAndroid)).toBe("android");
    expect(detectMobilePlatform(UA.chromeDesktop)).toBe("unknown");
  });
});

describe("detectInAppBrowser", () => {
  it("recognizes Instagram on both platforms -- the case this exists for", () => {
    expect(detectInAppBrowser(UA.instagramIos)).toEqual({
      app: "instagram",
      platform: "ios",
      canEscapeProgrammatically: false,
    });
    expect(detectInAppBrowser(UA.instagramAndroid)).toEqual({
      app: "instagram",
      platform: "android",
      canEscapeProgrammatically: true,
    });
  });

  it("recognizes the other Meta-family and social webviews", () => {
    expect(detectInAppBrowser(UA.facebookIos).app).toBe("facebook");
    expect(detectInAppBrowser(UA.tiktokAndroid).app).toBe("tiktok");
    expect(detectInAppBrowser(UA.linkedinIos).app).toBe("linkedin");
  });

  it("reads Threads as Threads, not Facebook -- it carries both families' tokens", () => {
    expect(detectInAppBrowser(UA.threadsAndroid).app).toBe("threads");
  });

  it("leaves ordinary browsers alone", () => {
    for (const ua of [UA.safariIos, UA.chromeAndroid, UA.chromeDesktop]) {
      expect(detectInAppBrowser(ua).app).toBeNull();
      expect(detectInAppBrowser(ua).canEscapeProgrammatically).toBe(false);
    }
  });

  it("does not claim WhatsApp -- its agent is indistinguishable from the real browser", () => {
    // Not an oversight: WhatsApp hands https links to the real browser
    // anyway, so there is nothing to warn about, and guessing at it would
    // only mislabel ordinary Chrome sessions.
    expect(detectInAppBrowser(UA.whatsappAndroid).app).toBeNull();
  });

  it("never promises a programmatic escape on iOS, webview or not", () => {
    // The whole iOS branch of the UI depends on this being false: there
    // is no scheme or API that leaves a WKWebView.
    expect(detectInAppBrowser(UA.instagramIos).canEscapeProgrammatically).toBe(false);
    expect(detectInAppBrowser(UA.facebookIos).canEscapeProgrammatically).toBe(false);
    expect(detectInAppBrowser(UA.linkedinIos).canEscapeProgrammatically).toBe(false);
  });
});

describe("androidBrowserIntentUrl", () => {
  it("builds an intent that carries the original URL as its fallback", () => {
    const intent = androidBrowserIntentUrl("https://www.useleaner.com/bcb/tato");
    expect(intent).toBe(
      "intent://www.useleaner.com/bcb/tato#Intent;scheme=https;action=android.intent.action.VIEW;" +
        "S.browser_fallback_url=https%3A%2F%2Fwww.useleaner.com%2Fbcb%2Ftato;end",
    );
  });

  it("pins no package, so the user's own default browser wins", () => {
    // Pinning com.android.chrome fails outright on a phone whose browser
    // is Samsung Internet -- which is a lot of phones in Brazil.
    expect(androidBrowserIntentUrl("https://www.useleaner.com/bcb")).not.toContain("package=");
  });

  it("keeps query strings intact through the fallback encoding", () => {
    const intent = androidBrowserIntentUrl("https://www.useleaner.com/bcb?x=1&y=2");
    expect(intent).toContain("intent://www.useleaner.com/bcb?x=1&y=2#Intent");
    expect(intent).toContain(encodeURIComponent("https://www.useleaner.com/bcb?x=1&y=2"));
  });
});
