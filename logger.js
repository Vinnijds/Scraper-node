/*
 * logger.js
 * Configura o logger (Winston) para registrar em um arquivo e no console.
 * (Equivalente ao seu setup de 'logging' em Python)
 */

import winston from "winston";

// Define o formato do log
const logFormat = winston.format.printf(({ level, message, timestamp }) => {
  return `${timestamp} [${level.toUpperCase()}]: ${message}`;
});

// Cria o logger
const logger = winston.createLogger({
  level: "info", // Nível mínimo de log
  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    logFormat
  ),
  transports: [
    // 1. Salva logs no arquivo 'monitor.log'
    new winston.transports.File({ filename: "monitor.log" }),
    // 2. Mostra logs no console
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(), // Adiciona cores
        winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
        logFormat
      ),
    }),
  ],
});

// Exporta o logger configurado para ser usado em outros arquivos
export default logger;
