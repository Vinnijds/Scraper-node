import pg from 'pg';
const { Pool } = pg;

// Use a mesma string de conexão do database.js
const CONNECTION_STRING = 'postgres://postgres:root@localhost:5432/scraper_db';

async function verDados() {
  const pool = new Pool({ connectionString: CONNECTION_STRING });
  const client = await pool.connect();

  try {
    console.log("--- Produtos Salvos no Banco ---");
    const res = await client.query('SELECT id, site, titulo, preco FROM produtos ORDER BY id DESC LIMIT 10');
    
    if (res.rows.length === 0) {
        console.log("Nenhum produto encontrado.");
    } else {
        console.table(res.rows); // Mostra uma tabela formatada no console
    }

  } catch (err) {
    console.error("Erro ao consultar:", err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

verDados();