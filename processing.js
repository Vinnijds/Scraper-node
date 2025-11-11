/*
 * processing.js
 * Funções de processamento de dados.
 * Inclui extração de especificações (regex) e salvamento em CSV.
 */

// Importa o 'fs' para checar arquivos e o 'csv-writer'
import fs from "fs";
import { createObjectCsvWriter } from "csv-writer";
// Importa o logger que acabamos de criar
import logger from "./logger.js";

// --- Extração de Specs (Regex) ---

// Padrões de Regex (traduzidos para o formato RegExp do JavaScript)
// 're.I' vira a flag 'i'
// 're.compile(...)' vira 'new RegExp(...)' ou /.../i
const REGEX_SPECS = {
  processador: /(i[3579]|ryzen\s*[3579])(\s*-\s*\w+)?/i,
  // Adicionamos a flag 'g' (global) para usar 'matchAll' (equiv. ao finditer)
  ram: /(\d+)\s*(GB|G)\s*(DE\s*)?(RAM)?/gi,
  armazenamento: /(\d+)\s*(GB|TB)\s*(SSD|HD)?/i,
  gpu: /(RTX|GTX|Radeon|Iris\s*Xe|UHD\s*Graphics|AMD\s*Radeon)/i,
  tela: /(\d{2}\.?\d?)\s*(''|polegadas|pol)/i,
};

/**
 * Tenta extrair especificações detalhadas de um título de produto.
 */
export function extraiSpecs(titulo) {
  const specs = {
    processador: "N/A",
    ram: "N/A",
    armazenamento: "N/A",
    gpu: "N/A",
    tela: "N/A",
  };

  try {
    // Processador
    // '.search(titulo)' vira 'titulo.match(...)'
    let match = titulo.match(REGEX_SPECS.processador);
    if (match) {
      // 'match.group(0)' vira 'match[0]'
      specs.processador = match[0].trim().toUpperCase();
    }

    // RAM
    // 'finditer(titulo)' vira 'titulo.matchAll(...)'
    // Usamos 'Array.from()' para poder usar 'find'
    const ramMatches = Array.from(titulo.matchAll(REGEX_SPECS.ram));
    const ramMatch = ramMatches.find((m) =>
      m[0].toUpperCase().includes("RAM")
    );

    if (ramMatch) {
      // 'match.group(1)' vira 'match[1]'
      specs.ram = `${ramMatch[1]}GB`;
    } else {
      // Fallback
      const fallbackMatch = titulo.match(
        /(\d+)(gb|g)\b(?!.*\b(ssd|hd)\b)/i
      );
      if (fallbackMatch) {
        specs.ram = `${fallbackMatch[1]}GB`;
      }
    }

    // Armazenamento
    match = titulo.match(REGEX_SPECS.armazenamento);
    if (match) {
      // 'match.group(1)' vira 'match[1]', .group(2) vira match[2], etc.
      specs.armazenamento = `${match[1]}${match[2].toUpperCase()}`;
      if (match[3]) {
        specs.armazenamento += ` ${match[3].toUpperCase()}`;
      }
    }

    // GPU
    match = titulo.match(REGEX_SPECS.gpu);
    if (match) {
      specs.gpu = match[1].trim().toUpperCase();
    }

    // Tela
    match = titulo.match(REGEX_SPECS.tela);
    if (match) {
      specs.tela = `${match[1]}"`;
    }
  } catch (error) {
    logger.error(`Erro ao extrair specs do título "${titulo}": ${error.message}`);
  }
  return specs;
}

// --- Salvamento Eficiente de CSV ---

/**
 * Salva uma lista de dicionários em um arquivo CSV.
 * @param {Array<object>} dadosLista - Lista de objetos de resultados.
 * @param {string} filepath - Caminho do arquivo (ex: "resultados.csv").
 */
export async function salvaCsv(dadosLista, filepath) {
  if (!dadosLista || dadosLista.length === 0) {
    logger.warn("Nenhum dado para salvar.");
    return;
  }

  // 1. Define os cabeçalhos (formato do csv-writer)
  const fieldnames = [
    "data_hora",
    "site",
    "modelo_busca",
    "titulo",
    "preco",
    "processador",
    "ram",
    "armazenamento",
    "gpu",
    "tela",
    "link",
  ];
  // Converte a lista de strings para o formato de objeto do csv-writer
  const header = fieldnames.map((f) => ({ id: f, title: f }));

  // 2. Verifica se o arquivo é novo para escrever o cabeçalho
  // 'os.path.isfile(filepath)' vira 'fs.existsSync(filepath)'
  const fileExists = fs.existsSync(filepath);

  try {
    // 3. Configura o DictWriter (createObjectCsvWriter)
    const csvWriter = createObjectCsvWriter({
      path: filepath,
      header: header,
      append: fileExists, // Se o arquivo existe, anexa (sem cabeçalho)
      fieldDelimiter: ";", // Define o delimitador
    });

    // 4. (Opcional, mas robusto) Filtra os dados para garantir
    // que só tenham as colunas do header e preenche N/A.
    const records = dadosLista.map((linha) => {
      const record = {};
      for (const key of fieldnames) {
        record[key] = linha[key] || "N/A"; // 'linha.get(key, 'N/A')'
      }
      return record;
    });

    // 5. Escreve os dados no arquivo (de forma assíncrona)
    await csvWriter.writeRecords(records);

    logger.info(`${dadosLista.length} resultados salvos em ${filepath}`);
  } catch (error) {
    logger.error(`Erro ao salvar CSV: ${error.message}`);
  }
}