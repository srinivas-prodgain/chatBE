import { LanguageModel } from "ai";
import { mistralModel, openaiModel } from "../services/ai";


export const switch_models = (model: string): LanguageModel => {
    let selectedModel: LanguageModel;

    switch (model) {
        case 'mistral':
            selectedModel = mistralModel;
            break;
        case 'gemini':
            // Gemini is disabled for now, fallback to OpenAI
            console.log('Gemini requested but disabled, falling back to OpenAI');
            selectedModel = openaiModel;
            break;
        case 'openai':
        default:
            selectedModel = openaiModel;
            break;
    }

    return selectedModel;
}