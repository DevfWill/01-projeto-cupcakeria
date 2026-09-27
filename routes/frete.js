const express = require('express');
const router = express.Router();

// HU07 - Como cliente, quero calcular o valor do frete com base no CEP.
// Simulação simples e determinística baseada na região do CEP (1º dígito),
// sem depender de APIs externas de frete (evita links/serviços online que
// podem falhar). Fácil de trocar depois por uma integração real (Correios,
// Melhor Envio etc.) mantendo a mesma rota.
const REGIONS = {
  0: { name: 'São Paulo (capital)', price: 8.0, days: 1 },
  1: { name: 'São Paulo (interior)', price: 12.0, days: 2 },
  2: { name: 'Rio de Janeiro / Espírito Santo', price: 16.0, days: 3 },
  3: { name: 'Minas Gerais', price: 15.0, days: 3 },
  4: { name: 'Bahia / Sergipe', price: 22.0, days: 5 },
  5: { name: 'Pernambuco / Alagoas / Paraíba / Rio Grande do Norte', price: 24.0, days: 5 },
  6: { name: 'Ceará / Piauí / Maranhão / Norte', price: 26.0, days: 6 },
  7: { name: 'Distrito Federal / Goiás / Centro-Oeste', price: 20.0, days: 4 },
  8: { name: 'Paraná / Santa Catarina', price: 18.0, days: 3 },
  9: { name: 'Rio Grande do Sul', price: 20.0, days: 4 }
};

function calcularFrete(cep) {
  const digits = String(cep).replace(/\D/g, '');
  if (digits.length !== 8) return null;
  const region = REGIONS[digits[0]];
  if (!region) return null;
  return { cep: digits, region: region.name, price: region.price, estimatedDays: region.days };
}

router.get('/calc', (req, res) => {
  const { cep } = req.query;
  if (!cep) {
    return res.status(400).json({ error: 'Informe o CEP.' });
  }

  const result = calcularFrete(cep);
  if (!result) {
    return res.status(400).json({ error: 'CEP inválido. Use o formato 00000-000.' });
  }

  res.json(result);
});

module.exports = { router, calcularFrete };
