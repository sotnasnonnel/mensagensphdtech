// api/mensagens.js

function normalizarCPF(cpf) {
  if (!cpf) return '';
  return cpf.replace(/\D/g, '');
}

function getSupabaseEnv() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      'SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não estão configuradas nas variáveis de ambiente.'
    );
  }

  return { url, serviceKey };
}

async function supabaseSelect(pathWithQuery) {
  const { url, serviceKey } = getSupabaseEnv();

  const response = await fetch(url + '/rest/v1/' + pathWithQuery, {
    headers: {
      apikey: serviceKey,
      Authorization: 'Bearer ' + serviceKey
    }
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Erro Supabase SELECT (${response.status}): ${text || response.statusText}`
    );
  }

  return response.json();
}

async function supabaseInsert(table, rows) {
  const { url, serviceKey } = getSupabaseEnv();

  const response = await fetch(url + '/rest/v1/' + table, {
    method: 'POST',
    headers: {
      apikey: serviceKey,
      Authorization: 'Bearer ' + serviceKey,
      'Content-Type': 'application/json',
      Prefer: 'return=representation'
    },
    body: JSON.stringify(rows)
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Erro Supabase INSERT (${response.status}): ${text || response.statusText}`
    );
  }

  return response.json();
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      const { mode, nome, cpf } = req.query || {};

      // 1) Lista de destinatários para o <select>
      if (mode === 'destinatarios') {
        // GET /rest/v1/mensagens?select=nome,cpf
        const data = await supabaseSelect('mensagens?select=nome,cpf');

        const mapa = new Map();
        (data || []).forEach((r) => {
          const key = (r.nome || '').trim().toLowerCase();
          if (!mapa.has(key)) {
            mapa.set(key, { nome: r.nome, cpf: r.cpf });
          }
        });

        const destinatarios = Array.from(mapa.values());
        return res.status(200).json({ ok: true, destinatarios });
      }

      // 2) Busca de mensagens por nome + cpf
      const nomeBusca = (nome || '').trim().toLowerCase();
      const cpfBusca = normalizarCPF(cpf || '');

      if (!nomeBusca || !cpfBusca) {
        return res
          .status(400)
          .json({ ok: false, error: 'Informe nome e CPF.' });
      }

      // GET /rest/v1/mensagens?select=...&cpf=eq.123&nome=ilike.*lennon*
      const encodedNome = encodeURIComponent(nomeBusca);
      const query =
        'mensagens?select=id,nome,cpf,mensagem,autor,criado_em' +
        `&cpf=eq.${cpfBusca}` +
        `&nome=ilike.*${encodedNome}*` +
        '&order=criado_em.asc';

      const data = await supabaseSelect(query);

      return res.status(200).json({ ok: true, mensagens: data || [] });
    }

    if (req.method === 'POST') {
      const body =
        typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};

      const nomeDestinatario = (body.nomeDestinatario || '').trim();
      const cpfDestinatario = normalizarCPF(body.cpfDestinatario || '');
      const nomeRemetente = (body.nomeRemetente || '').trim() || 'Remetente';
      const mensagem = (body.mensagem || '').trim();

      if (!nomeDestinatario || !cpfDestinatario || !mensagem) {
        return res.status(400).json({
          ok: false,
          error:
            'nomeDestinatario, cpfDestinatario e mensagem são obrigatórios.'
        });
      }

      const rows = [
        {
          nome: nomeDestinatario,
          cpf: cpfDestinatario,
          mensagem,
          autor: nomeRemetente
        }
      ];

      const data = await supabaseInsert('mensagens', rows);

      return res.status(201).json({ ok: true, registro: data?.[0] });
    }

    return res.status(405).json({ ok: false, error: 'Método não permitido.' });
  } catch (err) {
    console.error('Erro em /api/mensagens:', err);
    return res
      .status(500)
      .json({ ok: false, error: err.message || 'Erro interno no servidor.' });
  }
};
