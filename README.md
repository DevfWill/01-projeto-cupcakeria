# 🧁 Cupcakeria

Projeto acadêmico da disciplina **Engenharia de Software I** — e-commerce de
cupcakes completo, implementando as **21 histórias de usuário** do backlog
(`PIC_atividade_engenharia_software_I.docx`), organizadas em 4 sprints.

## Tecnologias usadas (básicas, sem frameworks pesados)

- **Back-end:** Node.js + Express (API REST)
- **Banco de dados:** **SQLite** via módulo nativo `node:sqlite` do Node.js
  (requer Node ≥ 22.5) — SGBD relacional de verdade, com projeto físico
  (`database/schema.sql`) e dicionário de dados
  (`database/dicionario-de-dados.md`), sem precisar instalar nenhum servidor
  de banco separado (o banco é um único arquivo em `data/cupcakeria.db`,
  criado automaticamente no primeiro `npm start`)
- **Autenticação:** token simples gerado com `crypto.randomBytes` (sem JWT
  de terceiros) + senha com hash `scrypt` nativo do Node
- **Front-end:** HTML5 + CSS3 (responsivo, mobile-first) + JavaScript puro
  (sem React/Vue, sem build step, sem bibliotecas externas)
- **Testes:** `node:test` (executor nativo do Node, sem Jest/Mocha) — cada
  arquivo de teste roda com um banco SQLite **em memória**, isolado e
  recriado do zero a cada execução

## Como rodar

```bash
npm install
npm start          # inicia o servidor em http://localhost:3000
```

Desenvolvimento com reinício automático: `npm run dev`
Rodar os testes automatizados: `npm test`

> Pré-requisito: Node.js 22.5 ou mais recente (usa o módulo nativo
> `node:sqlite`). Confira com `node --version`.

### Login de teste

- **Administrador:** `admin@cupcakeria.com` / `admin123`
- **Cliente:** crie uma conta pela página "Conta" (HU13)

## Banco de dados (projeto físico + dicionário de dados)

- **Schema/DDL físico:** [`database/schema.sql`](database/schema.sql) — 12
  tabelas normalizadas (3FN): `users`, `products`, `allergens`,
  `product_allergens`, `product_kit_items`, `coupons`, `orders`,
  `order_items`, `order_status_history`, `reviews`, `notifications`.
- **Dicionário de dados:** [`database/dicionario-de-dados.md`](database/dicionario-de-dados.md)
  — toda coluna de cada tabela, com tipo, obrigatoriedade, chave e descrição.
- **Diagrama conceitual (entidade-relacionamento):**
  [`database/diagrams/diagrama-conceitual.png`](database/diagrams/diagrama-conceitual.png)
- **Diagrama lógico (normalizado, com atributos e chaves):**
  [`database/diagrams/diagrama-logico.png`](database/diagrams/diagrama-logico.png)

Para resetar todos os dados ao estado inicial de demonstração, apague
`data/cupcakeria.db` e rode `npm start` novamente — o schema e os dados
iniciais (10 produtos, 3 cupons, 1 administrador) são recriados
automaticamente.

## Estrutura do projeto

```
cupcakeria/
├── server.js                  # Servidor Express (registra todas as rotas)
├── middleware/auth.js         # Autenticação (token) e autorização (admin)
├── database/
│   ├── schema.sql               # Projeto físico do banco (DDL SQLite)
│   ├── dicionario-de-dados.md    # Dicionário de dados
│   └── diagrams/                 # Diagrama conceitual e lógico (ER)
├── routes/
│   ├── auth.js                 # HU13 - cadastro/login/logout
│   ├── products.js             # HU01/02/03/08/16/17 - catálogo, filtro, CRUD, estoque
│   ├── frete.js                # HU07 - cálculo de frete por CEP
│   ├── coupons.js              # HU04/18 - cupons e promoções
│   ├── orders.js                # HU05/06/07/08/09/11/12/19 - pedidos
│   ├── reviews.js               # HU14 - avaliações
│   ├── reports.js               # HU20 - relatórios de vendas
│   ├── users.js                  # HU21 - gestão de clientes
│   └── notifications.js         # HU10 - notificações simuladas
├── utils/                      # db.js, password.js, tokenStore.js, coupons.js, notify.js
├── data/                       # "banco de dados" em JSON
├── public/                     # Front-end estático
│   ├── index.html               # Catálogo (HU01/02/08/15)
│   ├── produto.html             # Detalhe do produto (HU03/12/14)
│   ├── carrinho.html            # Carrinho + checkout (HU04/05/06/07/11/12)
│   ├── conta.html                # Login/cadastro (HU13)
│   ├── pedidos.html              # Meus pedidos + notificações (HU09/10)
│   ├── admin.html                # Painel administrativo (HU16-HU21)
│   ├── css/style.css
│   ├── js/ (api.js, app.js, produto.js, carrinho.js, conta.js, pedidos.js, admin.js)
│   └── images/                   # <-- coloque aqui as fotos baixadas (veja abaixo)
├── test/
│   ├── products.test.js         # Testes do catálogo (HU01)
│   ├── flow.test.js              # Teste de fluxo completo (HU01 a HU21)
│   └── testUtils.js              # Utilitários de teste (servidor + backup/restore)
└── package.json
```

