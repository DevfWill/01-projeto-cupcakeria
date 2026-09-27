-- =====================================================================
-- Cupcakeria - Projeto Físico do Banco de Dados (SQLite)
-- Gerado a partir do modelo lógico normalizado (3FN).
-- =====================================================================

PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------------
-- USERS: clientes e administrador
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT    NOT NULL,
    email         TEXT    NOT NULL UNIQUE,
    password_hash TEXT    NOT NULL,
    role          TEXT    NOT NULL DEFAULT 'cliente' CHECK (role IN ('cliente', 'admin')),
    status        TEXT    NOT NULL DEFAULT 'ativo'   CHECK (status IN ('ativo', 'bloqueado')),
    created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ---------------------------------------------------------------------
-- PRODUCTS: cupcakes individuais e kits prontos
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT    NOT NULL,
    flavor          TEXT    NOT NULL,
    category        TEXT    NOT NULL DEFAULT 'individual' CHECK (category IN ('individual', 'kit')),
    price           REAL    NOT NULL CHECK (price > 0),
    description     TEXT,
    image           TEXT    NOT NULL,               -- RN#1: foto obrigatória (HU01)
    alt             TEXT,
    stock_quantity  INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    kcal            INTEGER,
    carboidratos_g  INTEGER,
    acucares_g      INTEGER,
    gorduras_g      INTEGER,
    proteinas_g     INTEGER
);

-- ---------------------------------------------------------------------
-- ALLERGENS: catálogo de alergênicos (N:N com products)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS allergens (
    id   INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS product_allergens (
    product_id  INTEGER NOT NULL REFERENCES products(id)  ON DELETE CASCADE,
    allergen_id INTEGER NOT NULL REFERENCES allergens(id) ON DELETE CASCADE,
    PRIMARY KEY (product_id, allergen_id)
);

-- ---------------------------------------------------------------------
-- PRODUCT_KIT_ITEMS: composição dos kits prontos (N:N reflexivo em products)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS product_kit_items (
    kit_product_id       INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    component_product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    PRIMARY KEY (kit_product_id, component_product_id)
);

-- ---------------------------------------------------------------------
-- COUPONS: cupons de desconto / promoções
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS coupons (
    code          TEXT PRIMARY KEY,
    description   TEXT,
    type          TEXT NOT NULL CHECK (type IN ('percent', 'fixed', 'frete')),
    value         REAL NOT NULL,
    active        INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
    min_subtotal  REAL NOT NULL DEFAULT 0
);

-- ---------------------------------------------------------------------
-- ORDERS: pedidos
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS orders (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id         INTEGER NOT NULL REFERENCES users(id),
    subtotal        REAL    NOT NULL,
    coupon_code     TEXT    REFERENCES coupons(code),
    discount        REAL    NOT NULL DEFAULT 0,
    frete           REAL    NOT NULL DEFAULT 0,
    frete_region    TEXT,
    total           REAL    NOT NULL,
    cep             TEXT    NOT NULL,
    address         TEXT    NOT NULL,
    delivery_date   TEXT    NOT NULL,
    payment_method  TEXT    NOT NULL CHECK (payment_method IN ('cartao', 'pix')),
    status          TEXT    NOT NULL DEFAULT 'recebido'
                    CHECK (status IN ('recebido','preparando','saiu_para_entrega','entregue','cancelado')),
    created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ---------------------------------------------------------------------
-- ORDER_ITEMS: itens de cada pedido (com personalização - HU12)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS order_items (
    id                     INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id               INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id             INTEGER NOT NULL REFERENCES products(id),
    product_name           TEXT    NOT NULL,   -- snapshot do nome no momento da compra
    unit_price             REAL    NOT NULL,   -- snapshot do preço no momento da compra
    qty                    INTEGER NOT NULL CHECK (qty > 0),
    line_total             REAL    NOT NULL,
    customization_message  TEXT,
    customization_color    TEXT
);

-- ---------------------------------------------------------------------
-- ORDER_STATUS_HISTORY: histórico de status (HU09/HU19)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS order_status_history (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id   INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    status     TEXT    NOT NULL,
    changed_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ---------------------------------------------------------------------
-- REVIEWS: avaliações de cupcakes comprados (HU14)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reviews (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL REFERENCES products(id),
    user_id    INTEGER NOT NULL REFERENCES users(id),
    rating     INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment    TEXT,
    created_at TEXT    NOT NULL DEFAULT (datetime('now')),
    UNIQUE (product_id, user_id)
);

-- ---------------------------------------------------------------------
-- NOTIFICATIONS: notificações simuladas de e-mail/WhatsApp (HU10)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id),
    channel    TEXT    NOT NULL CHECK (channel IN ('email', 'whatsapp')),
    message    TEXT    NOT NULL,
    created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ---------------------------------------------------------------------
-- Índices de apoio
-- ---------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_orders_user        ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order   ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_reviews_product     ON reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user  ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_products_flavor     ON products(flavor);
