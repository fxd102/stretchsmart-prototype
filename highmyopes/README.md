# HighMyopes — MVP Scaffold

A symptom and risk triage tool for high myopes (-6 D and above), framed as
conversation preparation for your ophthalmologist visit. Not a diagnostic
tool, never claims to be.

This is the **MVP scaffold** — built May 2026 by claude-584 on Faith's
go-ahead. Front-end is real and demoable. The Claude API call is mocked
locally so the UX can be evaluated before any keys, deployment, or money is
spent.

## What's in here

```
index.html              landing + intake form + result screen
styles.css              one stylesheet for everything
app.js                  form logic + LOCAL MOCK of the triage response
api/triage.js           Vercel serverless function — the REAL backend, wired
                        for Claude Sonnet, not yet deployed
prompts/system_prompt.md   the system prompt sent to Claude — the product IP
prompts/test_cases.md      18 calibration scenarios incl. all red-flag patterns
LEGAL.md                 questions for the pre-launch attorney consult
package.json             one dependency (@anthropic-ai/sdk) for the serverless fn
```

## How to look at it

Open `index.html` in a browser — it works offline. The mock triage in
`app.js` covers all four urgency tiers (emergency / urgent / soon / routine)
with hand-written sample outputs. Try a few intake combinations to feel out
the UX:

- Sphere -10, age 55, check **flashes + new floaters** + onset = **today**
  → EMERGENCY response.
- Sphere -8, age 45, check **new floaters**, onset = **last week**
  → URGENT response.
- Sphere -12, age 35, check **long-standing floaters**, onset = **chronic**
  → ROUTINE chronic response.
- Sphere -7, age 38, check **no new symptoms — baseline check-in**, onset = **nothing has changed**
  → ROUTINE baseline response.

## What's mocked vs. real

| Piece                  | Status     |
|------------------------|------------|
| Intake form            | Real       |
| Form validation        | Real       |
| Urgency rule layer     | Real (lives in both `app.js` and `api/triage.js` — keep them in sync) |
| Triage natural-language output | **Mocked locally** — 6 hand-written templates |
| Claude API call        | Skeleton at `api/triage.js`, never executed yet |
| Disclaimer / emergency banner | Real |
| About / FAQ pages      | Not yet built |
| Specialist directory   | Not in MVP |
| Accounts / history     | Not in MVP |
| Stripe / paid tier     | Not in MVP |

## Wiring the real Claude backend

When ready:

1. Deploy this repo to Vercel (or Cloudflare Pages with the Functions
   adapter). The Static parts deploy as-is; `api/triage.js` becomes the
   serverless endpoint.
2. Set `ANTHROPIC_API_KEY` as an environment variable on the host.
3. `npm install`.
4. In `app.js`, replace the call to the local `triage()` mock with:
   ```js
   const result = await fetch('/api/triage', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify(data),
   }).then(r => r.json());
   ```
5. Run the test cases in `prompts/test_cases.md` end-to-end and confirm
   every red-flag scenario returns the expected urgency tier and
   appropriately conservative language.
6. Get the attorney letter (see `LEGAL.md`) before public launch.

## Pre-launch checklist

- [ ] Attorney consult — FDA/SaMD, disclaimer language, state-level checks
- [ ] Test cases — 100% red-flag scenarios correctly tiered
- [ ] Soft launch to Faith's network + r/myopia (carefully, not spammy)
- [ ] Measure: did anyone find it useful? Did anyone return? Would-you-pay survey.
- [ ] Iterate the system prompt for 2-4 weeks based on feedback.
- [ ] Decide whether to build the paid tier (directory + premium content + history).

## Migration to a dedicated repo

This scaffold currently lives on a branch of `fxd102/stretchsmart-prototype`
because Faith hadn't yet created `fxd102/highmyopes`. When she does, the
whole tree migrates with a single `git push` and the prototype repo goes
back to being just StretchSmart.
