# Legal notes for the pre-launch consult

These are the questions the health/tech lawyer should answer before public
launch. Budget 1 hour, ~$300-500.

## The product (in one paragraph)

A free web tool at highmyopes.com that asks a user to enter their refractive
prescription, age, eye history, and current symptoms. The tool computes an
urgency tier deterministically (rule layer) and then uses a large language
model (Anthropic Claude) to produce a plain-English explanation, a suggested
next step (always involving an ophthalmologist), and five questions to bring
to that appointment. The product does not name diagnoses, does not prescribe,
and does not replace clinical examination. It is explicitly framed as a
"conversation preparation tool" for the user's interaction with their doctor.

## Specific questions for the lawyer

1. **FDA / Software as a Medical Device (SaMD).** Does this product fall under
   FDA SaMD jurisdiction at any tier? If so, what tier? Does the
   deterministic-rule-layer urgency assignment change the classification?
   Are there safe-harbor patterns followed by other consumer symptom checkers
   (WebMD, Buoy, Ada) that we should adopt? What is the right disclaimer
   language for the home page and the result page that addresses SaMD
   considerations specifically?

2. **HIPAA.** Confirm — we are not a covered entity, but we will receive
   information that, if combined with identifying information, could become
   PHI. We currently store nothing per-user (no accounts, no history). Is that
   sufficient? If we add accounts and triage history (post-MVP), what changes?

3. **State telemedicine / medical advice statutes.** Are there state
   regulations that treat AI-generated health information as the practice of
   medicine? If so, in which states, and how do we avoid triggering them? Are
   there states we should geofence out of the MVP for safety?

4. **Disclaimer language.** Review and finalize:
   - The home-page emergency banner.
   - The result-page disclaimer.
   - The Terms of Service language about no doctor-patient relationship.
   - A "this is not medical advice" assertion that holds up in the user agreement.

5. **Privacy policy.** We collect refraction, age, symptoms, history at the
   moment the user submits the form, and pass them to Anthropic. What
   disclosures are required? Cookie banner needed?

6. **Liability insurance.** What kind, and at what level, is appropriate for a
   solo founder running this kind of consumer tool? Tech E&O? Cyber? Media
   liability?

7. **Advertising claims.** Marketing language we plan to use ("oriented
   information," "conversation preparation," "for high myopes by a high
   myope") — anything we should NOT say in marketing? Words to avoid?

8. **State of California specific.** CCPA implications. Anything else
   California-specific (e.g., AB 2089 mental health, AI disclosure rules
   under SB 942 or successor legislation)?

9. **Affiliate / paid tier evolution.** Currently free. If we add a paid tier
   with specialist directory + premium content, what changes legally? If we
   accept affiliate revenue from optical retailers / lens labs, what
   disclosures are required (FTC endorsement guides)?

## Hard rules we already follow

- We never name a diagnosis. Output uses "patterns like this can be
  consistent with..." not "you have...".
- We never recommend a specific medication, dose, or procedure.
- We always orient toward professional care.
- We never tell a user NOT to seek care.
- Red-flag patterns hit the rule layer, not the LLM — the LLM cannot
  downgrade an emergency tier.
- Emergency-line CTA visible on every page.

## What we want documented

A short attorney letter that addresses points 1-3 above with reasoning we
can show to investors, partners, or regulators later if asked. Worth the
extra $200-300 in scope to get that letter in writing.
