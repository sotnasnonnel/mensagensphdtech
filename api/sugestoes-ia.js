// api/sugestoes-ia.js

function getDeepSeekKey() {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) {
    throw new Error(
      'DEEPSEEK_API_KEY não está configurada nas variáveis de ambiente da Vercel.'
    );
  }
  return key;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res
      .status(405)
      .json({ ok: false, error: 'Método não permitido. Use POST.' });
  }

  try {
    const apiKey = getDeepSeekKey();

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
      'Você é um assistente que cria mensagens curtas de reconhecimento, em português do Brasil, com tom profissional, humano e positivo, colocar emoticons moderadamente.';

    const userPrompt = `
      Gere 3 sugestões de mensagem para reconhecer uma pessoa no trabalho.

      Nome da pessoa: ${nomeDestinatario || 'colaborador'}
      Nome de quem envia: ${nomeRemetente || 'seu líder'}
      Tom desejado: ${tomLabel}

      Regras importantes:
      - Mensagens entre 3 e 5 frases.
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
        Authorization: 'Bearer ' + apiKey
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        stream: false
      })
    });

    if (!dsRes.ok) {
      const text = await dsRes.text();
      throw new Error(
        `Erro DeepSeek (${dsRes.status}): ${text || dsRes.statusText}`
      );
    }

    const data = await dsRes.json();
    const content = data.choices?.[0]?.message?.content || '';

    let sugestoes;

    // tenta parsear como JSON
    try {
      const parsed = JSON.parse(content);
      sugestoes = parsed.sugestoes;
    } catch (e) {
      // fallback: se vier texto "normal", quebra em até 3 sugestões
      sugestoes = content
        .split(/\n+/)
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 3);
    }

    if (!Array.isArray(sugestoes) || !sugestoes.length) {
      throw new Error(
        'Resposta da IA não contém sugestões utilizáveis. Verifique o prompt.'
      );
    }

    return res.status(200).json({ ok: true, sugestoes });
  } catch (err) {
    console.error('Erro em /api/sugestoes-ia:', err);
    return res.status(500).json({
      ok: false,
      error: err.message || 'Erro interno ao chamar a IA.'
    });
  }
};
