// api/sugestoes-ia.js
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Método não permitido.' });
  }

  try {
    const body =
      typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};

    const { nomeDestinatario, nomeRemetente, tom } = body;

    const tomLabel =
      {
        reconhecimento: 'reconhecimento',
        agradecimento: 'agradecimento',
        feedback: 'feedback construtivo',
        parabens: 'parabéns por resultado'
      }[tom] || 'reconhecimento';

    const systemPrompt =
      'Você é um assistente que cria mensagens curtas de reconhecimento, em português do Brasil, com tom profissional, humano e positivo.';

    const userPrompt = `
      Gere 3 sugestões de mensagem para reconhecer uma pessoa no trabalho.

      Nome da pessoa: ${nomeDestinatario || 'colaborador'}
      Nome de quem envia: ${nomeRemetente || 'seu líder'}
      Tom desejado: ${tomLabel}

      Regras importantes:
      - Mensagens entre 2 e 4 frases.
      - Texto pronto para colar.
      - Finalize a mensagem, se fizer sentido, com o nome de quem envia.
      - Responda APENAS em JSON puro, no formato:
        {
          "sugestoes": [
            "mensagem 1",
            "mensagem 2",
            "mensagem 3"
          ]
        }
      - Não inclua explicações, nem texto fora do JSON.
    `.trim();

    const dsRes = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + DEEPSEEK_API_KEY
      },
      b
