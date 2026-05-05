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
  {id:'sh1l', nome:'Shampoo 1L', preco:45.00, desc:'Shampoo profissional Premisse 1 litro. Hidratação intensa, anti-frizz, uso diário.'},
  {id:'shh1l', nome:'Shampoo Hidratante 1L', preco:40.00, desc:'Shampoo hidratante Premisse. Ideal para cabelos ressecados.'},
  {id:'cdh1l', nome:'Condicionador Hidratante 1L', preco:40.00, desc:'Condicionador hidratante Premisse. Desembaraça e deixa o cabelo macio.'},
  {id:'kitmat', nome:'Kit Matizador Cabelos Platinados', preco:39.90, desc:'Kit para cabelos platinados e loiros. Neutraliza tons amarelados.'},
];

app.post('/api/chat', async (req, res) => {
  const { message, history } = req.body;
  if (!message) return res.status(400).json({ error: 'Message required' });

  const produtosStr = PRODUTOS.map(p =>
    `- ${p.nome}: R$ ${p.preco.toFixed(2).replace('.',',')} — ${p.desc}`
  ).join('\n');

  const systemPrompt = `Você é a assistente virtual da Alprolimp, distribuidora exclusiva dos cosméticos Premisse em Curitiba-PR, Brasil.

INFORMAÇÕES DO NEGÓCIO:
- WhatsApp: +55 41 99661-5302
- PIX: 41996615302 (Alan)
- Horário: 8h às 20h
- Entrega: toda Curitiba e região metropolitana em até 24 horas
- Instagram: @alprolimp
- TikTok: @alprolimp

PRODUTOS DISPONÍVEIS:
${produtosStr}

INSTRUÇÕES:
1. Responda SEMPRE em português brasileiro, de forma amigável e profissional
2. Quando o cliente perguntar sobre preços, mostre TODOS os produtos com valores
3. Para fazer um pedido, colete: produto + quantidade + nome completo + endereço + bairro
4. Quando tiver todos os dados, mostre o resumo e peça confirmação
5. Após confirmação, informe a chave PIX: 41996615302 (Alan)
6. Seja concisa — respostas até 5 linhas quando possível
7. Nunca invente produtos que não estão na lista acima
8. Quando o pedido estiver COMPLETO e CONFIRMADO, inclua ao final:
[PEDIDO_FECHADO|nome:NOME|endereco:ENDERECO|itens:ITENS|total:TOTAL]`;

  try {
    const messages = [];
    if (history && history.length > 0) {
      history.forEach(h => messages.push({ role: h.role, content: h.content }));
    }
    messages.push({ role: 'user', content: message });

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: systemPrompt,
        messages: messages
      })
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Anthropic error:', err);
      return res.status(500).json({ error: 'AI service error' });
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || 'Desculpe, tente novamente!';
    res.json({ response: text });
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Server error', response: 'Desculpe, tive um problema técnico. Tente novamente!' });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Alprolimp server running on port ${PORT}`);
});
