const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');
const path = require('path');
const { hashPassword } = require('./password');

const DB_PATH = process.env.CUPCAKERIA_DB || path.join(__dirname, '..', 'data', 'cupcakeria.db');
const SCHEMA_PATH = path.join(__dirname, '..', 'database', 'schema.sql');

let dbInstance = null;

// Produtos e cupons iniciais (mesmos dados usados na versão anterior em
// JSON), agora carregados no banco físico SQLite no primeiro uso.
const SEED_PRODUCTS = [
  { id: 1, name: 'Cupcake de Chocolate', flavor: 'chocolate', category: 'individual', price: 8.5,
    description: 'Massa fofinha de chocolate com cobertura de ganache e granulado.',
    image: 'cupcake-chocolate.jpg', alt: 'Cupcake de chocolate com cobertura de ganache e granulado',
    stockQuantity: 24, nutritionalInfo: { kcal: 320, carboidratos_g: 42, acucares_g: 28, gorduras_g: 15, proteinas_g: 4 },
    allergens: ['glúten', 'leite', 'ovo'] },
  { id: 2, name: 'Cupcake de Morango', flavor: 'morango', category: 'individual', price: 9.0,
    description: 'Massa de baunilha com recheio de morango e chantilly.',
    image: 'cupcake-morango.jpg', alt: 'Cupcake com cobertura rosa e pedaços de morango',
    stockQuantity: 18, nutritionalInfo: { kcal: 300, carboidratos_g: 40, acucares_g: 27, gorduras_g: 13, proteinas_g: 3 },
    allergens: ['glúten', 'leite', 'ovo'] },
  { id: 3, name: 'Cupcake Red Velvet', flavor: 'red velvet', category: 'individual', price: 10.0,
    description: 'Clássico veludo vermelho com cobertura de cream cheese.',
    image: 'cupcake-red-velvet.jpg', alt: 'Cupcake red velvet com cobertura branca de cream cheese',
    stockQuantity: 15, nutritionalInfo: { kcal: 340, carboidratos_g: 44, acucares_g: 30, gorduras_g: 16, proteinas_g: 4 },
    allergens: ['glúten', 'leite', 'ovo'] },
  { id: 4, name: 'Cupcake de Limão', flavor: 'limão', category: 'individual', price: 8.5,
    description: 'Massa cítrica de limão com cobertura de merengue.',
    image: 'cupcake-limao.jpg', alt: 'Cupcake de limão com cobertura de merengue e raspas de limão',
    stockQuantity: 20, nutritionalInfo: { kcal: 290, carboidratos_g: 38, acucares_g: 25, gorduras_g: 12, proteinas_g: 3 },
    allergens: ['glúten', 'ovo'] },
  { id: 5, name: 'Cupcake de Baunilha', flavor: 'baunilha', category: 'individual', price: 7.5,
    description: 'O clássico: massa e cobertura de baunilha com confeitos coloridos.',
    image: 'cupcake-baunilha.jpg', alt: 'Cupcake de baunilha com cobertura branca e confeitos coloridos',
    stockQuantity: 30, nutritionalInfo: { kcal: 280, carboidratos_g: 36, acucares_g: 24, gorduras_g: 11, proteinas_g: 3 },
    allergens: ['glúten', 'leite', 'ovo'] },
  { id: 6, name: 'Cupcake de Coco', flavor: 'coco', category: 'individual', price: 8.5,
    description: 'Massa de coco com cobertura cremosa e flocos de coco tostado.',
    image: 'cupcake-coco.jpg', alt: 'Cupcake de coco coberto com flocos de coco tostado',
    stockQuantity: 16, nutritionalInfo: { kcal: 310, carboidratos_g: 37, acucares_g: 25, gorduras_g: 17, proteinas_g: 3 },
    allergens: ['glúten', 'leite', 'ovo', 'coco'] },
  { id: 7, name: 'Cupcake Doce de Leite', flavor: 'doce de leite', category: 'individual', price: 9.5,
    description: 'Massa amanteigada com recheio e cobertura de doce de leite.',
    image: 'cupcake-doce-de-leite.jpg', alt: 'Cupcake com cobertura de doce de leite e calda',
    stockQuantity: 12, nutritionalInfo: { kcal: 330, carboidratos_g: 45, acucares_g: 32, gorduras_g: 14, proteinas_g: 4 },
    allergens: ['glúten', 'leite', 'ovo'] },
  { id: 8, name: 'Cupcake de Nozes', flavor: 'nozes', category: 'individual', price: 10.5,
    description: 'Massa amanteigada com pedaços de nozes e cobertura de cream cheese.',
    image: 'cupcake-nozes.jpg', alt: 'Cupcake decorado com nozes picadas por cima',
    stockQuantity: 0, nutritionalInfo: { kcal: 350, carboidratos_g: 40, acucares_g: 26, gorduras_g: 20, proteinas_g: 6 },
    allergens: ['glúten', 'leite', 'ovo', 'nozes'] },
  { id: 9, name: 'Kit Mesversário (caixa com 6)', flavor: 'variados', category: 'kit', price: 48.0,
    description: 'Caixa com 6 cupcakes variados: chocolate, morango, baunilha, red velvet, limão e coco.',
    image: 'kit-caixa-6.jpg', alt: 'Caixa com 6 cupcakes de sabores variados',
    stockQuantity: 10, kitItems: [1, 2, 3, 4, 5, 6],
    nutritionalInfo: { kcal: 1850, carboidratos_g: 237, acucares_g: 159, gorduras_g: 84, proteinas_g: 20 },
    allergens: ['glúten', 'leite', 'ovo', 'coco'] },
  { id: 10, name: 'Kit Festa (caixa com 12)', flavor: 'variados', category: 'kit', price: 90.0,
    description: 'Caixa com 12 cupcakes variados, ideal para aniversários e comemorações.',
    image: 'kit-caixa-12.jpg', alt: 'Caixa com 12 cupcakes de sabores variados para festas',
    stockQuantity: 6, kitItems: [1, 2, 3, 4, 5, 6, 7, 8],
    nutritionalInfo: { kcal: 3700, carboidratos_g: 474, acucares_g: 318, gorduras_g: 168, proteinas_g: 40 },
    allergens: ['glúten', 'leite', 'ovo', 'coco', 'nozes'] }
];

