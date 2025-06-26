import { pipeline, env, TextGenerationPipeline } from '@xenova/transformers';

// Set the path to the wasm files. This is important for Next.js.
// When using a direct Hugging Face model ID, env.localModelPath is usually not needed.
// env.localModelPath = 'https://huggingface.co/onnx-community/gemma-3n-E2B-it-ONNX/resolve/main/';
env.allowRemoteModels = true;

// Set the Hugging Face API token from environment variables
env.HF_TOKEN = process.env.NEXT_PUBLIC_HF_TOKEN;

let generator: TextGenerationPipeline | null = null; // Cache the pipeline

export async function loadGemmaModel() {
    if (generator === null) {
        console.log("Loading Gemma model...");
        generator = await pipeline(
            'text-generation',
            'Xenova/gemma-2b-it' // Using a model known to be compatible with Transformers.js
        );
        console.log("Gemma model loaded.");
    }
    return generator;
}

export async function generateTextWithGemma(prompt: string, options?: {
    max_new_tokens?: number;
    do_sample?: boolean;
    temperature?: number;
}) {
    const model = await loadGemmaModel();
    const output = await model(prompt, options);
    return output;
}
