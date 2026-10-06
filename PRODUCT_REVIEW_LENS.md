# Product review lens

Run any new screen or flow through this before calling it done. It is a checklist, not a style guide (the style guide is `design/reference/`).

## Step 0: look at it

Render it and look at the pixels: a screenshot at 390px and one at desktop, from a real browser. `tsc`, lint, build and a green suite all passed on layouts that were visibly broken. If the question is geometry, read `getBoundingClientRect()`.

## Reference products

When a pattern is already solved well, match its shape instead of inventing one: Stripe (forms, confirmations, money), Linear (lists, keyboard), Notion (inline editing), X and Google (account and security).

## Checklist

1. **Exposed vs revealed**: is something always open that a polished product would hide behind a click (change e-mail, change password, rare settings)?
2. **Destructive friction**: does every delete or irreversible action need a deliberate step, and can it not be hit by accident?
3. **Redundant steps**: does the flow ask for something twice, or something the app already knows?
4. **Consistency**: reuse an existing pattern (button, chip, row, sheet) before inventing a new one.
5. **The demo test**: shown to an investor or a first-time user, would any part look unfinished or need a "sorry, that part is rough"?
6. **Empty, loading and error states**: every list, form and action has all three, not only the happy path.
7. **Money (LabIA-specific)**: is the price shown before the action and the real cost after? Green is only for what costs money. A failed generation shows the refund. Never "R$ 0" for an unknown cost ("A calcular").
8. **Copy**: PT-BR, short, says what happens next. No jargon, no "credits" (it is reais).

## How to apply

If a literal reading of the request fails the checklist, build the better version and say what you changed, or ask when the better version is a much bigger change.
