
import { GoogleGenAI, Type } from "@google/genai";
import { BasketItem } from '../types';

/**
 * Uses Google Gemini AI to suggest a portfolio basket based on a thematic prompt.
 */
export const suggestBasket = async (theme: string): Promise<BasketItem[]> => {
  // Always initialize GoogleGenAI with a named parameter
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Provide a diversified portfolio of 5 to 10 Indian stocks (listed on NSE) for the theme: "${theme}". 
      Return the tickers (NSE symbols like RELIANCE, INFY, TATASTEEL) and their percentage weights summing to exactly 100.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              ticker: {
                type: Type.STRING,
                description: 'The NSE ticker symbol of the stock.',
              },
              weight: {
                type: Type.NUMBER,
                description: 'The percentage weight allocated to this stock (0-100).',
              },
            },
            propertyOrdering: ["ticker", "weight"],
          },
        },
      },
    });

    // Directly access the text property as per guidelines
    const jsonStr = response.text?.trim() || "[]";
    let items = JSON.parse(jsonStr) as BasketItem[];

    // Ensure weights sum to exactly 100 for simulation accuracy
    const totalWeight = items.reduce((sum, item) => sum + (item.weight || 0), 0);
    if (totalWeight > 0 && Math.abs(totalWeight - 100) > 0.1) {
      items = items.map(item => ({
        ...item,
        weight: (item.weight / totalWeight) * 100
      }));
    }

    return items;
  } catch (error) {
    console.error("Gemini Suggestion Failure:", error);
    // Fallback to a safe default list if API fails
    return [
      { ticker: 'RELIANCE', weight: 40 },
      { ticker: 'TATASTEEL', weight: 30 },
      { ticker: 'HDFCBANK', weight: 30 }
    ];
  }
};
