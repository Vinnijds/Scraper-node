/*
 * config.js
 * Arquivo de configuração.
 * Armazena constantes, URLs base, modelos e headers.
 */

// Lista de modelos a monitorar (exporta a constante)
export const MODELOS = [
  "asus vivobook 15",
  "lenovo ideapad 3",
  "acer nitro 5",
  "dell inspiron 15",
  "macbook",
];

// Arquivo de saída
export const OUTPUT_FILE = "resultados.csv";

// Número de páginas de resultados a buscar por site
export const PAGINAS_A_BUSCAR = 2;

// Delay aleatório (em segundos) entre requisições
export const DELAY_MIN_MS = 3000; // Em Node, é mais comum usar milissegundos
export const DELAY_MAX_MS = 7000;

// Lista de User-Agents para rotação
export const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36",
];

// URLs base para as buscas
export const URLS_BASE = {
  amazon: "https://www.amazon.com.br",
  mercadolivre: "https://lista.mercadolivre.com.br",
  kabum: "https://www.kabum.com.br",
  pichau: "https://www.pichau.com.br",
  magalu: "https://www.magazineluiza.com.br",
};