const SEED_COUPONS = [
  { code: 'BEMVINDO10', description: '10% de desconto para o primeiro pedido', type: 'percent', value: 10, active: 1, minSubtotal: 0 },
  { code: 'FRETEGRATIS', description: 'Frete grátis em pedidos acima de R$ 60', type: 'frete', value: 100, active: 1, minSubtotal: 60 },
  { code: 'DOCE5', description: 'R$ 5,00 de desconto', type: 'fixed', value: 5, active: 1, minSubtotal: 20 }
];

function seedIfEmpty(db) {
  const { count } = db.prepare('SELECT COUNT(*) AS count FROM products').get();
  if (count > 0) return;

  const insertProduct = db.prepare(`
    INSERT INTO products (id, name, flavor, category, price, description, image, alt, stock_quantity,
                           kcal, carboidratos_g, acucares_g, gorduras_g, proteinas_g)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertAllergen = db.prepare('INSERT OR IGNORE INTO allergens (name) VALUES (?)');
  const findAllergenId = db.prepare('SELECT id FROM allergens WHERE name = ?');
  const linkAllergen = db.prepare('INSERT INTO product_allergens (product_id, allergen_id) VALUES (?, ?)');
  const linkKitItem = db.prepare('INSERT INTO product_kit_items (kit_product_id, component_product_id) VALUES (?, ?)');

  for (const p of SEED_PRODUCTS) {
    const n = p.nutritionalInfo || {};
    insertProduct.run(
      p.id, p.name, p.flavor, p.category, p.price, p.description, p.image, p.alt, p.stockQuantity,
      n.kcal ?? null, n.carboidratos_g ?? null, n.acucares_g ?? null, n.gorduras_g ?? null, n.proteinas_g ?? null
    );
    for (const allergenName of p.allergens || []) {
      insertAllergen.run(allergenName);
      const { id: allergenId } = findAllergenId.get(allergenName);
      linkAllergen.run(p.id, allergenId);
    }
    for (const componentId of p.kitItems || []) {
      linkKitItem.run(p.id, componentId);
    }
  }

  const insertCoupon = db.prepare(`
    INSERT INTO coupons (code, description, type, value, active, min_subtotal) VALUES (?, ?, ?, ?, ?, ?)
  `);
  for (const c of SEED_COUPONS) {
    insertCoupon.run(c.code, c.description, c.type, c.value, c.active, c.minSubtotal);
  }

  const insertUser = db.prepare(`
    INSERT INTO users (id, name, email, password_hash, role, status) VALUES (?, ?, ?, ?, ?, ?)
  `);
  insertUser.run(1, 'Administrador', 'admin@cupcakeria.com', hashPassword('admin123'), 'admin', 'ativo');
}

function getDb() {
  if (dbInstance) return dbInstance;

  dbInstance = new DatabaseSync(DB_PATH);
  dbInstance.exec('PRAGMA foreign_keys = ON');

  const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
  dbInstance.exec(schema);

  seedIfEmpty(dbInstance);
  return dbInstance;
}

module.exports = { getDb };
