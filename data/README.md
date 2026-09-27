Esta pasta guarda o arquivo do banco de dados SQLite gerado automaticamente
na primeira vez que o servidor roda (`cupcakeria.db`). Ele não fica versionado
no Git (veja `.gitignore`) porque é dado gerado, não código-fonte.

Para começar do zero (resetar todos os dados para o estado inicial de
demonstração), basta apagar o arquivo `cupcakeria.db` e rodar `npm start`
novamente — ele recria o schema e semeia os dados iniciais automaticamente.

O projeto físico do banco (schema/DDL) fica em `database/schema.sql`, e o
dicionário de dados em `database/dicionario-de-dados.md`.
