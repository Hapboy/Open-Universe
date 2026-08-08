import type { z } from "zod";
import type { NodeType } from "@hayverse/shared";
import { geminiTextParamsSchema, geminiTextDefaults } from "@/schemas/gemini/geminiText.schema.ts";
import {
    geminiVisionParamsSchema,
    geminiVisionDefaults,
} from "@/schemas/gemini/geminiVision.schema.ts";
import {
    geminiImagenParamsSchema,
    geminiImagenDefaults,
} from "@/schemas/gemini/geminiImagen.schema.ts";
import { geminiVeoParamsSchema, geminiVeoDefaults } from "@/schemas/gemini/geminiVeo.schema.ts";
import {
    geminiNanoBananaParamsSchema,
    geminiNanoBananaDefaults,
} from "@/schemas/gemini/geminiNanoBanana.schema.ts";
import {
    geminiLyriaParamsSchema,
    geminiLyriaDefaults,
} from "@/schemas/gemini/geminiLyria.schema.ts";

// Mirrors schemas/entities/schemas.ts's ENTITY_PARAM_SCHEMAS/DEFAULTS — single
// lookup covering all 6 Gemini node types, used by GraphContext.tsx's
// templateParams/createNode (defaults) and GeminiParams.tsx (schema, for
// RHF's resolver).
export const GEMINI_PARAM_SCHEMAS: Partial<Record<NodeType, z.ZodObject<z.ZodRawShape>>> = {
    gemini_text: geminiTextParamsSchema,
    gemini_vision: geminiVisionParamsSchema,
    gemini_imagen: geminiImagenParamsSchema,
    gemini_veo: geminiVeoParamsSchema,
    gemini_nanobanana: geminiNanoBananaParamsSchema,
    gemini_lyria: geminiLyriaParamsSchema,
};

export const GEMINI_PARAM_DEFAULTS: Partial<Record<NodeType, Record<string, unknown>>> = {
    gemini_text: geminiTextDefaults,
    gemini_vision: geminiVisionDefaults,
    gemini_imagen: geminiImagenDefaults,
    gemini_veo: geminiVeoDefaults,
    gemini_nanobanana: geminiNanoBananaDefaults,
    gemini_lyria: geminiLyriaDefaults,
};
