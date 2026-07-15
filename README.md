# Grow Progress — Nonprofit Brand Marketing Scorecard

Static, self-contained prototype. `index.html` bundles React, ReactDOM, and the
compiled component inline — no build step, nothing fetched at runtime.

---

## First-time setup (GitHub → Vercel, ~5 min, do once)

1. Create a new GitHub repo (github.com → New repository). Name it e.g.
   `nonprofit-scorecard`. Keep it private if you like.
2. Upload these files: on the empty repo page click **uploading an existing file**,
   drag in `index.html`, `vercel.json`, `README.md`, `.gitignore`, then **Commit**.
3. Go to vercel.com → **Add New… → Project → Import** and pick the repo.
4. Framework preset: **Other**. Build command: leave empty. Output dir: `./`.
5. **Deploy.** You get a live URL in ~30s. Every future commit auto-deploys.

## How to push an update (the everyday flow)

When you get a new `index.html` (or any file):

1. In the GitHub repo, click the file (e.g. `index.html`).
2. Click the **pencil (Edit)** icon.
3. Select all, paste the new contents, scroll down, **Commit changes**.
4. Vercel redeploys automatically within ~30 seconds. Refresh your live URL.

Prefer not to paste large files in the browser? Use GitHub Desktop (no terminal):
drop the new file into the local repo folder, it shows the change, click
**Commit** then **Push**. Same auto-deploy result.

### Rolling back
Vercel dashboard → your project → **Deployments** → find a previous good one →
**⋯ → Promote to Production**. One click, instant.

## Custom domain
Vercel project → **Settings → Domains** → add e.g. `scorecard.growprogress.ai`.
Vercel shows a CNAME to add wherever growprogress.ai DNS lives.

---

## Status / what's next
- Benchmark (2.6) and percentile are placeholders.
- Lead capture IS wired: `/api/submit.js` upserts a HubSpot contact by email.
  The front-end calls it twice — on gate submit (identity + situational answers)
  and again when results render (score, tier, gap, dimension points, plan text).
  Same email both times, so HubSpot merges onto one contact.

### Required for capture to work
1. Create the Scorecard contact properties in HubSpot (see the property-map doc).
   Internal names must match exactly — the function writes to those keys.
2. In Vercel → Settings → Environment Variables, add `HUBSPOT_TOKEN`
   (your Private App token, scope `crm.objects.contacts.write`). No prefix.
3. Redeploy so the env var takes effect.

If the token is missing or HubSpot errors, the function returns quietly and the
user still sees their results — capture never blocks the experience.

### Attribution
Add `?src=bridge_conf` (or any label) to the scorecard URL and it's stored in
`scorecard_source`, so you can see where each lead came from.
