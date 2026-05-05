const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');


const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const PRODUTOS = [
  {nome:'Shampoo 1L', preco:45.00, desc:'Shampoo profissional Premisse 1 litro.'},
  {nome:'Shampoo Hidratante 1L', preco:40.00, desc:'Shampoo hidratante Premisse.'},
  {nome:'Condicionador Hidratante 1L', preco:40.00, desc:'Condicionador hidratante Premisse.'},
  {nome:'Kit Matizador', preco:39.90, desc:'Kit para cabelos platinados e loiros.'},
];

const SYSTEM = `Você é a assistente virtual da Alprolimp, distribuidora Premisse Cosméticos em Curitiba-PR.

NEGÓCIO:
- WhatsApp: +55 41 99661-5302
- PIX: 41996615302 (Alan)
- Horário: 8h às 20h
- Entrega: toda Curitiba em até 24h

PRODUTOS:
- Shampoo 1L: R$ 45,00
- Shampoo Hidratante 1L: R$ 40,00
- Condicionador Hidratante 1L: R$ 40,00
- Kit Matizador: R$ 39,90

INSTRUÇÕES:
1. Responda SEMPRE em português brasileiro
2. Seja amigável e profissional
3. Para pedido colete: produto + quantidade + nome + endereço + bairro
4. Após confirmação informe PIX: 41996615302
5. Quando pedido COMPLETO e CONFIRMADO inclua ao final:
[PEDIDO_FECHADO|nome:NOME|endereco:ENDERECO|itens:ITENS|total:TOTAL]`;

app.post('/api/chat', async (req, res) => {
  try {
    const { messages, message, history } = req.body;

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
