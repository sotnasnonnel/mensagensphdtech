// api/mensagens.js
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.https://cguqzarlivrjkktfummo.supabase.co;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

function normalizarCPF(cpf) {
  if (!cpf) return '';
  return cpf.replace(/\D/g, '');
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

      // 1) retornar lista de destinatários para o <select>
      if (mode === 'destinatarios') {
        const { data, error } = await supabase
          .from('mensagens')
          .select('nome, cpf')
          .order('nome', { ascending: true });

        if (error) throw error;

        const mapa = new Map();
        data.forEach((r) => {
          const key = (r.nome || '').trim().toLowerCase();
          if (!mapa.has(key)) {
            mapa.set(key, { nome: r.nome, cpf: r.cpf });
          }
        });

        const destinatarios = Array.from(mapa.values());
        return res.status(200).json({ ok: true, destinatarios });
      }

      // 2) buscar mensagens por nome + cpf
      const nomeBusca = (nome || '').trim().toLowerCase();
      const cpfBusca = normalizarCPF(cpf || '');

      if (!nomeBusca || !cpfBusca) {
        return res
          .status(400)
          .json({ ok: false, error: 'Informe nome e CPF.' });
      }

      const { data, error } = await supabase
        .from('mensagens')
        .select('id, nome, cpf, mensagem, autor, criado_em')
        .eq('cpf', cpfBusca)
        .ilike('nome', `%${nomeBusca}%`)
        .order('criado_em', { ascending: true });

      if (error) throw error;

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

      const { data, error } = await supabase
        .from('mensagens')
        .insert([
          {
            nome: nomeDestinatario,
            cpf: cpfDestinatario,
            mensagem,
            autor: nomeRemetente
          }
        ])
        .select();

      if (error) throw error;

      return res.status(201).json({ ok: true, registro: data?.[0] });
    }

    return res.status(405).json({ ok: false, error: 'Método não permitido.' });
  } catch (err) {
    console.error('Erro em /api/mensagens:', err);
    return res
      .status(500)
      .json({ ok: false, error: 'Erro interno no servidor.' });
  }
};
