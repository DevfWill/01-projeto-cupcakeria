const express = require('express');
const path = require('path');

const productsRouter = require('./routes/products');
const authRouter = require('./routes/auth');
const usersRouter = require('./routes/users');
const couponsRouter = require('./routes/coupons');
const ordersRouter = require('./routes/orders');
const reviewsRouter = require('./routes/reviews');
const reportsRouter = require('./routes/reports');
const notificationsRouter = require('./routes/notifications');
const { router: freteRouter } = require('./routes/frete');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// API
app.use('/api/auth', authRouter);
app.use('/api/products', productsRouter);
app.use('/api/users', usersRouter);
app.use('/api/coupons', couponsRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/reviews', reviewsRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/frete', freteRouter);

// Frontend estático (HTML/CSS/JS puro)
app.use(express.static(path.join(__dirname, 'public')));

// Qualquer rota não encontrada na API retorna 404 em JSON
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Rota de API não encontrada.' });
});

// Só sobe o servidor quando o arquivo é executado diretamente (node server.js).
// Isso evita que os testes (que fazem `require('../server')` e sobem sua
// própria instância em uma porta efêmera) deixem um servidor "preso" na porta 3000.
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Cupcakeria rodando em http://localhost:${PORT}`);
  });
}

module.exports = app;
