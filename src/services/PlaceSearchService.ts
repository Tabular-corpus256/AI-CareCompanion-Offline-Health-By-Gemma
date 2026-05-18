import { GEMINI_API_KEY } from '@env';

const BASE = 'https://generativelanguage.googleapis.com/v1beta';
// Maps grounding requires Gemini 2.5+; use gemini-2.5-flash or gemini-2.5-flash-preview-05-20
const SEARCH_MODEL = 'gemini-2.5-flash';

export interface NearbyPlace {
  name: string;
  address: string;
  phone?: string;
  rating?: number;
  distance?: string;
  openNow?: boolean;
  types?: string;
  lat?: number;
  lng?: number;
  mapsUri?: string;  // from Maps grounding chunk
  placeId?: string;  // from Maps grounding chunk
}

interface SearchParams {
  query: string;
  lat: number;
  lng: number;
  radius?: number; // metres, default 5000
}

export async function searchNearby(params: SearchParams): Promise<NearbyPlace[]> {
  const { query, lat, lng, radius = 5000 } = params;

  const prompt =
    `Find ${query} near latitude ${lat}, longitude ${lng} within ${(radius / 1000).toFixed(1)} km. ` +
    `List up to 8 real results as a JSON array. Each object must have: ` +
    `name (string), address (string), phone (string), rating (number 1–5), ` +
    `distance (string like "1.2 km"), openNow (boolean), lat (number), lng (number). ` +
    `Respond with ONLY the raw JSON array — no markdown, no explanation.`;

  const res = await fetch(
    `${BASE}/models/${SEARCH_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 3000 },
        // Maps grounding — provides real-world place data and map URIs
        tools: [{ googleMaps: {} }],
        toolConfig: {
          retrievalConfig: {
            latLng: { latitude: lat, longitude: lng },
          },
        },
      }),
    },
  );

  const data = await res.json();
  if (data.error) throw new Error(data.error.message);

  const text: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  const groundingChunks: any[] = data.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];

  // Collect map URIs from grounding chunks (indexed + by-name for matching)
  const orderedChunks: { title: string; uri: string; placeId: string }[] = [];
  const chunkByTitle: Record<string, { uri: string; placeId: string }> = {};
  for (const chunk of groundingChunks) {
    if (chunk.maps) {
      const entry = {
        title: chunk.maps.title ?? '',
        uri: chunk.maps.uri ?? '',
        placeId: chunk.maps.placeId ?? '',
      };
      orderedChunks.push(entry);
      chunkByTitle[(entry.title).toLowerCase()] = entry;
    }
  }

  // Try to parse the structured JSON the model returned
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]) as NearbyPlace[];
      return parsed.slice(0, 10).map((place, i) => {
        // Prefer name-based match, fall back to positional
        const byName = chunkByTitle[(place.name ?? '').toLowerCase()];
        const chunk = byName ?? orderedChunks[i];
        return { ...place, mapsUri: chunk?.uri, placeId: chunk?.placeId };
      });
    } catch { /* fall through */ }
  }

  // Fallback: surface whatever grounding chunks we received
  if (orderedChunks.length > 0) {
    return orderedChunks.map(c => ({
      name: c.title,
      address: '',
      mapsUri: c.uri,
      placeId: c.placeId,
    }));
  }

  return [];
}

export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}
