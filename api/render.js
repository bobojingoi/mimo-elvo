// api/render.js — Vercel serverless function
// Primește poza peretelui + specificațiile și cere OpenAI (gpt-image-1.5) o vizualizare.
// Cheia OpenAI se ia din variabila de mediu OPENAI_API_KEY (setată în Vercel, NU în cod).

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metodă nepermisă' });

  const key = process.env.OPENAI_API_KEY;
  if (!key) return res.status(500).json({ error: 'OPENAI_API_KEY lipsește. Adaug-o în Vercel → Settings → Environment Variables.' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const { image, material, frameColor, doorColor, boxCount, avizier, finish,
            numberingType, numberingPrefix, hasLogo, description } = body;
    if (!image) return res.status(400).json({ error: 'Lipsește imaginea peretelui.' });

    const m = String(image).match(/^data:(image\/\w+);base64,(.+)$/);
    if (!m) return res.status(400).json({ error: 'Format imagine invalid.' });
    const mime = m[1];
    const buf = Buffer.from(m[2], 'base64');

    const prompt = buildPrompt({ material, frameColor, doorColor, boxCount, avizier, finish,
      numberingType, numberingPrefix, hasLogo, description });

    const form = new FormData();
    form.append('model', 'gpt-image-1.5');
    form.append('prompt', prompt);
    form.append('input_fidelity', 'high');
    form.append('quality', 'high');
    form.append('size', 'auto');
    form.append('output_format', 'jpeg');
    form.append('image[]', new Blob([buf], { type: mime }), 'perete.jpg');

    const r = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + key },
      body: form
    });

    const data = await r.json().catch(function () { return {}; });
    if (!r.ok) {
      const msg = (data && data.error && data.error.message) || ('Eroare OpenAI (' + r.status + ')');
      return res.status(r.status).json({ error: msg });
    }
    const b64 = data && data.data && data.data[0] && data.data[0].b64_json;
    if (!b64) return res.status(502).json({ error: 'Răspuns invalid de la OpenAI.' });
    return res.status(200).json({ image: 'data:image/jpeg;base64,' + b64 });
  } catch (e) {
    return res.status(500).json({ error: String((e && e.message) || e) });
  }
};

function nameOf(c) { return (c && String(c).trim()) || 'gri neutru'; }
function clean(s) { return String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, 300); }

function buildPrompt(o) {
  var n = parseInt(o.boxCount, 10);
  if (!(n > 0)) n = 12;
  if (n > 300) n = 300;
  var mat;
  if (o.material === 'inox') {
    mat = 'a wall-mounted mailbox bank with brushed stainless-steel (satin inox) doors set in a powder-coated steel frame in ' + nameOf(o.frameColor);
  } else if (o.material === 'lacobel') {
    mat = 'a wall-mounted mailbox bank with glossy Lacobel glass front doors in ' + nameOf(o.doorColor) + ' colour, in a slim metal frame in ' + nameOf(o.frameColor);
  } else {
    mat = 'a wall-mounted mailbox bank of powder-coated steel with a matte finish, doors painted ' + nameOf(o.doorColor) + ' and body/frame in ' + nameOf(o.frameColor);
  }

  // Numerotare (pe partea stângă a ușii)
  var numbering;
  if (o.numberingType === 'prefix' && clean(o.numberingPrefix)) {
    var pfx = clean(o.numberingPrefix);
    numbering = "Each door shows an apartment number on the LEFT side of the door, using the prefix '" + pfx + "' followed by a sequential number (" + pfx + "1, " + pfx + "2, " + pfx + "3 and so on).";
  } else {
    numbering = "Each door shows a plain sequential apartment number (1, 2, 3, ...) positioned on the LEFT side of the door.";
  }
  // Încuietori: mereu jos, pe mijloc
  var locks = "Each door has a single small round lock / keyhole centered horizontally near the bottom edge of the door.";
  // Logo opțional (doar sticlă Lacobel)
  var logo = (o.material === 'lacobel' && o.hasLogo)
    ? " On the glass doors, add a small, subtle sandblasted building logo on the LEFT side, next to the number."
    : "";

  // Finisaj ambiental (opțional). Implicit: auto premium, ales de model.
  var finishMap = {
    marmura: 'large-format light marble-look wall cladding in warm ivory and beige tones',
    piatra:  'large-format matte anthracite stone / porcelain wall cladding in dark charcoal tones',
    lemn:    'warm wood-slat (riflaj) wall panelling in a natural oak tone combined with matte neutral plaster',
    minimalist: 'smooth matte off-white micro-cement walls with a clean minimalist look'
  };
  var finish = finishMap[o.finish] || 'an elegant, cohesive premium finish that best suits the space (for example large-format stone or marble-look cladding in warm neutral tones, optionally combined with wood-slat accents)';

  var p =
    'This photo shows a residential building lobby / entrance hall during construction, with raw unfinished surfaces (green moisture-resistant drywall, exposed gypsum board, bare concrete, cables, protective sheeting on the floor). ' +
    'Produce a photorealistic "after renovation" visualization of the SAME space, fully finished and elegant. ' +
    'CRITICAL — preserve the architecture and geometry EXACTLY as in the photo: keep the same wall positions, the same columns, pilasters and niches/recesses, the same ceiling height and floor level, and the exact same camera angle and perspective. Do NOT move, add, remove, bend, straighten or reshape any structural element. The shape of the space must stay identical. ' +
    'Change ONLY the surface finishes and add the mailboxes: replace the raw drywall, concrete and clutter with ' + finish + ', add tasteful warm-white LED accent lighting in the vertical recesses between the columns, and a clean finished stone or polished-concrete floor. The design around the mailboxes must look intentional, harmonious and high-end. ' +
    'Cleanly install ' + mat + ' on the main wall surface. Arrange about ' + n + ' identical rectangular mailboxes in a neat, perfectly aligned grid of rows and columns, each door roughly 33 cm wide and 13 cm tall, mounted flat at chest height, all edges aligned, fully integrated with the surrounding finish. ' +
    numbering + ' ' + locks + logo + ' ' +
    'Photorealistic, with natural lighting and shadows consistent with the space. No random text, no watermark, no people, no tools or clutter.';
  if (o.avizier && o.avizier !== 'none') {
    p += ' On the same wall, aligned next to the mailboxes, also install a matching black-framed metal notice board (avizier) with a glass front, integrated into the finished design.';
  }
  var desc = clean(o.description);
  if (desc) {
    p += ' Additional client requests to respect where reasonable, without changing the room geometry: ' + desc + '.';
  }
  return p;
}
