const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ============ SUPABASE HELPER ============
async function supabase(table, method, body = null, query = '') {
  const url = `${SUPABASE_URL}/rest/v1/${table}${query}`;
  const options = {
    method,
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    }
  };
  if (body) options.body = JSON.stringify(body);
  const res = await fetch(url, options);
  if (!res.ok) {
    const err = await res.text();
    console.error('Supabase error:', err);
    throw new Error(err);
  }
  return res.json();
}

// ============ API PRODUTOS ============
app.get('/api/produtos', async (req, res) => {
  try {
    const data = await supabase('produtos', 'GET', null, '?ativo=eq.true&order=id.asc');
    res.json(data);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/produtos', async (req, res) => {
  try {
    const data = await supabase('produtos', 'POST', req.body);
    res.json(data);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/produtos/:id', async (req, res) => {
  try {
    const data = await supabase('produtos', 'PATCH', req.body, `?id=eq.${req.params.id}`);
    res.json(data);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/produtos/:id', async (req, res) => {
  try {
    await supabase('produtos', 'DELETE', null, `?id=eq.${req.params.id}`);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============ API CLIENTES ============
app.get('/api/clientes', async (req, res) => {
  try {
    const data = await supabase('clientes', 'GET', null, '?order=created_at.desc');
    res.json(data);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/clientes', async (req, res) => {
  try {
    const data = await supabase('clientes', 'POST', req.body);
    res.json(data);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/clientes/:id', async (req, res) => {
  try {
    const data = await supabase('clientes', 'PATCH', req.body, `?id=eq.${req.params.id}`);
    res.json(data);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/clientes/:id', async (req, res) => {
  try {
    await supabase('clientes', 'DELETE', null, `?id=eq.${req.params.id}`);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============ API PEDIDOS ============
app.get('/api/pedidos', async (req, res) => {
  try {
    const data = await supabase('pedidos', 'GET', null, '?order=created_at.desc');
    res.json(data);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/pedidos', async (req, res) => {
  try {
    const data = await supabase('pedidos', 'POST', req.body);
    res.json(data);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/pedidos/:id', async (req, res) => {
  try {
    const data = await supabase('pedidos', 'PATCH', req.body, `?id=eq.${req.params.id}`);
    res.json(data);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============ CHAT IA ============
app.post('/api/chat', async (req, res) => {
  try {
    const { messages, message, history } = req.body;

    // Buscar produtos atuais
    const produtos = await supabase('produtos', 'GET', null, '?ativo=eq.true&order=id.asc');
    const produtosStr = produtos.map(p =>
      `- ${p.nome}: R$ ${parseFloat(p.preco).toFixed(2).replace('.',',')}`
    ).join('\n');

    const SYSTEM = `Você é a assistente virtual da Alprolimp, distribuidora Premisse Cosméticos em Curitiba-PR.

NEGÓCIO:
- WhatsApp: +55 41 99661-5302
- PIX: 41996615302 (Alan)
- Horário: 8h às 20h
- Entrega: toda Curitiba em até 24h

PRODUTOS:
${produtosStr}

INSTRUÇÕES:
1. Responda SEMPRE em português brasileiro
2. Seja MUITO concisa — máximo 3 linhas por resposta
3. Para pedido colete: produto + quantidade + nome + endereço + bairro
4. Após confirmação informe PIX: 41996615302
5. Quando pedido COMPLETO e CONFIRMADO inclua ao final:
[PEDIDO_FECHADO|nome:NOME|endereco:ENDERECO|itens:ITENS|total:TOTAL]`;

    let msgs = [];
    if (messages && Array.isArray(messages)) {
      msgs = messages;
    } else if (message) {
      if (history && Array.isArray(history)) {
        history.forEach(h => msgs.push({ role: h.role, content: h.content }));
      }
      msgs.push({ role: 'user', content: message });
    } else {
      return res.status(400).json({ error: 'No message provided' });
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 1024,
        system: SYSTEM,
        messages: msgs
      })
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Anthropic error:', err);
      return res.status(500).json({ error: 'AI error', content: 'Desculpe, tente novamente!' });
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || 'Desculpe, tente novamente!';
    res.json({ content: text, response: text });

  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Server error', content: 'Desculpe, tive um problema. Tente novamente!' });
  }
});

app.get('/api/healthz', (req, res) => res.json({ status: 'ok' }));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Alprolimp running on port ${PORT}`);
});
