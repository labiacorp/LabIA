# Account and workspace design direction

The user explicitly authorized discarding legacy branding and asked for Apple-inspired account/settings and continued autonomous design work.

## Primary references

- [Apple Settings HIG](https://developer.apple.com/design/human-interface-guidelines/settings): minimize unnecessary configuration and organize meaningful global settings. Search-index content was available; the document itself requires JavaScript.
- [Apple Account on iPhone](https://support.apple.com/en-gb/guide/iphone/iph76e54c61e/ios): identity/personal information and sign-in/security are distinct account concerns.
- [Linear's calmer interface](https://linear.app/now/behind-the-latest-design-refresh): predictable controls, quieter navigation and consistent layout.

## Applied interpretation

Keep identity visible and settings grouped. Edit through focused dialogs instead of permanently exposing upload/name forms. Referrals become one row; no reward or access grant is implied. Export remains directly available. Preserve actual server actions and validation.

Desktop gets a restrained sidebar and a compact contextual header. Mobile keeps scrollable tabs plus a complete navigation sheet. A neutral palette and blue accents use existing CSS tokens; Inter unifies display/body typography. Light is the default for new browser preferences, while existing saved choices survive.

Library emphasizes media first: direct search and type tabs, optional advanced filters, consistent preview proportions and image click-through. Original media plays/opens in the existing details viewer. Filename search now finds imports as well as productions/characters.

No changes to provider configuration, paid-generation confirmation or account access restrictions. This is an adaptation of familiar patterns, not a claim to represent how Apple would design LabIA.

## Verification

104-test full suite passed, followed by targeted library checks after search changes. Typecheck, lint and production build passed. Eight routes at 390/1024/1440px showed no document overflow (24 views). Account edit dialog, theme change, private-media detail opening and Escape behavior were checked through the browser. Real accounts were read only; all tests use disposable fixtures.
