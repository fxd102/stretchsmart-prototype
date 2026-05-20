// HighMyopes MVP — front-end logic
// In production, the triage() call would POST to /api/triage which calls Claude.
// For this scaffold we run a deterministic mock locally so Faith can see the UX.

(() => {
  const screens = document.querySelectorAll('.screen');
  const show = (id) => {
    screens.forEach(s => s.classList.toggle('active', s.id === id));
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  document.querySelectorAll('[data-go]').forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault();
      show(el.dataset.go);
    });
  });

  const form = document.getElementById('triage-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = collect(form);
    const result = await triage(data);   // mocked, see below
    render(result);
    show('result');
  });

  function collect(form) {
    const fd = new FormData(form);
    const obj = {};
    for (const [k, v] of fd.entries()) obj[k] = v;
    // checkboxes that aren't checked are absent from FormData — normalize to false
    const bools = ['fh_detachment','prior_surgery','lattice','pvd','prior_detachment',
                   's_flashes','s_floaters_new','s_floaters_chronic','s_curtain',
                   's_distortion','s_loss','s_pain','s_none'];
    bools.forEach(b => obj[b] = fd.get(b) === 'on');
    obj.sphere = parseFloat(obj.sphere);
    obj.cylinder = parseFloat(obj.cylinder || 0);
    obj.age = parseInt(obj.age, 10);
    return obj;
  }

  // -------- MOCK TRIAGE --------
  // Replace with: const r = await fetch('/api/triage', {method:'POST', body: JSON.stringify(data)}).then(r=>r.json());
  async function triage(d) {
    // Red-flag combos — anything acute that suggests possible retinal tear/detachment.
    const acuteRed =
      (d.onset === 'today' || d.onset === 'week') &&
      (d.s_flashes || d.s_floaters_new || d.s_curtain || d.s_loss);

    const detachmentHistory = d.prior_detachment || d.fh_detachment || d.lattice;
    const veryHighMyope = d.sphere <= -8;

    if (acuteRed && (d.s_curtain || d.s_loss || d.onset === 'today')) {
      return RESPONSES.emergency(d);
    }
    if (acuteRed) {
      return RESPONSES.urgent(d);
    }
    if (d.s_distortion && (d.onset === 'week' || d.onset === 'month')) {
      return RESPONSES.urgent_macula(d);
    }
    if (d.s_floaters_chronic && !d.s_floaters_new && !d.s_flashes) {
      return RESPONSES.routine_chronic(d, veryHighMyope, detachmentHistory);
    }
    if (d.s_none || d.onset === 'none') {
      return RESPONSES.routine_baseline(d, veryHighMyope, detachmentHistory);
    }
    return RESPONSES.soon(d, veryHighMyope, detachmentHistory);
  }

  // Hand-written mock responses, one per urgency tier.
  // These will be replaced by Claude API output in production.
  const RESPONSES = {
    emergency: (d) => ({
      tier: 'emergency',
      title: 'See an ophthalmologist now',
      headline: 'Your symptoms include classic warning signs of a retinal tear or detachment. Do not wait.',
      context:
        `As a high myope (sphere ${d.sphere} D), your retina is thinner and more stretched ` +
        `than in a typical eye, which means tears and detachments happen more often and more ` +
        `easily. The combination you described — recent flashes, sudden floaters, or a curtain ` +
        `in your vision — is the textbook presentation. A detached retina is a sight-threatening ` +
        `emergency that is highly treatable in the first 24-48 hours and progressively less ` +
        `treatable after that.`,
      action:
        `Call your ophthalmologist's emergency line right now. If you can't reach anyone, go to ` +
        `an emergency room. If your eye doctor offers same-day urgent slots, take one; if not, ` +
        `say the words "I'm a high myope with new flashes and floaters and I'm worried about a ` +
        `detachment." That phrasing gets you seen.`,
      questions: [
        'Can you do a dilated exam with scleral depression today?',
        'Do I have any tears, holes, or detachment visible?',
        'If you see a tear, can you treat it today (laser barricade or cryotherapy)?',
        'What symptoms should send me back urgently in the next 48 hours?',
        'Should I avoid heavy lifting, bending, or air travel for now?',
      ],
    }),

    urgent: (d) => ({
      tier: 'urgent',
      title: 'See an ophthalmologist within 24-48 hours',
      headline: 'New flashes and floaters in a high myope are not always serious, but they always warrant a prompt dilated exam.',
      context:
        `In a high myope (sphere ${d.sphere} D), the vitreous gel separating from the retina — a ` +
        `posterior vitreous detachment, or PVD — is a normal age-related event but can pull hard ` +
        `enough on the thinned retinal tissue to cause a tear. About 10-15% of acute symptomatic ` +
        `PVDs in eyes with average refraction show a retinal tear. In high myopes the risk is ` +
        `meaningfully higher, which is why "next available appointment" should mean within a ` +
        `day or two, not a month.`,
      action:
        `Call your ophthalmologist's office, say you have new flashes and floaters, and request ` +
        `an urgent dilated exam in the next 24-48 hours. If they offer "next month," push back ` +
        `or ask for the on-call doctor. Until your exam, watch for any worsening — more floaters, ` +
        `a curtain or shadow, or vision loss — and treat that as an emergency.`,
      questions: [
        'Do you see any retinal tears, holes, or detached areas?',
        'Is what I am experiencing consistent with a PVD?',
        'If everything looks intact, what symptoms should bring me back urgently?',
        'How often should I be screened given my refraction and history?',
        'Are there any activity restrictions I should follow for the next few weeks?',
      ],
    }),

    urgent_macula: (d) => ({
      tier: 'urgent',
      title: 'See an ophthalmologist within 1-2 weeks',
      headline: 'Distorted or wavy vision in a high myope deserves a focused look at the macula.',
      context:
        `Distortion — straight lines appearing bent or wavy — is the cardinal symptom of a problem ` +
        `at the macula, the central area of the retina. In high myopes, myopic maculopathy and ` +
        `(less commonly) myopic choroidal neovascularization can cause this. Both are conditions ` +
        `that benefit from early identification: treatments exist for the latter that work best ` +
        `when started promptly.`,
      action:
        `Schedule an appointment with your ophthalmologist in the next 1-2 weeks, and mention ` +
        `specifically that you're seeing distortion. They will likely want OCT imaging of the ` +
        `macula. In the meantime, try the Amsler grid test — search "Amsler grid PDF," cover one ` +
        `eye at arm's length, and note any wavy, missing, or distorted areas.`,
      questions: [
        'Can we do OCT of the macula today?',
        'Do I have any signs of myopic maculopathy or CNV?',
        'Should I use an Amsler grid at home, and how often?',
        'What changes would mean I need to come back sooner?',
        'Are there longer-term monitoring recommendations given my refraction?',
      ],
    }),

    routine_chronic: (d, veryHigh, hxDet) => ({
      tier: 'routine',
      title: 'Routine — but keep your eyes on it',
      headline: 'Long-standing floaters that have not changed are common, and usually benign. The job is to know when "changed" means you should call.',
      context:
        `Chronic, stable floaters in high myopes are usually condensed vitreous strands and ` +
        `vitreous opacities. They tend to be the most noticeable in bright light or against a ` +
        `plain background, and most people learn to ignore them. The thing that matters is change: ` +
        `if your floaters suddenly multiply, if flashes appear, or if a curtain or shadow shows ` +
        `up in your peripheral vision, that's a different situation entirely. ` +
        (veryHigh ? `At your refraction (${d.sphere} D), your baseline retinal risk is higher than ` +
        `average, so the bar for "I should call" is correspondingly lower. ` : ``) +
        (hxDet ? `Your history of retinal issues raises that bar lower still — be quick to call. ` : ``),
      action:
        `Continue your normal eye exam schedule. If you don't have a regular ophthalmologist who ` +
        `knows you're a high myope, find one and establish baseline imaging (OCT, ultra-widefield ` +
        `photography). Save their emergency line in your phone so you don't have to look it up if ` +
        `something acute ever happens.`,
      questions: [
        'How often should I be screened given my refraction and history?',
        'Do you have a record of my retinal periphery on file, and when was it last imaged?',
        'What symptom changes should make me call your emergency line?',
        'Are there any activities I should avoid or be cautious about?',
        'Is my retina showing any signs of lattice, holes, or thinning that need monitoring?',
      ],
    }),

    routine_baseline: (d, veryHigh, hxDet) => ({
      tier: 'routine',
      title: 'Routine — baseline care',
      headline: 'No acute concerns. This is the right time to make sure your monitoring is set up well.',
      context:
        `High myopes benefit from a relationship with an ophthalmologist who specifically tracks ` +
        `their retinal status over time. Baseline imaging — OCT of the macula and ultra-widefield ` +
        `photos of the periphery — gives future exams something to compare against. ` +
        (veryHigh ? `At ${d.sphere} D, you're in the bracket where staphylomas, lattice ` +
        `degeneration, and myopic maculopathy are more common; that imaging is more than ` +
        `cosmetic. ` : ``) +
        (hxDet ? `Your history makes ongoing surveillance especially worthwhile. ` : ``) +
        `If you don't have a dedicated ophthalmologist already, finding one is the most useful ` +
        `thing you can do for your eye health this year.`,
      action:
        `Book a comprehensive dilated exam with an ophthalmologist if you haven't had one in the ` +
        `past 12 months. Ask specifically for an OCT macula and a widefield retinal photograph for ` +
        `your baseline file. Save the office's emergency line in your phone before you ever need ` +
        `it.`,
      questions: [
        'Given my refraction, what screening cadence do you recommend?',
        'Can we capture OCT and widefield imaging as a baseline today?',
        'Do you see any lattice, holes, or staphyloma I should know about?',
        'What symptoms should bring me back urgently?',
        "Are there any sports or activities you'd advise me to avoid?",
      ],
    }),

    soon: (d, veryHigh, hxDet) => ({
      tier: 'soon',
      title: 'See an ophthalmologist within the next few weeks',
      headline: 'Your symptoms warrant a focused exam, but they do not match the patterns that mean drop-everything urgency.',
      context:
        `What you describe is the kind of thing that deserves a deliberate look from someone who ` +
        `knows your eyes — not an emergency room visit, but not "I'll mention it at my next ` +
        `routine exam in two years" either. ` +
        (veryHigh ? `As a high myope at ${d.sphere} D, your retina is structurally different from ` +
        `the average eye, so symptoms that would be "watchful waiting" in someone with normal ` +
        `vision often warrant a closer look in you. ` : ``) +
        `A dilated exam with imaging will give you and your doctor much better information to ` +
        `work with than a symptom tool can.`,
      action:
        `Book an appointment with your ophthalmologist within the next 2-4 weeks. Mention your ` +
        `specific symptoms and that you're a high myope. If anything changes before then — new ` +
        `flashes, a sudden surge of floaters, or any curtain or shadow in your vision — call ` +
        `immediately rather than waiting for the appointment.`,
      questions: [
        'What did the dilated exam show at the periphery and the macula?',
        'Is what I described consistent with anything that needs follow-up imaging?',
        'How frequently should I be screened from now on?',
        'What signs should make me call you urgently?',
        'Should I keep an Amsler grid at home?',
      ],
    }),
  };

  // -------- RENDER --------
  function render(r) {
    const banner = document.getElementById('urgency-banner');
    banner.className = `urgency ${r.tier}`;
    banner.innerHTML = `<h2>${r.title}</h2><p>${r.headline}</p>`;
    document.getElementById('result-context').textContent = r.context;
    document.getElementById('result-action').textContent = r.action;
    const ol = document.getElementById('result-questions');
    ol.innerHTML = '';
    r.questions.forEach(q => {
      const li = document.createElement('li');
      li.textContent = q;
      ol.appendChild(li);
    });
  }
})();
