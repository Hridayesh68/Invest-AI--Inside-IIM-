const YahooFinanceClass = require('yahoo-finance2').default;
const yahooFinance = new YahooFinanceClass({ suppressNotices: ['yahooSurvey'] });



/**
 * Fetches comprehensive financial data for a company from Yahoo Finance.
 * @param {string} ticker - Stock ticker symbol (e.g., 'AAPL', 'TSLA')
 * @returns {object} Financial data object
 */
async function fetchFinancialData(ticker) {
  try {
    const [quote, summaryDetail, financialData, defaultKeyStatistics] = await Promise.allSettled([
      yahooFinance.quote(ticker),
      yahooFinance.quoteSummary(ticker, { modules: ['summaryDetail'] }),
      yahooFinance.quoteSummary(ticker, { modules: ['financialData'] }),
      yahooFinance.quoteSummary(ticker, { modules: ['defaultKeyStatistics'] }),
    ]);

    const quoteData = quote.status === 'fulfilled' ? quote.value : {};
    const summary = summaryDetail.status === 'fulfilled' ? summaryDetail.value.summaryDetail : {};
    const finData = financialData.status === 'fulfilled' ? financialData.value.financialData : {};
    const keyStats = defaultKeyStatistics.status === 'fulfilled' ? defaultKeyStatistics.value.defaultKeyStatistics : {};

    return {
      ticker,
      companyName: quoteData.longName || quoteData.shortName || ticker,
      currentPrice: quoteData.regularMarketPrice,
      currency: quoteData.currency,
      marketCap: quoteData.marketCap,
      marketCapFormatted: formatMarketCap(quoteData.marketCap),
      exchange: quoteData.fullExchangeName,
      sector: quoteData.sector,
      industry: quoteData.industry,

      // Valuation
      peRatio: quoteData.trailingPE || summary?.trailingPE,
      forwardPE: quoteData.forwardPE || summary?.forwardPE,
      priceToBook: keyStats?.priceToBook,
      priceToSales: keyStats?.priceToSalesTrailing12Months,
      enterpriseValue: keyStats?.enterpriseValue,
      evToRevenue: keyStats?.enterpriseToRevenue,
      evToEbitda: keyStats?.enterpriseToEbitda,

      // Performance
      fiftyTwoWeekHigh: quoteData.fiftyTwoWeekHigh,
      fiftyTwoWeekLow: quoteData.fiftyTwoWeekLow,
      fiftyDayAverage: quoteData.fiftyDayAverage,
      twoHundredDayAverage: quoteData.twoHundredDayAverage,
      ytdReturn: quoteData.ytdReturn,
      beta: summary?.beta || keyStats?.beta,

      // Profitability
      revenueGrowth: finData?.revenueGrowth,
      grossMargins: finData?.grossMargins,
      operatingMargins: finData?.operatingMargins,
      profitMargins: finData?.profitMargins,
      returnOnEquity: finData?.returnOnEquity,
      returnOnAssets: finData?.returnOnAssets,

      // Financial Health
      totalRevenue: finData?.totalRevenue,
      totalDebt: finData?.totalDebt,
      totalCash: finData?.totalCash,
      debtToEquity: finData?.debtToEquity,
      currentRatio: finData?.currentRatio,
      quickRatio: finData?.quickRatio,
      freeCashflow: finData?.freeCashflow,

      // Dividends
      dividendYield: summary?.dividendYield,
      payoutRatio: summary?.payoutRatio,

      // EPS
      trailingEPS: quoteData.epsTrailingTwelveMonths,
      forwardEPS: quoteData.epsForward,

      // Analyst ratings
      recommendationMean: finData?.recommendationMean,
      recommendationKey: finData?.recommendationKey,
      numberOfAnalystOpinions: finData?.numberOfAnalystOpinions,
      targetHighPrice: finData?.targetHighPrice,
      targetLowPrice: finData?.targetLowPrice,
      targetMeanPrice: finData?.targetMeanPrice,
    };
  } catch (error) {
    console.error(`[financialData] Error fetching data for ${ticker}:`, error.message);
    return { ticker, error: error.message, companyName: ticker };
  }
}

/**
 * Searches for a ticker symbol given a company name.
 * @param {string} companyName
 * @returns {string|null} ticker symbol
 */
async function findTicker(companyName) {
  try {
    // Direct validation if input matches ticker pattern (e.g., ETERNAL.NS)
    if (/^[A-Z0-9.\-]+$/i.test(companyName.trim())) {
      try {
        const quote = await yahooFinance.quote(companyName.trim().toUpperCase());
        if (quote && quote.symbol) {
          return quote.symbol;
        }
      } catch (_) {}
    }

    const results = await yahooFinance.search(companyName, { quotesCount: 5 });
    if (results.quotes && results.quotes.length > 0) {
      // Look for equities first
      const equity = results.quotes.find(q => q.quoteType === 'EQUITY' && q.symbol);
      if (equity) return equity.symbol;

      const withSymbol = results.quotes.find(q => q.symbol);
      if (withSymbol) return withSymbol.symbol;
    }
    return null;
  } catch (error) {
    console.error(`[financialData] Ticker search failed for "${companyName}":`, error.message);
    return null;
  }
}

function formatMarketCap(value) {
  if (!value) return 'N/A';
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  return `$${value.toLocaleString()}`;
}

module.exports = { fetchFinancialData, findTicker };
