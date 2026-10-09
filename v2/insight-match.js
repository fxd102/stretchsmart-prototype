// Which research cards an exercise can show. Shared by nudge.html (shows one card) and
// cards.html (the review page) so the two can never disagree.

// Map an exercise body_area to candidate insight category names.
// First entry is the primary; secondary entries are acceptable fallbacks.
const BODY_AREA_TO_CATEGORIES = {
  'neck': ['neck', 'posture'],
  'shoulders': ['shoulders', 'posture'],
  'upper back': ['upper back', 'posture'],
  'lower back': ['back', 'flexibility'],
  'chest': ['chest', 'breathing', 'posture'],
  'core': ['strength', 'mobility'],
  'hips': ['hips', 'mobility'],
  'glutes': ['strength', 'flexibility'],
  'quads': ['legs', 'strength'],
  'hamstrings': ['hamstrings', 'flexibility'],
  'calves/ankles': ['calves', 'mobility'],
  'wrists/hands': ['wrists', 'strength'],
  'balance': ['mobility'],
  'breathing': ['breathing', 'posture'],
  'full body': ['mobility', 'strength']
};

// Returns [{ins, score, primary}] for every card this exercise may show; empty means no card.
function relevantInsights(exercise, insights) {
  // An exercise can opt out of specific insights by id, when clinical review judges an
  // insight doesn't fit it (e.g. Seated Spinal Wave is not a "complex movement pattern").
  // Filter the pool itself rather than the score.
  const suppressed = new Set(exercise.suppress_insights || []);
  const pool = insights.filter(i => !suppressed.has(i.id));

  const exTags = [...(exercise.concerns || []), ...(exercise.tags || [])].map(t => t.toLowerCase());
  const exArea = (exercise.body_area || '').toLowerCase();
  // An exercise can name its own insight categories when its body_area's mapping doesn't
  // fit it (e.g. Side Bend Stretch is filed under Full Body but is a stretch, not a
  // balance or coordination drill).
  const preferredCats = (exercise.insight_categories || BODY_AREA_TO_CATEGORIES[exArea] || [])
    .map(c => c.toLowerCase());

  // Score: category-match dominates (primary +8, secondary +4); position-weighted tag
  // overlap stacks on top (1st tag = 3pts, 2nd = 2pts, rest = 1pt). This fixes the
  // prior "neck stretch gets a breathing insight" failure: an insight whose primary
  // topic is neck wins over one with neck as a third-position side tag.
  function scoreInsight(ins) {
    let score = 0;
    const iCat = (ins.category || '').toLowerCase();
    if (preferredCats.length && preferredCats.includes(iCat)) {
      score += (preferredCats[0] === iCat) ? 8 : 4;
    }
    const iTags = (ins.tags || []).map(t => t.toLowerCase());
    iTags.forEach((it, idx) => {
      const matches = exTags.some(et => et.includes(it) || it.includes(et));
      if (matches) {
        score += idx === 0 ? 3 : idx === 1 ? 2 : 1;
      }
    });
    return score;
  }
  // RELEVANCE GATE (2026-09-27: "the cards HAVE to be relevant to the exercise").
  // A card is relevant only if it is in this area's PRIMARY category, or in a secondary
  // category AND shares a concern/tag with the exercise. When the relevant cards are used
  // up we repeat one of them; when there are none we show no card. Never an unrelated one.
  function isPrimary(ins) {
    return preferredCats.length > 0 && preferredCats[0] === (ins.category || '').toLowerCase();
  }
  function isRelevant(ins) {
    const iCat = (ins.category || '').toLowerCase();
    if (isPrimary(ins)) return true;
    if (!preferredCats.includes(iCat)) return false;
    const iTags = (ins.tags || []).map(t => t.toLowerCase());
    return iTags.some(it => exTags.some(et => et.includes(it) || it.includes(et)));
  }
  return pool.filter(isRelevant)
    .map(ins => ({ins, score: scoreInsight(ins), primary: isPrimary(ins)}));
}

// Best matches first, then the rest. No whole-pool fallback.
function insightTiers(scored) {
  if (!scored.length) return [];
  const maxScore = Math.max(...scored.map(s => s.score));
  const tiers = [scored.filter(s => s.score === maxScore).map(s => s.ins)];
  const lower = scored.filter(s => s.score < maxScore).map(s => s.ins);
  if (lower.length) tiers.push(lower);
  return tiers;
}
