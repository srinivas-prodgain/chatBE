import { LanguageModelV1 } from "ai";
import { mistral_model, openai_model, openrouter_model } from "../services/ai";
import { TModelType } from "../types/shared";

type TSwitchModelsArgs = {
    model: TModelType;
}

export const switch_models = ({ model }: TSwitchModelsArgs): LanguageModelV1 => {
    let selected_model: LanguageModelV1;

    switch (model) {
        case 'mistral':
            selected_model = mistral_model;
            break;
        case 'openrouter':
            selected_model = openrouter_model as unknown as LanguageModelV1
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
    console.log("selected_model", selected_model);

    return selected_model;
}