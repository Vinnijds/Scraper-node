import pg from 'pg';
const { Pool } = pg;
import logger from './logger.js';

// --- CONFIGURAÇÃO DA CONEXÃO ---
// Substitua pela sua string de conexão real ou use variáveis de ambiente (recomendado)
// Exemplo: 'postgres://postgres:minhasenha@localhost:5432/meu_scraper'
const CONNECTION_STRING = process.env.DATABASE_URL || 'postgres://postgres:root@localhost:5432/scraper_db';

// Cria um "pool" de conexões (melhor performance que abrir uma por uma)
const pool = new Pool({
  connectionString: CONNECTION_STRING,
});

// --- FUNÇÃO PARA INICIALIZAR A TABELA ---
export async function initDatabase() {
  const client = await pool.connect();
  try {
    // Cria a tabela 'produtos' se ela não existir
    // Adicionamos uma coluna 'id' serial e uma constraint UNIQUE no link
    // para evitar duplicatas do mesmo link.
    const query = `
      CREATE TABLE IF NOT EXISTS produtos (
        id SERIAL PRIMARY KEY,
        data_hora TIMESTAMP NOT NULL,
        site VARCHAR(50),
        modelo_busca VARCHAR(100),
        titulo TEXT NOT NULL,
        preco VARCHAR(50),
        processador VARCHAR(50),
        ram VARCHAR(50),
        armazenamento VARCHAR(50),
        gpu VARCHAR(50),
        tela VARCHAR(50),
        link TEXT UNIQUE, 
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    await client.query(query);
    logger.info('Banco de dados inicializado: Tabela "produtos" verificada.');
  } catch (error) {
    logger.error(`Erro ao inicializar banco de dados: ${error.message}`);
    throw error; // Lança o erro para parar o programa se o DB falhar
  } finally {
    client.release(); // Libera a conexão de volta para o pool
  }
}

// --- FUNÇÃO PARA EXECUTAR QUERIES ---
export async function query(text, params) {
  return pool.query(text, params);
}

// --- FUNÇÃO PARA FECHAR O POOL (ao encerrar o programa) ---
export async function closeDatabase() {
  await pool.end();
}