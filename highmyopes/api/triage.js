// /api/triage — Vercel serverless function (skeleton, not yet deployed)
//
// Wired for production once an ANTHROPIC_API_KEY env var exists on the host.
// Until then the front-end calls a local mock in app.js — this file is the
// real implementation it should switch to.

import Anthropic from '@anthropic-ai/sdk';
import fs from 'node:fs/promises';
import path from 'node:path';

const SYSTEM_PROMPT_PATH = path.join(process.cwd(), 'prompts/system_prompt.md');

const anthropic = new Anthropic();   // reads ANTHROPIC_API_KEY from env

// ---------------------------------------------------------------------------
// Rule layer — runs BEFORE the LLM. Determines urgency tier deterministically
// for red-flag patterns so the model can never downgrade an emergency.
// ---------------------------------------------------------------------------
function urgencyTier(d) {
  const acuteToday = d.onset === 'today';
  const acuteWeek = d.onset === 'week';
  const acute = acuteToday || acuteWeek;

  const redFlagNow = d.s_curtain || d.s_loss;
  const redFlagComboAcute = d.s_flashes && d.s_floaters_new;

  if (acuteToday && (redFlagNow || redFlagComboAcute)) return 'emergency';
  if (acute && redFlagNow) return 'emergency';
  if (d.prior_detachment && acute && (d.s_flashes || d.s_floaters_new)) return 'emergency';

  if (acute && (d.s_flashes || d.s_floaters_new)) return 'urgent';
  if (d.s_distortion && (acuteWeek || d.onset === 'month')) return 'urgent_macula';
  if (d.s_pain && acute) return 'urgent';

  if (d.s_floaters_chronic && !d.s_floaters_new && !d.s_flashes) return 'routine_chronic';
  if (d.s_none || d.onset === 'none') return 'routine_baseline';

  return 'soon';
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' });
  }

  let intake;
  try { intake = typeof req.body === 'string' ? JSON.parse(req.body) : req.body; }
  catch { return res.status(400).json({ error: 'invalid JSON' }); }

  // Light validation; production should add stricter schema checks.
  if (typeof intake?.sphere !== 'number' || typeof intake?.age !== 'number') {
    return res.status(400).json({ error: 'missing required fields (sphere, age)' });
  }

  const tier = urgencyTier(intake);
  const systemPrompt = await fs.readFile(SYSTEM_PROMPT_PATH, 'utf8');

  const userMessage =
    `Intake:\n${JSON.stringify(intake, null, 2)}\n\n` +
    `Pre-computed urgency tier: ${tier}\n\n` +
    `Write the user-facing response. Return strict JSON per the schema.`;

  const completion = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 900,
    temperature: 0.4,
    system: [
      {
        type: 'text',
        text: systemPrompt,
        // Cache the system prompt — it does not change per request.
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [{ role: 'user', content: userMessage }],
  });

  // Claude returns content blocks; the first text block is the JSON body.
  const text = completion.content
    .filter(b => b.type === 'text')
    .map(b => b.text)
    .join('');

  let body;
  try { body = JSON.parse(text); }
  catch { return res.status(502).json({ error: 'model returned invalid JSON', raw: text }); }

  return res.status(200).json({ tier, ...body });
}
