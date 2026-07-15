// Vercel serverless function: POST /api/submit
// Upserts a HubSpot contact by email. Called twice per user:
//   phase "gate"   → identity + situational answers (on gate submit)
//   phase "result" → score, tier, gap, dimension points, plan text (on results view)
// Both calls include email, so HubSpot merges them onto ONE contact.
//
// Requires env var HUBSPOT_TOKEN (Private App token, scope crm.objects.contacts.write).
// The token is read server-side only and never sent to the browser.

const HUBSPOT_URL = "https://api.hubapi.com/crm/v3/objects/contacts";

// Only these property keys are ever forwarded to HubSpot. Anything else in the
// request body is ignored — the browser cannot write arbitrary properties.
const ALLOWED = new Set([
  // identity (HubSpot defaults)
  "email", "firstname", "lastname", "company",
  // scorecard namespace
  "scorecard_role",
  "scorecard_score", "scorecard_score_raw", "scorecard_tier",
  "scorecard_biggest_gap", "scorecard_reco_product",
  "scorecard_q1_timing", "scorecard_q1_timing_pts",
  "scorecard_q2_reach", "scorecard_q2_reach_pts",
  "scorecard_q3_measure", "scorecard_q3_measure_pts",
  "scorecard_q4_why", "scorecard_q4_why_pts",
  "scorecard_q5_motion", "scorecard_q5_motion_pts",
  "scorecard_q6_campaign", "scorecard_q7_audience",
  "scorecard_q8_decision", "scorecard_q9_channels",
  "scorecard_blind_channel",
  "scorecard_completed_at", "scorecard_source", "scorecard_plan_text",
]);

function pickAllowed(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj || {})) {
    if (ALLOWED.has(k) && v !== undefined && v !== null && v !== "") out[k] = String(v);
  }
  return out;
}

export default async function handler(req, res) {
  // Basic CORS: same-origin in production; allow the tool to be embedded if needed.
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "method_not_allowed" });

  const token = process.env.HUBSPOT_TOKEN;
  if (!token) {
    // Don't leak config detail to the client; log for the operator.
    console.error("HUBSPOT_TOKEN is not set");
    return res.status(200).json({ ok: false, error: "not_configured" });
  }

  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }
  const props = pickAllowed(body && body.properties);

  const email = props.email;
  if (!email) return res.status(200).json({ ok: false, error: "email_required" });

  const payload = JSON.stringify({ properties: props });
  const auth = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  try {
    // Try to create. If the contact already exists (409), update it by id.
    const create = await fetch(HUBSPOT_URL, { method: "POST", headers: auth, body: payload });

    if (create.status === 409) {
      // Extract existing id from the conflict message, or look it up by email.
      let id = null;
      try {
        const j = await create.json();
        const m = j && j.message && j.message.match(/Existing ID:\s*(\d+)/);
        if (m) id = m[1];
      } catch { /* fall through to search */ }

      if (!id) {
        const search = await fetch(`${HUBSPOT_URL}/search`, {
          method: "POST", headers: auth,
          body: JSON.stringify({
            filterGroups: [{ filters: [{ propertyName: "email", operator: "EQ", value: email }] }],
            properties: ["email"], limit: 1,
          }),
        });
        const sj = await search.json();
        id = sj && sj.results && sj.results[0] && sj.results[0].id;
      }

      if (!id) return res.status(200).json({ ok: false, error: "upsert_lookup_failed" });

      const upd = await fetch(`${HUBSPOT_URL}/${id}`, { method: "PATCH", headers: auth, body: payload });
      if (!upd.ok) {
        console.error("HubSpot update failed", upd.status, await safeText(upd));
        return res.status(200).json({ ok: false, error: "update_failed" });
      }
      return res.status(200).json({ ok: true, id, action: "updated" });
    }

    if (!create.ok) {
      console.error("HubSpot create failed", create.status, await safeText(create));
      return res.status(200).json({ ok: false, error: "create_failed" });
    }

    const cj = await create.json();
    return res.status(200).json({ ok: true, id: cj.id, action: "created" });
  } catch (err) {
    console.error("submit handler error", err);
    // Never surface a hard error to the user — results should still render.
    return res.status(200).json({ ok: false, error: "exception" });
  }
}

async function safeText(r) { try { return await r.text(); } catch { return "<no body>"; } }
