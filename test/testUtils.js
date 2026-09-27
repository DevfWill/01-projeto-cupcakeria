// Sobe o app em uma porta efêmera só para o teste, e garante que o servidor
// é encerrado ao final (mesmo se o teste falhar). Como os testes usam
// CUPCAKERIA_DB=":memory:", cada arquivo de teste roda em um processo Node
// isolado (padrão do `node --test`) com seu próprio banco SQLite em memória,
// recriado do zero a partir de database/schema.sql — não é mais necessário
// nenhum backup/restore manual de dados entre execuções.
function withServer(app, fn) {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, async () => {
      const { port } = server.address();
      try {
        await fn(`http://localhost:${port}`);
        resolve();
      } catch (err) {
        reject(err);
      } finally {
        server.close();
      }
    });
  });
}

module.exports = { withServer };
