// Funcion serverless (Vercel) para el dictado con IA. La clave NO va al navegador.
// Variables de entorno: GEMINI_API_KEY (obligatoria), GEMINI_MODEL (opcional).
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metodo no permitido' });
  const key = process.env.GEMINI_API_KEY;
  if (!key) return res.status(500).json({ error: 'Falta GEMINI_API_KEY' });
  const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
  const messages = (req.body && req.body.messages) || [];
  const system = messages.filter(function (m) { return m.role === 'system'; }).map(function (m) { return m.content; }).join('\n');
  const contents = messages.filter(function (m) { return m.role !== 'system'; }).map(function (m) {
    return { role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] };
  });
  try {
    const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents: contents })
    });
    const data = await r.json();
    if (!r.ok) return res.status(502).json({ error: (data.error && data.error.message) || 'Error de Gemini' });
    const parts = (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) || [];
    const text = parts.map(function (p) { return p.text || ''; }).join('');
    return res.status(200).json({ choices: [{ message: { role: 'assistant', content: text } }] });
  } catch (e) {
    return res.status(500).json({ error: String(e.message || e) });
  }
}
