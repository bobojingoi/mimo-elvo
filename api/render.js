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
    const { image, material, frameColor, doorColor, boxCount, avizier, finish, mode,
            numberingType, numberingPrefix, hasLogo, description } = body;
    if (!image) return res.status(400).json({ error: 'Lipsește imaginea peretelui.' });

    const m = String(image).match(/^data:(image\/\w+);base64,(.+)$/);
    if (!m) return res.status(400).json({ error: 'Format imagine invalid.' });
    const mime = m[1];
    const buf = Buffer.from(m[2], 'base64');

    const prompt = buildPrompt({ material, frameColor, doorColor, boxCount, avizier, finish, mode,
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

  // Numerotare: MEREU pe partea DREAPTĂ a ușii
  var numbering;
  if (o.numberingType === 'prefix' && clean(o.numberingPrefix)) {
    var pfx = clean(o.numberingPrefix);
    numbering = "On each door place an apartment number on the RIGHT-hand side, using the prefix '" + pfx + "' followed by a sequential number (" + pfx + "1, " + pfx + "2, " + pfx + "3 and so on).";
  } else {
    numbering = "On each door place a plain sequential apartment number (1, 2, 3, ...) on the RIGHT-hand side of the door.";
  }
  // Încuietori: mereu jos, pe mijloc
  var locks = "Each door has a single small round lock / keyhole centered horizontally near the bottom edge of the door.";
  // Logo opțional (doar sticlă Lacobel), pe STÂNGA
  var logo = (o.material === 'lacobel' && o.hasLogo)
    ? " On the LEFT-hand side of each glass door add a small, subtle sandblasted building logo."
    : "";

  var boxes = 'Install ' + mat + '. Arrange about ' + n + ' identical rectangular mailboxes in a neat, perfectly aligned grid of rows and columns, each door roughly 33 cm wide and 13 cm tall, mounted flat at chest height, all edges aligned. ' + numbering + ' ' + locks + logo;

  var p;
  if (o.mode === 'premium') {
    // MOD PREMIUM — reimaginare aspirațională
    var finishMap = {
      marmura: 'large-format light marble-look wall cladding in warm ivory and beige tones',
      piatra:  'large-format matte anthracite stone / porcelain wall cladding in dark charcoal tones',
      lemn:    'warm wood-slat (riflaj) wall panelling in a natural oak tone combined with matte neutral plaster',
      minimalist: 'smooth matte off-white micro-cement walls with a clean minimalist look'
    };
    var finish = finishMap[o.finish] || 'an elegant, cohesive premium finish that best suits the space (for example large-format stone or marble-look cladding in warm neutral tones, optionally combined with wood-slat accents)';
    p =
      'This photo shows a residential building lobby / entrance hall that is unfinished (bare concrete, exposed insulation, mounting rails, protective sheeting). ' +
      'Produce a photorealistic "after renovation" visualization of the same wall, fully finished and elegant, keeping the same general perspective and the position of the main wall. ' +
      'Turn the raw surfaces into ' + finish + ', with tasteful warm-white LED accent lighting and a clean finished floor — a cohesive, high-end lobby design. ' +
      boxes + ' Integrate the mailbox bank naturally into the finished wall. ' +
      'Photorealistic, natural lighting and shadows. No random text, no watermark, no people, no tools or clutter.';
  } else {
    // MOD FIDEL — păstrează exact peretele fotografiat
    p =
      'This is a real photo of a building entrance / lobby wall that is partially finished. ' +
      'Produce a photorealistic visualization of the SAME scene with these strict rules: keep the EXACT same camera angle, perspective, proportions and geometry; KEEP every finish that is already installed exactly as it appears (for example any existing stone or marble cladding, glass walls or partitions, the ceiling, columns and the metal mounting rails). Do NOT redesign the space, do NOT replace or restyle existing materials, do NOT change the viewpoint or the layout. ' +
      'Make only these changes: (1) neatly finish the still-unfinished raw areas (bare concrete, exposed insulation, visible cabling, protective sheeting) with a clean finish that matches the materials already present nearby; and (2) ' + boxes + ' — mounted on the existing wall, on the area where the vertical mounting rails already are. ' +
      'The result must clearly look like the same photographed wall, lightly completed, with the mailboxes added. Keep the existing lighting. Photorealistic. No random text, no watermark, no people, no tools or clutter.';
  }
  if (o.avizier && o.avizier !== 'none') {
    p += ' On the same wall, aligned next to the mailboxes, also install a matching black-framed metal notice board (avizier) with a glass front.';
  }
  var desc = clean(o.description);
  if (desc) {
    p += ' Additional client requests to respect where reasonable, without changing the room geometry: ' + desc + '.';
  }
  return p;
}
