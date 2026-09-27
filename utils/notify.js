const { getDb } = require('./database');

// HU10 - Como cliente, quero receber notificações por e-mail ou WhatsApp.
// Este projeto não integra um provedor de e-mail/SMS real (evita depender de
// serviços externos e chaves de API). Em vez disso, simulamos o envio
// registrando a notificação no banco, que o cliente pode conferir na sua
// página de pedidos ("Minhas notificações"). Trocar por um envio real (ex.:
// Nodemailer, Twilio) depois é só substituir o corpo desta função.
function sendNotification({ userId, channel, message }) {
  const db = getDb();
  const now = new Date().toISOString();
  const result = db.prepare(`
    INSERT INTO notifications (user_id, channel, message, created_at) VALUES (?, ?, ?, ?)
  `).run(userId, channel, message, now);
  return { id: result.lastInsertRowid, userId, channel, message, createdAt: now };
}

module.exports = { sendNotification };
