/*
 * Módulo com todas as funções de scraping.
 * Cada função é responsável por um site específico.
 */

import axios from "axios";
import * as cheerio from "cheerio";

// --- Funções Auxiliares ---

/**
 * Função auxiliar para fazer requisições e tratar erros.
 * Usa axios para baixar o HTML e cheerio para parseá-lo.
 * @param {string} url - A URL para fazer o request.
 * @param {object} headers - Objeto de headers.
 * @returns {cheerio.Root | null} - Retorna o objeto Cheerio ($) ou null se falhar.
 */
async function getSoup(url, headers) {
  try {
    // 1. Faz a requisição com axios (equiv. a requests.get)
    // 'await' pausa a função até a requisição terminar.
    const response = await axios.get(url, {
      headers: headers,
      timeout: 15000, // timeout em milissegundos
    });

    // 2. axios já faz 'raise_for_status()' por padrão.
    // Se der erro 4xx/5xx, ele vai direto para o 'catch'.

    // 3. Carrega o HTML no Cheerio (equiv. a BeautifulSoup(r.text, "lxml"))
    return cheerio.load(response.data);
  } catch (error) {
    // 'requests.exceptions.RequestException' vira um 'catch' genérico.
    // Usamos console.warn para logs de aviso (equiv. a logging.warning)
    console.warn(`[Erro] Falha ao acessar ${url}: ${error.message}`);
    return null;
  }
}

// --- Scrapers por Site (COM SELETORES TRADUZIDOS) ---

/**
 * Busca na Amazon.
 * @param {string} query - Termo de busca (ex: "asus vivobook 15")
 * @param {string} baseUrl - URL base (ex: "https://www.amazon.com.br")
 * @param {object} headers - Objeto de headers.
 * @param {number} numPagina - O número da página.
 * @returns {Promise<Array<object>>} - Uma promessa que resolve para a lista de resultados.
 */
async function buscaAmazon(query, baseUrl, headers, numPagina = 1) {
  const results = [];
  // 'quote_plus(query)' vira 'query.replace(/ /g, "+")'
  const q = query.replace(/ /g, "+");
  const url = `${baseUrl}/s?k=${q}&page=${numPagina}`;

  // 'soup = get_soup(...)' vira 'const $ = await getSoup(...)'
  // Usamos '$' por convenção do Cheerio/jQuery
  const $ = await getSoup(url, headers);

  // 'if not soup:' vira 'if (!$)'
  if (!$) {
    return results;
  }

  // 'soup.select(...)' vira '$(...)'
  const items = $('div[cel_widget_id^="MAIN-SEARCH_RESULTS-"]');

  // logging.info vira console.log
  console.log(`[Amazon] Seletor principal encontrou ${items.length} itens.`);

  // Loop 'for it in items[:5]:' vira 'items.slice(0, 5).each(...)'
  items.slice(0, 5).each((index, element) => {
    // 'it' (elemento) precisa ser encapsulado pelo cheerio: const it = $(element)
    const it = $(element);

    // 'it.select_one(...)' vira 'it.find(...).first()'
    const titleTag = it.find("h2.a-size-base-plus").first();
    // '.get_text(strip=True)' vira '.text().trim()'
    // 'if title_tag else "N/A"' vira 'titleTag.length ? ... : "N/A"'
    const title = titleTag.length ? titleTag.text().trim() : "N/A";

    const linkTag = it.find("a.a-link-normal.s-line-clamp-4").first();
    // 'link_tag["href"]' vira 'linkTag.attr("href")'
    const href = linkTag.length ? linkTag.attr("href") : null;
    const link = href ? "https://www.amazon.com.br" + href : "N/A";

    // Lógica de preço (tradução direta)
    let price;
    const priceWholeNode = it.find(".a-price-whole").first();
    const priceFractionNode = it.find(".a-price-fraction").first();

    if (priceWholeNode.length) {
      price = priceWholeNode.text().trim();
      if (priceFractionNode.length) {
        const fraction = priceFractionNode.text().trim();
        if (price.endsWith(",")) {
          price += fraction;
        } else {
          price += "," + fraction;
        }
      }
      price = "R$ " + price;
    } else {
      // Fallback
      const priceSpan = it.find(".a-offscreen").first();
      price = priceSpan.length ? priceSpan.text().trim() : "N/A";
    }

    // Filtro para ignorar "Flat para" e outros acessórios
    if (![title, link, price].includes("N/A") && !title.includes("Flat para")) {
      // 'results.append(...)' vira 'results.push(...)'
      results.push({
        site: "Amazon",
        query: query,
        title: title,
        price: price,
        link: link,
      });
    }
  });

  return results;
}

/**
 * Busca no MercadoLivre.
 */
async function buscaMercadoLivre(query, baseUrl, headers, numPagina = 1) {
  const results = [];
  // 'quote_plus(query).replace("+", "-")' vira 'query.replace(/ /g, "-")'
  const q = query.replace(/ /g, "-");
  const offset = 1 + (numPagina - 1) * 50;
  const url = `${baseUrl}/${q}_Desde_${offset}`;

  const $ = await getSoup(url, headers);
  if (!$) {
    return results;
  }

  // 'soup.select(...)' vira '$(...)'
  const items = $("div.andes-card.poly-card");
  console.log(
    `[MercadoLivre] Seletor principal encontrou ${items.length} itens.`
  );

  items.slice(0, 5).each((index, element) => {
    const it = $(element);

    const titleTag = it.find("a.poly-component__title").first();
    const title = titleTag.length ? titleTag.text().trim() : "N/A";
    const link = titleTag.length ? titleTag.attr("href") : "N/A";

    // Lógica de preço
    const symbolTag = it
      .find("span.andes-money-amount__currency-symbol")
      .first();
    const fractionTag = it.find("span.andes-money-amount__fraction").first();

    let price;
    if (symbolTag.length && fractionTag.length) {
      price = `${symbolTag.text().trim()} ${fractionTag.text().trim()}`;
    } else {
      price = "N/A";
    }

    if (![title, link, price].includes("N/A")) {
      results.push({
        site: "MercadoLivre",
        query: query,
        title: title,
        price: price,
        link: link,
      });
    }
  });

  return results;
}

// Mapeamento de funções (agora exportado)
// Note que trocamos os nomes para o padrão 'camelCase' (buscaAmazon)
export const SCRAPER_FUNCTIONS = {
  amazon: buscaAmazon,
  mercadolivre: buscaMercadoLivre,
};