## Backlog implementado (21 histórias de usuário)

### Sprint 1 — base do app
- **HU01** ✅ Visualizar fotos dos cupcakes — catálogo com galeria responsiva
- **HU02** ✅ Filtrar cupcakes por sabor — chips de filtro no catálogo
- **HU05** ✅ Adicionar cupcakes ao carrinho — carrinho persistido no navegador
- **HU07** ✅ Calcular frete pelo CEP — simulação por região (sem depender de API externa)
- **HU13** ✅ Criar conta — cadastro e login de clientes
- **HU15** ✅ Interface responsiva — mobile-first, testado em 390px e 1280px

### Sprint 2 — pagamento e acompanhamento
- **HU06** ✅ Pagar com cartão ou Pix — seleção da forma de pagamento no checkout (simulado)
- **HU09** ✅ Acompanhar status do pedido — página "Meus pedidos" com histórico
- **HU10** ✅ Notificações por e-mail/WhatsApp — simuladas e exibidas em "Minhas notificações"

### Sprint 3 — diferenciais
- **HU04** ✅ Promoções e cupons de desconto — cupons aplicáveis no carrinho
- **HU08** ✅ Kits prontos — caixas com 6/12 cupcakes no catálogo
- **HU11** ✅ Escolher data de entrega — seletor de data no checkout
- **HU12** ✅ Personalizar cupcakes — mensagem e cor da cobertura
- **HU14** ✅ Avaliar cupcakes comprados — nota e comentário (só quem comprou)

### Sprint 4 — administrativo
- **HU16** ✅ Cadastrar novos cupcakes — formulário no painel admin
- **HU17** ✅ Gerenciar estoque — edição de quantidade por produto
- **HU18** ✅ Criar/gerenciar cupons — painel admin
- **HU19** ✅ Acompanhar e atualizar status dos pedidos — painel admin
- **HU20** ✅ Relatórios de vendas e desempenho — receita, ticket médio, top produtos
- **HU21** ✅ Gerenciar contas de clientes — ativar/bloquear

Regras de negócio aplicadas: RN#1 (toda foto é obrigatória ao cadastrar um
produto) e RNF#1 (interface responsiva) foram validadas tanto no front-end
quanto com testes automatizados.

## 📷 Imagens dos cupcakes

Como este ambiente não tem acesso a bancos de imagens externos (Unsplash,
Pexels etc.), as fotos incluídas são **ilustrações vetoriais geradas
especificamente para cada sabor** (cores e coberturas combinando com a
descrição de cada produto), em vez de fotografias reais.

| Sabor | Nome do arquivo | Buscar em |
|---|---|---|
| Chocolate | `cupcake-chocolate.jpg` | https://unsplash.com/s/photos/chocolate-cupcake |
| Morango | `cupcake-morango.jpg` | https://unsplash.com/s/photos/strawberry-cupcake |
| Red Velvet | `cupcake-red-velvet.jpg` | https://unsplash.com/s/photos/red-velvet-cupcake |
| Limão | `cupcake-limao.jpg` | https://unsplash.com/s/photos/lemon-cupcake |
| Baunilha | `cupcake-baunilha.jpg` | https://unsplash.com/s/photos/vanilla-cupcake |
| Coco | `cupcake-coco.jpg` | https://unsplash.com/s/photos/coconut-cupcake |
| Doce de Leite | `cupcake-doce-de-leite.jpg` | https://unsplash.com/s/photos/caramel-cupcake |
| Nozes | `cupcake-nozes.jpg` | https://unsplash.com/s/photos/walnut-cupcake |
| Kit caixa 6 | `kit-caixa-6.jpg` | https://unsplash.com/s/photos/cupcake-box |
| Kit caixa 12 | `kit-caixa-12.jpg` | https://unsplash.com/s/photos/cupcake-box |

## Decisões de projeto (simplificações conscientes)

- **Pagamento:** simulado (sem gateway real) — o pedido é aprovado
  automaticamente, já que o foco é didático.
- **Notificações (HU10):** simuladas e salvas na tabela `notifications`,
  visíveis na página "Meus pedidos" — evita depender de contas de e-mail/SMS
  reais.
- **Sessão:** tokens ficam em memória no servidor; reiniciar o servidor
  desloga todo mundo (aceitável para um projeto de estudo rodando em um
  único processo).
- **Banco de dados:** SQLite (arquivo único, sem servidor separado). É um
  SGBD de mercado de verdade — só não exige infraestrutura extra para rodar
  localmente. Trocar por PostgreSQL/MySQL depois exige apenas reescrever
  `utils/database.js` (que hoje concentra a conexão e o seed inicial),
  mantendo o mesmo `schema.sql` como referência do modelo físico.
- **Kits prontos (HU08):** o estoque de um kit é controlado pela própria
  linha em `products` (coluna `stock_quantity`), não pelo estoque somado dos
  componentes — simplificação para não precisar decompor/validar estoque de
  cada sabor individualmente a cada pedido de kit.
