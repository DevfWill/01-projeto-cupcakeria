const { getDb } = require('./database');

function attachRelations(row) {
  const db = getDb();
  const allergens = db.prepare(`
    SELECT a.name FROM allergens a
    JOIN product_allergens pa ON pa.allergen_id = a.id
    WHERE pa.product_id = ?
    ORDER BY a.name
  `).all(row.id).map(r => r.name);

  const kitItems = db.prepare(`
    SELECT component_product_id FROM product_kit_items WHERE kit_product_id = ?
  `).all(row.id).map(r => r.component_product_id);

  return {
    id: row.id,
    name: row.name,
    flavor: row.flavor,
    category: row.category,
    price: row.price,
    description: row.description,
    image: row.image,
    alt: row.alt,
    stockQuantity: row.stock_quantity,
    nutritionalInfo: row.kcal == null ? null : {
      kcal: row.kcal,
      carboidratos_g: row.carboidratos_g,
      acucares_g: row.acucares_g,
      gorduras_g: row.gorduras_g,
      proteinas_g: row.proteinas_g
    },
    allergens,
    ...(kitItems.length ? { kitItems } : {})
  };
}

function getProductById(id) {
  const db = getDb();
  const row = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
  return row ? attachRelations(row) : null;
}

function listProducts({ flavor, category, inStock } = {}) {
  const db = getDb();
  let sql = 'SELECT * FROM products WHERE 1=1';
  const params = [];
  if (flavor) {
    sql += ' AND LOWER(flavor) LIKE ?';
    params.push(`%${flavor.toLowerCase()}%`);
  }
  if (category) {
    sql += ' AND category = ?';
    params.push(category);
  }
  if (inStock === 'true') {
    sql += ' AND stock_quantity > 0';
  }
  sql += ' ORDER BY id';
  const rows = db.prepare(sql).all(...params);
  return rows.map(attachRelations);
}

function setAllergens(productId, allergenNames) {
  const db = getDb();
  db.prepare('DELETE FROM product_allergens WHERE product_id = ?').run(productId);
  const insertAllergen = db.prepare('INSERT OR IGNORE INTO allergens (name) VALUES (?)');
  const findAllergenId = db.prepare('SELECT id FROM allergens WHERE name = ?');
  const link = db.prepare('INSERT INTO product_allergens (product_id, allergen_id) VALUES (?, ?)');
  for (const name of allergenNames || []) {
    insertAllergen.run(name);
    const { id } = findAllergenId.get(name);
    link.run(productId, id);
  }
}

function setKitItems(kitProductId, componentIds) {
  const db = getDb();
  db.prepare('DELETE FROM product_kit_items WHERE kit_product_id = ?').run(kitProductId);
  const link = db.prepare('INSERT INTO product_kit_items (kit_product_id, component_product_id) VALUES (?, ?)');
  for (const componentId of componentIds || []) {
    link.run(kitProductId, componentId);
  }
}

module.exports = { getProductById, listProducts, setAllergens, setKitItems, attachRelations };
