import { LlmService } from '../services/LlmService';

export interface ModelRecommendation {
  id: string;
  name: string;
  size: string;
  type: 'text' | 'multimodal';
  medical: boolean;
  description: string;
  supportsImage: boolean;
  supportsAudio: boolean;
}

export function getDynamicModelRecommendations(): ModelRecommendation[] {
  return LlmService.getAvailableModels().map(m => ({
    id: m.id,
    name: m.name,
    size: 'cloud',
    type: (m.supportsImage || m.supportsAudio) ? 'multimodal' : 'text',
    medical: m.medical,
    description: m.description,
    supportsImage: m.supportsImage,
    supportsAudio: m.supportsAudio,
  }));
}

export const MODEL_RECOMMENDATIONS: ModelRecommendation[] = [];

export function getModelGuide(): string {
  const models = LlmService.getAvailableModels();
  if (models.length === 0) return 'No models loaded yet.';
  return models.map(
    m => `${m.medical ? '🏥 ' : ''}${m.name}\n  ID: ${m.id}\n  ${m.description}`,
  ).join('\n\n');
}
