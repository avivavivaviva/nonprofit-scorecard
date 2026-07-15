# CONTEXT — Nonprofit Brand Marketing Scorecard

Handoff doc for whoever (or whatever) works on this repo next. Read this first.

## What this is

An interactive, single-page "research readiness" scorecard for nonprofit /
cause-driven fundraising teams, built as a lead magnet for Grow Progress
(a research + message-testing firm; products are Rapid Message Tests (RMTs) and
Audience Understanding (AU) surveys). A user answers 9 multiple-choice questions,
gets a 0–5 score, a peer benchmark, their single biggest gap, and a tailored
"pre-launch plan" for their next campaign. On completion the lead is captured to
HubSpot.

The strategic point of the tool: reproduce, at the top of funnel, the same intake
that Grow Progress's research-grant proposals were built from — a real research
question + audience + the decision they're unsure about — so a completed scorecard
hands sales a qualified lead with a research question already articulated.

## Stack / how it's built

- **Frontend:** a single React component, bundled inline into `index.html`.
  React, ReactDOM, and the compiled component are all inlined — no build step at
  runtime, nothing fetched from a CDN. This was a deliberate choice for
  reliability (earlier CDN/CORS attempts failed when opened as a file).
- **Backend:** one Vercel serverless function, `api/submit.js`, that upserts a
  HubSpot contact by email.
- **Hosting:** Vercel, connected to a GitHub repo. Every push to the production
  branch auto-deploys. Live at https://nonprofit-scorecard.vercel.app/
- **No framework** (no Next/Vite). `vercel.json` just sets cleanUrls. Vercel
  treats `index.html` as the static site and anything in `/api` as a function.

### Important: the source vs. the built file
`index.html` contains the COMPILED component. The human-readable source lived in a
separate `scorecard.jsx` during initial development (transpiled via Babel, then
React/ReactDOM inlined). That build tooling is NOT in this repo. For ongoing edits
there are two viable paths — pick one and tell the user:
  1. **Edit `index.html` directly.** The compiled component is readable enough for
     targeted changes (copy, colors, question text, scoring thresholds). Find the
     string/value and change it in place. Simplest for small edits.
  2. **Reconstitute a source + build step.** If edits get substantial, extract the
     component into a `src/` file and add a small build script (Babel + inline).
     More upfront work; better for heavy iteration. Only do this if the user wants it.
Do NOT introduce a bundler/framework rewrite without asking — it would change the
deploy model the user already has working.

## The scoring model (do not change without discussing)

Five SCORED questions, each worth 1–4 points → total 0–20 → displayed as 0–5.0.
The five dimensions (a maturity ladder; options are intentionally in ascending
1→4 order — randomization was tried and deliberately removed because the ladder
reads better):
  1. When you decide (timing)
  2. Who you can reach (reach)
  3. What you measure (measure)  ← MULTI-SELECT; scored by the HIGHEST pick
  4. Why, not just which (why)
  5. One-off vs. motion (motion)

Four SITUATIONAL questions (NOT scored — they build the tailored plan):
  6. Campaign focus (campaign)
  7. Audience to move (audience)
  8. Least-sure strategy (decision)
  9. Channels (channels) ← MULTI-SELECT; some channels have no feedback loop and
     trigger an extra "blind channel" plan step

Derived on results: tier (4 bands), biggest gap (lowest-scoring dimension),
recommended product (mapped from gap), percentile. `PEER_MEDIAN = 2.6` and the
percentile formula are PLACEHOLDERS — replace with real data once volume exists.

## HubSpot capture — how it works

`api/submit.js` is called TWICE per user (design chosen deliberately):
  - **On gate submit** ("Reveal my score" click): identity + situational answers.
    Creates the contact.
  - **On results render** (a useEffect that fires once): score, tier, gap, all
    dimension raw answers + points, plan text. Updates the same contact.
Both calls include `email`, which is HubSpot's dedupe key, so they merge onto ONE
contact (function creates on first call, 409 → updates on second).

Failure behavior (also deliberate): if the token is missing or HubSpot errors, the
function returns `{ok:false,...}` with a 200 and the USER STILL SEES THEIR RESULTS.
Capture must never block the experience. Errors are logged server-side (visible in
Vercel function logs) but never surfaced to the browser.

Security: the HubSpot token is read from `process.env.HUBSPOT_TOKEN` server-side
only — never sent to the browser. The function whitelists exactly which property
keys it will write (the `ALLOWED` set); a client cannot write arbitrary properties.
This is why HubSpot internal property names must match EXACTLY — see property map.

### Required for capture to actually write (both must be true)
1. The `scorecard_*` contact properties exist in HubSpot with exact internal names.
   (See the separate property-map doc the user has. Key fields: scorecard_score,
   scorecard_tier, scorecard_biggest_gap, scorecard_reco_product, the per-question
   raw+points fields, the situational fields, scorecard_blind_channel,
   scorecard_completed_at, scorecard_source, scorecard_plan_text. Identity maps to
   HubSpot defaults: email, firstname, lastname, company.)
2. `HUBSPOT_TOKEN` is set in Vercel env vars (Private App token, scope
   `crm.objects.contacts.write`) AND a deploy happened after it was added.

### Attribution
`?src=LABEL` on the URL is stored in `scorecard_source` (defaults to "direct").

## OPEN ITEMS (in priority order)

1. **Verify a live HubSpot submission.** THE current blocker. Do one real run at
   `/?src=test` with a findable email, watch the two `/api/submit` calls in the
   browser Network tab, and confirm the contact appears in HubSpot with
   `scorecard_*` fields populated. Likely first failure = properties not yet
   created → `create_failed`. `vercel dev` runs the function locally for testing
   without deploying.
2. **Follow-up email + HubSpot workflow.** Not built yet. Trigger on
   `scorecard_completed_at is known`; personalize on `scorecard_tier` and
   `scorecard_biggest_gap`; lead with `scorecard_reco_product`. This is a
   HubSpot-side build (no repo code), but the copy needs drafting.
3. **Real benchmark data.** Replace the placeholder `PEER_MEDIAN` / percentile once
   there are enough real submissions to compute an honest sector distribution.
4. **Copy is still placeholder-grade** in places; the result-screen "proto-note"
   line should be removed before any real prospect sees it.

## Brand

Colors (from GP brand guide):
  - Dark Purple `#432c97` (primary), Darkest Purple `#1f1628` (deep/ink),
    Blue `#6c9bff` (accent), Light Purple `#dcd2ff`, Lightest Purple `#f2f2fd`
    (page bg), Lightest Blue `#d7e8f8`, Periwinkle `#5b5dc0`, Light Gray `#f2f2f2`.
  - NOTE: earlier drafts used an orange/teal accent that is NOT in the brand
    system — those have been removed. Don't reintroduce them.
Logo: the four-square arrow mark is drawn as inline SVG in the masthead (three
dark-purple squares + one blue, top-right). Not a raster asset.

## Conventions the user cares about
- Direct, concise communication. Options over single recommendations on strategic
  calls. No filler.
- Don't push to production without the user reviewing the change first.
- Don't reintroduce randomization of answer options.
- Keep the two-call capture design and the "never block results" failure behavior.
