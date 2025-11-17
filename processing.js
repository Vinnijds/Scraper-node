import fs from "fs";
import { createObjectCsvWriter } from "csv-writer";
import logger from "./logger.js";
import * as db from "./database.js"; // <--- Importa nosso módulo de banco

// ... (MANTENHA AS CONSTANTES DE REGEX E A FUNÇÃO extraiSpecs IGUAIS) ...

const REGEX_SPECS = {
  // ... (código anterior do regex) ...
  processador: /(i[3579]|ryzen\s*[3579])(\s*-\s*\w+)?/i,
  ram: /(\d+)\s*(GB|G)\s*(DE\s*)?(RAM)?/gi,
  armazenamento: /(\d+)\s*(GB|TB)\s*(SSD|HD)?/i,
  gpu: /(RTX|GTX|Radeon|Iris\s*Xe|UHD\s*Graphics|AMD\s*Radeon)/i,
  tela: /(\d{2}\.?\d?)\s*(''|polegadas|pol)/i,
};

export function extraiSpecs(titulo) {
    // ... (código anterior da função extraiSpecs - MANTENHA IGUAL) ...
    // (Vou omitir para economizar espaço, mas copie do seu arquivo atual)
    const specs = {
        processador: "N/A", ram: "N/A", armazenamento: "N/A", gpu: "N/A", tela: "N/A",
    };
    // ... (lógica de extração) ...
    try {
        // Processador
        let match = titulo.match(REGEX_SPECS.processador);
        if (match) specs.processador = match[0].trim().toUpperCase();

        // RAM
        const ramMatches = Array.from(titulo.matchAll(REGEX_SPECS.ram));
        const ramMatch = ramMatches.find((m) => m[0].toUpperCase().includes("RAM"));
        if (ramMatch) specs.ram = `${ramMatch[1]}GB`;
        else {
            const fallbackMatch = titulo.match(/(\d+)(gb|g)\b(?!.*\b(ssd|hd)\b)/i);
            if (fallbackMatch) specs.ram = `${fallbackMatch[1]}GB`;
        }

        // Armazenamento
        match = titulo.match(REGEX_SPECS.armazenamento);
        if (match) {
            specs.armazenamento = `${match[1]}${match[2].toUpperCase()}`;
            if (match[3]) specs.armazenamento += ` ${match[3].toUpperCase()}`;
        }

        // GPU
        match = titulo.match(REGEX_SPECS.gpu);
        if (match) specs.gpu = match[1].trim().toUpperCase();

        // Tela
        match = titulo.match(REGEX_SPECS.tela);
        if (match) specs.tela = `${match[1]}"`;

    } catch (error) {
        logger.error(`Erro regex: ${error.message}`);
    }
    return specs;
}

// --- NOVO: Salvamento no PostgreSQL ---

/**
 * Salva os dados no banco PostgreSQL.
 * Usa "INSERT ... ON CONFLICT DO NOTHING" para evitar duplicatas de link.
 */
export async function salvaNoBanco(dadosLista) {
  if (!dadosLista || dadosLista.length === 0) {
    logger.warn("Nenhum dado para salvar no banco.");
    return;
  }

  logger.info("Iniciando inserção no banco de dados...");

  let inseridos = 0;
  let erros = 0;

  for (const item of dadosLista) {
    const query = `
      INSERT INTO produtos (
        data_hora, site, modelo_busca, titulo, preco, 
        processador, ram, armazenamento, gpu, tela, link
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (link) DO UPDATE SET 
        preco = EXCLUDED.preco, 
        data_hora = EXCLUDED.data_hora
      RETURNING id;
    `;
    
    // O "ON CONFLICT (link) DO UPDATE..." é mágico:
    // Se o link já existe, ele só atualiza o preço e a data.
    // Se não existe, ele cria um novo.

    const values = [
      item.data_hora,
      item.site,
      item.modelo_busca,
      item.titulo,
      item.preco,
      item.processador,
      item.ram,
      item.armazenamento,
      item.gpu,
      item.tela,
      item.link
    ];

    try {
      await db.query(query, values);
      inseridos++;
    } catch (error) {
      logger.error(`Erro ao inserir item "${item.titulo.substring(0, 20)}...": ${error.message}`);
      erros++;
    }
  }

  logger.info(`Processo de banco finalizado. Inseridos/Atualizados: ${inseridos}. Falhas: ${erros}.`);
}

// --- (Função antiga salvaCsv pode ficar aqui se quiser manter compatibilidade) ---
export async function salvaCsv(dadosLista, filepath) {
    // ... (Código anterior do salvaCsv) ...
    // Copie do seu arquivo original se quiser manter o CSV também
     if (!dadosLista || dadosLista.length === 0) return;
     
      const fieldnames = ["data_hora", "site", "modelo_busca", "titulo", "preco", "processador", "ram", "armazenamento", "gpu", "tela", "link"];
      const header = fieldnames.map((f) => ({ id: f, title: f }));
      const fileExists = fs.existsSync(filepath);
    
      try {
        const csvWriter = createObjectCsvWriter({
          path: filepath,
          header: header,
          append: fileExists,
          fieldDelimiter: ";",
        });
    
        const records = dadosLista.map((linha) => {
          const record = {};
          for (const key of fieldnames) record[key] = linha[key] || "N/A";
          return record;
        });
    
        await csvWriter.writeRecords(records);
        logger.info(`Backup CSV atualizado: ${dadosLista.length} linhas.`);
      } catch (error) {
        logger.error(`Erro CSV: ${error.message}`);
      }
}