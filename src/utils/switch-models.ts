import { LanguageModel } from "ai";
import { mistral_model, openai_model } from "../services/ai";
import { TModelType } from "../types/shared";

type TSwitchModelsArgs = {
    model: TModelType;
}

export const switch_models = ({ model }: TSwitchModelsArgs): LanguageModel => {
    let selected_model: LanguageModel;

    switch (model) {
        case 'mistral':
            selected_model = mistral_model;
            break;
        case 'gemini':
            // Gemini is disabled for now, fallback to OpenAI
            console.log('Gemini requested but disabled, falling back to OpenAI');
            selected_model = openai_model;
            break;
        case 'openai':
        default:
            selected_model = openai_model;
            break;
    }

    return selected_model;
}