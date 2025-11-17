import * as config from "./config.js";
import logger from "./logger.js";
import * as processing from "./processing.js";
import { SCRAPER_FUNCTIONS } from "./scrapers.js";
import * as db from "./database.js"; // <--- Importar o DB

// ... (Funções timestamp, sleep, getRandomChoice... MANTENHA IGUAL) ...
function timestamp() { return new Date().toISOString().replace("T", " ").substring(0, 19); }
function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }
function getRandomChoice(array) { return array[Math.floor(Math.random() * array.length)]; }
function getRandomArbitrary(min, max) { return Math.random() * (max - min) + min; }

// ---------------- Main ----------------

async function main() {
  // 1. Inicializa o Banco de Dados
  try {
    await db.initDatabase();
  } catch (error) {
    logger.error("Falha crítica ao conectar no banco. Encerrando.");
    return; // Para tudo se não tiver banco
  }

  logger.info("Iniciando o monitoramento...");
  const inicioTotal = Date.now();
  const todosOsResultados = [];
  const ts = timestamp();

  // ... (Loops de scraping MANTENHA IGUAIS) ...
  // (Vou resumir, mas o código é o mesmo do passo anterior)
  for (const modelo of config.MODELOS) {
    logger.info(`--- Buscando modelo: ${modelo} ---`);
    for (const [nomeSite, funcScraper] of Object.entries(SCRAPER_FUNCTIONS)) {
        // ... lógica de loop de paginas e scraper ...
        // ... (copie o miolo do seu main.js anterior aqui) ...
         const baseUrl = config.URLS_BASE[nomeSite];
              for (let pagina = 1; pagina <= config.PAGINAS_A_BUSCAR; pagina++) {
                logger.info(`Buscando em [${nomeSite.toUpperCase()}] - Página ${pagina}...`);
                const headers = { "User-Agent": getRandomChoice(config.USER_AGENTS) };
                try {
                  const resultadosPagina = await funcScraper(modelo, baseUrl, headers, pagina);
                  for (const res of resultadosPagina) {
                    const specs = processing.extraiSpecs(res.title);
                    const dadosCompletos = {
                      data_hora: ts,
                      site: res.site,
                      modelo_busca: res.query,
                      titulo: res.title,
                      preco: res.price,
                      link: res.link,
                      ...specs,
                    };
                    todosOsResultados.push(dadosCompletos);
                  }
                  logger.info(`Encontrados ${resultadosPagina.length} itens.`);
                  const delay = getRandomArbitrary(config.DELAY_MIN_MS, config.DELAY_MAX_MS);
                  await sleep(delay);
                } catch (error) {
                  logger.error(`Erro busca: ${error.message}`);
                  continue;
                }
              }
    }
  }

  logger.info(`Busca concluída. Total: ${todosOsResultados.length} itens.`);

  // 2. Salva no Banco de Dados (e opcionalmente no CSV)
  if (todosOsResultados.length > 0) {
    // Salva no Banco
    await processing.salvaNoBanco(todosOsResultados);
    
    // Opcional: Mantém o backup em CSV
    await processing.salvaCsv(todosOsResultados, config.OUTPUT_FILE);
  }

  // 3. Fecha a conexão com o banco
  await db.closeDatabase();

  const fimTotal = Date.now();
  const tempo = (fimTotal - inicioTotal) / 1000;
  logger.info(`Processo concluído. Tempo: ${tempo.toFixed(2)}s.`);
}

main();