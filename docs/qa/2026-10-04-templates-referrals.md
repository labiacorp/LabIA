# Templates, reference selection and referrals QA

Implemented on the V2 task branch. No real provider requests or payments.

- Automated suite: 90 tests passed, then two new referral-route tests passed. Existing generation integration fixtures now explicitly choose a portrait and create a newer unselected portrait, proving execution honors the user's selection. These tests use the mock provider and disposable database users.
- Browser (disposable accounts): built-in model to free draft, prefilled script, save twice (one snapshot), duplicate briefing/script, choose a different completed portrait, reject a foreign saved model, delete a model without deleting its production.
- Referral browser flow: copy the account link, open in a separate unauthenticated context, verify HttpOnly attribution cookie and explanation page, recover from an invalid link. Actual Google OAuth conversion is not tested; server registration attribution has integration coverage.
- At 390px and 1440px: models, account, character profile and model creation have no horizontal overflow or browser exceptions. Account/models screenshots visually inspected.
- Browser workflow produced zero ledger entries and zero provider request IDs. Seeded accounts were deleted in finally blocks.
- First browser attempt found a usability issue: a sole character was not selected. Creation now selects it automatically. A subsequent timing failure was in the QA script (reading the old page before navigation), fixed by waiting for the destination URL.
- First suite exposed outdated fixtures that did not set the selected portrait and an auth mock that lacked request cookies. Updated both to represent the real contract; full suite passed afterward.

Remaining limits: referrals do not grant beta access or financial rewards; cross-device attribution is unsupported. Models store text/format snapshots, not workflow graphs/media. Reference selection currently supports existing completed FRONT images only. Google, durable imported media, voice and deployment verification remain separate work.
