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
    const { image, material, frameColor, doorColor, boxCount, avizier } = body;
    if (!image) return res.status(400).json({ error: 'Lipsește imaginea peretelui.' });

    const m = String(image).match(/^data:(image\/\w+);base64,(.+)$/);
    if (!m) return res.status(400).json({ error: 'Format imagine invalid.' });
    const mime = m[1];
    const buf = Buffer.from(m[2], 'base64');

    const prompt = buildPrompt({ material, frameColor, doorColor, boxCount, avizier });

    const form = new FormData();
    form.append('model', 'gpt-image-1.5');
    form.append('prompt', prompt);
    form.append('input_fidelity', 'high');
    form.append('quality', 'medium');
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

function buildPrompt(o) {
  var n = parseInt(o.boxCount, 10);
  if (!(n > 0)) n = 12;
  if (n > 300) n = 300;
  var mat;
  if (o.material === 'inox') {
    mat = 'mailbox doors in brushed stainless steel (satin inox), set in a powder-coated steel frame in ' + nameOf(o.frameColor) + ', with small laser-cut apartment numbers on each door';
  } else if (o.material === 'lacobel') {
    mat = 'mailbox front doors made of glossy Lacobel glass in ' + nameOf(o.doorColor) + ' colour, in a slim metal frame in ' + nameOf(o.frameColor) + ', with sandblasted apartment numbers on the glass';
  } else {
    mat = 'powder-coated steel mailboxes with a matte finish, doors painted ' + nameOf(o.doorColor) + ' and body/frame in ' + nameOf(o.frameColor) + ', with small laser-cut apartment numbers on each door';
  }
  var p = 'Edit this photo of a real interior wall in a residential building lobby. Keep the wall, floor, ceiling, lighting, shadows and camera perspective EXACTLY the same. Add one realistic, professionally installed wall-mounted mailbox bank: ' + mat + '. Arrange about ' + n + ' identical rectangular mailboxes in a clean, perfectly aligned grid of rows and columns, each door roughly 33 cm wide and 13 cm tall, mounted flat on the wall at about chest height, all edges aligned. Make it look photorealistic and seamlessly integrated with the existing wall. No text, no watermark, no people.';
  if (o.avizier && o.avizier !== 'none') {
    p += ' On the same wall, aligned next to the mailboxes, also add a matching black metal notice board (avizier) with a glass front for posting building notices.';
  }
  return p;
}
