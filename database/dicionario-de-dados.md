# Dicionário de Dados — Cupcakeria (SQLite)

Banco de dados físico gerado a partir de `database/schema.sql`. SGBD: **SQLite**
(via módulo nativo `node:sqlite` do Node.js — sem servidor externo, arquivo
único em `data/cupcakeria.db`).

---

## Tabela `users`
Clientes cadastrados e o administrador do sistema (HU13, HU21).

| Coluna | Tipo | Nulo? | Chave | Descrição |
|---|---|---|---|---|
| id | INTEGER | Não | PK (autoincremento) | Identificador único do usuário |
| name | TEXT | Não | | Nome completo |
| email | TEXT | Não | UNIQUE | E-mail de login |
| password_hash | TEXT | Não | | Hash da senha (scrypt + salt) |
| role | TEXT | Não | | `cliente` ou `admin` |
| status | TEXT | Não | | `ativo` ou `bloqueado` (HU21) |
| created_at | TEXT | Não | | Data/hora de criação da conta |

## Tabela `products`
Cupcakes individuais e kits prontos (HU01, HU02, HU03, HU08, HU16, HU17).

| Coluna | Tipo | Nulo? | Chave | Descrição |
|---|---|---|---|---|
| id | INTEGER | Não | PK (autoincremento) | Identificador único do produto |
| name | TEXT | Não | | Nome do cupcake/kit |
| flavor | TEXT | Não | | Sabor (usado no filtro HU02) |
| category | TEXT | Não | | `individual` ou `kit` |
| price | REAL | Não | | Preço unitário (> 0) |
| description | TEXT | Sim | | Descrição do produto |
| image | TEXT | Não | | Nome do arquivo de foto (RN#1: obrigatório) |
| alt | TEXT | Sim | | Texto alternativo da imagem |
| stock_quantity | INTEGER | Não | | Quantidade em estoque (>= 0) |
| kcal | INTEGER | Sim | | Calorias (informação nutricional) |
| carboidratos_g | INTEGER | Sim | | Carboidratos em gramas |
| acucares_g | INTEGER | Sim | | Açúcares em gramas |
| gorduras_g | INTEGER | Sim | | Gorduras em gramas |
| proteinas_g | INTEGER | Sim | | Proteínas em gramas |

## Tabela `allergens`
Catálogo de alergênicos (HU03).

| Coluna | Tipo | Nulo? | Chave | Descrição |
|---|---|---|---|---|
| id | INTEGER | Não | PK (autoincremento) | Identificador do alergênico |
| name | TEXT | Não | UNIQUE | Nome do alergênico (ex.: glúten, leite) |

## Tabela `product_allergens`
Associação N:N entre produtos e alergênicos.

| Coluna | Tipo | Nulo? | Chave | Descrição |
|---|---|---|---|---|
| product_id | INTEGER | Não | PK composta, FK → products.id | Produto |
| allergen_id | INTEGER | Não | PK composta, FK → allergens.id | Alergênico contido no produto |

## Tabela `product_kit_items`
Composição dos kits prontos — relação N:N reflexiva em `products` (HU08).

| Coluna | Tipo | Nulo? | Chave | Descrição |
|---|---|---|---|---|
| kit_product_id | INTEGER | Não | PK composta, FK → products.id | Produto do tipo kit |
| component_product_id | INTEGER | Não | PK composta, FK → products.id | Cupcake que compõe o kit |

## Tabela `coupons`
Cupons de desconto e promoções (HU04, HU18).

| Coluna | Tipo | Nulo? | Chave | Descrição |
|---|---|---|---|---|
| code | TEXT | Não | PK | Código do cupom (ex.: BEMVINDO10) |
| description | TEXT | Sim | | Descrição amigável do cupom |
| type | TEXT | Não | | `percent`, `fixed` ou `frete` |
| value | REAL | Não | | Valor do desconto (percentual ou fixo) |
| active | INTEGER | Não | | 1 = ativo, 0 = inativo |
| min_subtotal | REAL | Não | | Subtotal mínimo para aplicar o cupom |

## Tabela `orders`
Pedidos realizados pelos clientes (HU05–HU07, HU09, HU11, HU19).

| Coluna | Tipo | Nulo? | Chave | Descrição |
|---|---|---|---|---|
| id | INTEGER | Não | PK (autoincremento) | Identificador do pedido |
| user_id | INTEGER | Não | FK → users.id | Cliente que fez o pedido |
| subtotal | REAL | Não | | Soma dos itens antes de descontos/frete |
| coupon_code | TEXT | Sim | FK → coupons.code | Cupom aplicado, se houver |
| discount | REAL | Não | | Valor de desconto aplicado |
| frete | REAL | Não | | Valor final do frete |
| frete_region | TEXT | Sim | | Região calculada a partir do CEP |
| total | REAL | Não | | Valor total do pedido |
| cep | TEXT | Não | | CEP de entrega (HU07) |
| address | TEXT | Não | | Endereço completo de entrega |
| delivery_date | TEXT | Não | | Data de entrega escolhida (HU11) |
| payment_method | TEXT | Não | | `cartao` ou `pix` (HU06) |
| status | TEXT | Não | | Status atual do pedido (HU09/HU19) |
| created_at | TEXT | Não | | Data/hora de criação do pedido |

## Tabela `order_items`
Itens de cada pedido, com personalização (HU12).

| Coluna | Tipo | Nulo? | Chave | Descrição |
|---|---|---|---|---|
| id | INTEGER | Não | PK (autoincremento) | Identificador do item |
| order_id | INTEGER | Não | FK → orders.id | Pedido ao qual pertence |
| product_id | INTEGER | Não | FK → products.id | Produto comprado |
| product_name | TEXT | Não | | Nome do produto no momento da compra |
| unit_price | REAL | Não | | Preço unitário no momento da compra |
| qty | INTEGER | Não | | Quantidade comprada (> 0) |
| line_total | REAL | Não | | unit_price × qty |
| customization_message | TEXT | Sim | | Mensagem personalizada (HU12) |
| customization_color | TEXT | Sim | | Cor da cobertura escolhida (HU12) |

## Tabela `order_status_history`
Histórico de mudanças de status de um pedido (HU09/HU19).

| Coluna | Tipo | Nulo? | Chave | Descrição |
|---|---|---|---|---|
| id | INTEGER | Não | PK (autoincremento) | Identificador do registro |
| order_id | INTEGER | Não | FK → orders.id | Pedido relacionado |
| status | TEXT | Não | | Status registrado |
| changed_at | TEXT | Não | | Data/hora da mudança |

## Tabela `reviews`
Avaliações de cupcakes comprados (HU14).

| Coluna | Tipo | Nulo? | Chave | Descrição |
|---|---|---|---|---|
| id | INTEGER | Não | PK (autoincremento) | Identificador da avaliação |
| product_id | INTEGER | Não | FK → products.id, UNIQUE(product_id,user_id) | Produto avaliado |
| user_id | INTEGER | Não | FK → users.id, UNIQUE(product_id,user_id) | Autor da avaliação |
| rating | INTEGER | Não | | Nota de 1 a 5 |
| comment | TEXT | Sim | | Comentário opcional |
| created_at | TEXT | Não | | Data/hora da avaliação |

## Tabela `notifications`
Notificações simuladas de e-mail/WhatsApp (HU10).

| Coluna | Tipo | Nulo? | Chave | Descrição |
|---|---|---|---|---|
| id | INTEGER | Não | PK (autoincremento) | Identificador da notificação |
| user_id | INTEGER | Não | FK → users.id | Destinatário |
| channel | TEXT | Não | | `email` ou `whatsapp` |
| message | TEXT | Não | | Conteúdo da notificação |
| created_at | TEXT | Não | | Data/hora do envio simulado |

---

## Normalização (3FN)
- **1FN**: todos os atributos são atômicos (ex.: alergênicos e itens de kit
  foram extraídos para tabelas associativas em vez de listas dentro de uma
  coluna).
- **2FN**: não há atributos que dependam de apenas parte de uma chave
  composta (as tabelas com PK composta — `product_allergens` e
  `product_kit_items` — só têm as próprias colunas de chave).
- **3FN**: não há atributos que dependam de outro atributo não-chave (ex.:
  `frete_region` depende do pedido, não de outro campo derivado).
