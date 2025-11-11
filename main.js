/*
 * main.js
 * Monitor de Preços de Notebooks - Versão Node.js
 * Orquestrador principal.
 */

// Importa as configurações e módulos que criamos
import * as config from "./config.js";
import logger from "./logger.js";
import * as processing from "./processing.js";
import { SCRAPER_FUNCTIONS } from "./scrapers.js";

// --- Funções Auxiliares (equivalentes ao 'random' e 'time' do Python) ---

// Gera um timestamp formatado (ex: "2025-10-29 14:30:00")
function timestamp() {
  return new Date().toISOString().replace("T", " ").substring(0, 19);
}

// Função de espera assíncrona (substitui time.sleep)
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Escolhe um item aleatório de um array (substitui random.choice)
function getRandomChoice(array) {
  return array[Math.floor(Math.random() * array.length)];
}

// Gera um número aleatório entre min e max (substitui random.uniform)
function getRandomArbitrary(min, max) {
  return Math.random() * (max - min) + min;
}

// ---------------- Main ----------------

async function main() {
  logger.info("Iniciando o monitoramento...");
  const inicioTotal = Date.now(); // Marca o tempo inicial em ms
  const todosOsResultados = [];
  const ts = timestamp();

  // Loop pelos modelos (config.MODELOS)
  for (const modelo of config.MODELOS) {
    logger.info(`--- Buscando modelo: ${modelo} ---`);

    // Loop pelos scrapers (SCRAPER_FUNCTIONS)
    // Object.entries converte o objeto em um array de pares [chave, valor]
    for (const [nomeSite, funcScraper] of Object.entries(SCRAPER_FUNCTIONS)) {
      const baseUrl = config.URLS_BASE[nomeSite];

      // Loop pelas páginas (de 1 até PAGINAS_A_BUSCAR)
      for (let pagina = 1; pagina <= config.PAGINAS_A_BUSCAR; pagina++) {
        logger.info(
          `Buscando em [${nomeSite.toUpperCase()}] - Página ${pagina}...`
        );

        // Item 3: Rotação de User-Agent
        const headers = {
          "User-Agent": getRandomChoice(config.USER_AGENTS),
        };

        try {
          // Chama a função de scraper (é assíncrona, então usamos 'await')
          const resultadosPagina = await funcScraper(
            modelo,
            baseUrl,
            headers,
            pagina
          );

          for (const res of resultadosPagina) {
            // Item 1: Processa as specs (extrai_specs agora é camelCase: extraiSpecs)
            const specs = processing.extraiSpecs(res.title);

            // Monta o objeto completo (usando spread operator '...' para mesclar specs)
            const dadosCompletos = {
              data_hora: ts,
              site: res.site,
              modelo_busca: res.query,
              titulo: res.title,
              preco: res.price,
              link: res.link,
              ...specs, // Adiciona processador, ram, etc.
            };
            todosOsResultados.push(dadosCompletos);
          }

          logger.info(
            `Encontrados ${resultadosPagina.length} resultados para ${modelo} em ${nomeSite} (Pág ${pagina})`
          );

          // Item 3: Delay aleatório entre CADA requisição
          // Usamos nossas constantes _MS (milissegundos)
          const delay = getRandomArbitrary(
            config.DELAY_MIN_MS,
            config.DELAY_MAX_MS
          );
          // .toFixed(2) formata o número para 2 casas decimais para o log
          logger.info(`Aguardando ${(delay / 1000).toFixed(2)} segundos...`);
          await sleep(delay);
        } catch (error) {
          logger.error(`Erro ao buscar em ${nomeSite}: ${error.message}`);
          // 'continue' funciona igual no JS para pular para a próxima iteração do loop
          continue;
        }
      }
    }
  }

  logger.info(
    `Busca concluída. Total de ${todosOsResultados.length} resultados encontrados.`
  );

  // Item 2: Salva TUDO no CSV de uma vez no final
  if (todosOsResultados.length > 0) {
    // salvaCsv também é assíncrona agora
    await processing.salvaCsv(todosOsResultados, config.OUTPUT_FILE);
  }

  const fimTotal = Date.now();
  const tempoTotalSegundos = (fimTotal - inicioTotal) / 1000;
  logger.info(
    `Processo concluído. Tempo total: ${tempoTotalSegundos.toFixed(
      2
    )} segundos.`
  );
}

// ---------------- Run ----------------
// Chama a função principal
main();
