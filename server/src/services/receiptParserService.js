const { GoogleGenerativeAI } = require('@google/generative-ai');

/**
 * Intelligent Rule-based Extraction from Receipt Text
 */
function parseReceiptWithHeuristics(rawText, userPreferredCurrency = 'MAD') {
  const lines = rawText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  let merchant = '';
  let date = null;
  let totalAmount = 0;
  let currency = userPreferredCurrency;
  let suggestedCategoryName = 'Groceries';
  let confidence = 0.5;

  if (lines.length > 0) {
    // 1. Merchant Detection: usually in the first 3-4 lines
    for (let i = 0; i < Math.min(lines.length, 5); i++) {
      const line = lines[i];
      // Skip lines that look like numbers, dates, or headers
      if (!/\b(receipt|ticket|facture|bon|date|tel|fax|ice|rc|if)\b/i.test(line) && line.length > 2) {
        merchant = line.replace(/[^a-zA-Z0-9\s&'.-]/g, '').trim();
        if (merchant.length >= 3) break;
      }
    }
  }

  // 2. Date Detection
  // Common patterns: DD/MM/YYYY, YYYY-MM-DD, DD-MM-YYYY, DD.MM.YYYY, YYYY/MM/DD
  const dateRegex = /\b(\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4}|\d{4}[\/\.-]\d{1,2}[\/\.-]\d{1,2})\b/;
  for (const line of lines) {
    const match = line.match(dateRegex);
    if (match) {
      const parts = match[1].split(/[\/\.-]/);
      let parsedDate = null;
      if (parts[0].length === 4) {
        // YYYY-MM-DD
        parsedDate = new Date(`${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`);
      } else if (parts[2].length === 4 || parts[2].length === 2) {
        // DD/MM/YYYY
        const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
        parsedDate = new Date(`${year}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`);
      }
      if (parsedDate && !isNaN(parsedDate.getTime())) {
        date = parsedDate;
        break;
      }
    }
  }

  // 3. Currency Detection
  const upperText = rawText.toUpperCase();
  if (upperText.includes('MAD') || upperText.includes('DH') || upperText.includes('DHS')) {
    currency = 'MAD';
  } else if (upperText.includes('EUR') || upperText.includes('€')) {
    currency = 'EUR';
  } else if (upperText.includes('USD') || upperText.includes('$')) {
    currency = 'USD';
  } else if (upperText.includes('GBP') || upperText.includes('£')) {
    currency = 'GBP';
  }

  // 4. Total Amount Detection
  // Search for lines containing TOTAL, NET A PAYER, MONTANT, AMOUNT, PRIX TOTAL, TTC
  const totalKeywords = /(total\s*ttc|net\s*a\s*payer|montant\s*total|total|montant|amount|somme|payer)/i;
  const numberRegex = /([0-9]+[.,][0-9]{2})/g;

  let candidates = [];
  for (const line of lines) {
    if (totalKeywords.test(line)) {
      const matches = line.match(numberRegex);
      if (matches) {
        matches.forEach((m) => {
          const val = parseFloat(m.replace(',', '.'));
          if (!isNaN(val) && val > 0) {
            candidates.push(val);
          }
        });
      }
    }
  }

  if (candidates.length > 0) {
    // Total is usually the highest number matching the total line
    totalAmount = Math.max(...candidates);
    confidence = 0.85;
  } else {
    // Fallback: look for all numbers with 2 decimals and pick maximum plausible
    const allMatches = rawText.match(numberRegex);
    if (allMatches) {
      const numbers = allMatches
        .map((n) => parseFloat(n.replace(',', '.')))
        .filter((n) => !isNaN(n) && n > 0 && n < 100000);
      if (numbers.length > 0) {
        totalAmount = Math.max(...numbers);
        confidence = 0.6;
      }
    }
  }

  // 5. Category Suggestion based on merchant or keywords in text
  const textLower = rawText.toLowerCase();
  if (
    /marjane|carrefour|bim|acima|supermarket|epicerie|grocer|market|supermarche|hypermarche|aliments|milk|lait|pain|fruits|legumes|food/i.test(
      textLower
    )
  ) {
    suggestedCategoryName = 'Groceries';
  } else if (/shell|total|afriquia|ola|winxo|petrol|gas|essence|diesel|uber|careem|taxi|tramway|train|oncf/i.test(textLower)) {
    suggestedCategoryName = 'Transportation';
  } else if (/restaurant|cafe|coffee|starbucks|mcdonald|kfc|burger|pizza|snack|boulangerie|patisserie|traiteur/i.test(textLower)) {
    suggestedCategoryName = 'Dining';
  } else if (/pharmacie|pharmacy|clinique|hopital|doctor|medecin|parapharmacie|sante|labo/i.test(textLower)) {
    suggestedCategoryName = 'Healthcare';
  } else if (/zara|hm|bershka|pull&bear|mango|celio|decathlon|marwa|boutique|vetement|shoes|chaussures/i.test(textLower)) {
    suggestedCategoryName = 'Shopping';
  } else if (/lydec|redal|amendis|onee|iam|maroc telecom|orange|inwi|internet|electricite|eau|facture/i.test(textLower)) {
    suggestedCategoryName = 'Utilities';
  } else if (/cinema|megarama|theatre|concert|netflix|spotify|bowling|gaming|divertissement/i.test(textLower)) {
    suggestedCategoryName = 'Entertainment';
  } else if (/loyer|rent|syndic|meuble|ikea|bricoma|mr bricolage/i.test(textLower)) {
    suggestedCategoryName = 'Housing';
  }

  return {
    merchant: merchant || 'Unknown Merchant',
    date: date || new Date(),
    totalAmount: Math.round(totalAmount * 100) / 100,
    currency,
    suggestedCategoryName,
    confidence
  };
}

/**
 * AI-assisted Receipt Parsing using Gemini if available, with heuristic fallback
 */
async function parseReceiptText(rawText, userPreferredCurrency = 'MAD', availableCategories = []) {
  // If Gemini API key is configured, attempt LLM extraction
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== '') {
    try {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

      const categoryNames = availableCategories.map((c) => c.name).join(', ');

      const prompt = `You are a financial receipt parser. Analyze the following OCR raw text from a shopping receipt:
"""
${rawText}
"""

Available expense categories: [${categoryNames || 'Groceries, Transportation, Housing, Entertainment, Shopping, Healthcare, Dining, Utilities, Other Expense'}]
User preferred currency: ${userPreferredCurrency}

Extract and return ONLY a valid JSON object with these exact keys:
{
  "merchant": "Merchant or store name",
  "date": "YYYY-MM-DD" or null if cannot determine,
  "totalAmount": numeric total amount paid (number, not string),
  "currency": "MAD", "USD", "EUR", etc.,
  "suggestedCategoryName": "One of the available categories",
  "confidence": number between 0 and 1
}
Do NOT include markdown formatting or backticks around the JSON.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      let text = response.text().trim();
      text = text.replace(/```json/gi, '').replace(/```/g, '').trim();

      const parsed = JSON.parse(text);

      return {
        merchant: parsed.merchant || 'Store / Merchant',
        date: parsed.date ? new Date(parsed.date) : new Date(),
        totalAmount: Number(parsed.totalAmount) || 0,
        currency: parsed.currency || userPreferredCurrency,
        suggestedCategoryName: parsed.suggestedCategoryName || 'Groceries',
        confidence: Number(parsed.confidence) || 0.9
      };
    } catch (llmError) {
      console.warn('Gemini receipt extraction failed, falling back to heuristic parser:', llmError.message);
    }
  }

  // Fallback to intelligent rule-based parser
  return parseReceiptWithHeuristics(rawText, userPreferredCurrency);
}

module.exports = {
  parseReceiptWithHeuristics,
  parseReceiptText
};
