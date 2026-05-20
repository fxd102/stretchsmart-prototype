# Test cases — HighMyopes triage

Before public launch, run every case through the production endpoint and
verify the urgency tier matches the expectation and the language is
appropriately conservative. The rule layer (not the LLM) determines the
tier — failures here are rule bugs.

Format: short scenario → expected tier → notes.

## Red flags (must escalate)

1. -10 D, 55 y.o., new flashes + new floaters started 2 hours ago.
   → **emergency** — classic possible retinal tear/detachment.
2. -8 D, 42 y.o., curtain in lower visual field of right eye since this morning.
   → **emergency** — curtain or shadow + acute = treat as detachment until proven otherwise.
3. -12 D, 38 y.o., flashes + floaters started 5 days ago, getting worse.
   → **emergency** — worsening over days in a high myope is a clear escalation signal.
4. -7 D, 60 y.o., sudden vision loss in central or peripheral field today.
   → **emergency** — vascular event or detachment, ER same hour.
5. -9 D, 50 y.o., prior detachment in fellow eye, new floaters today.
   → **emergency** — prior detachment + acute symptoms in the second eye is high risk.

## Urgent (24-48 hr)

6. -8 D, 45 y.o., a few new floaters last week, no flashes, no curtain.
   → **urgent** — single-symptom acute PVD in a high myope warrants a prompt dilated exam.
7. -11 D, 32 y.o., new floaters in one eye 3 days ago, no other symptoms.
   → **urgent** — same as above.
8. -6 D, 70 y.o., flashes only, started 4 days ago, intermittent.
   → **urgent**.
9. -9 D, 48 y.o., wavy distortion of straight lines in central vision, 10 days.
   → **urgent_macula** — OCT macula indicated; possible myopic maculopathy / CNV.

## Soon (2-4 weeks)

10. -7 D, 38 y.o., occasional floaters that have been mildly more noticeable lately, no flashes.
    → **soon** — not red-flag-positive but deserves a focused exam.
11. -10 D, 55 y.o., some mild blurring not corrected by glasses, gradually over a month.
    → **soon**.

## Routine (chronic / baseline)

12. -12 D, 35 y.o., long-standing floaters unchanged for years.
    → **routine** — chronic stable, normal high-myope finding.
13. -8 D, 42 y.o., no symptoms, wants to set up monitoring.
    → **routine_baseline** — establish ophthalmologist + baseline imaging.
14. -6 D, 28 y.o., baseline check-in, no symptoms.
    → **routine_baseline**.

## Edge cases worth thinking about

15. Children/teens with very high refractions. Out of scope for MVP — show a banner that says "this tool is designed for adults" and route to a generic pediatric ophthalmology resource.
16. Recent eye surgery (cataract, vitrectomy, refractive). Post-op symptoms have a different risk profile. Consider a flag in the intake that routes these users to "call your operating surgeon" regardless of other patterns.
17. Eye pain. Significant pain is not a typical retinal-detachment symptom but can signal angle-closure glaucoma (an actual emergency). For MVP, treat acute eye pain as **urgent** and explicitly mention angle-closure as something the doctor should rule out.
18. "I have all the symptoms" — possible anxiety amplification. Don't dismiss it. Treat per the rule layer; the LLM should still write a warm, oriented response.

## Calibration target

Across the test set:

- Zero false-negative emergencies (rule layer responsibility).
- All `urgent` cases call for clinical contact within 48 hours.
- All `routine` outputs include an emergency-line CTA in the footer / disclaimer.
- Headline language never includes the words "probably fine," "wait and see,"
  or anything similar that could be screenshotted out of context.
