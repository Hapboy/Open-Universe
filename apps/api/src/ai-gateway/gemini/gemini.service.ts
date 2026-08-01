import { Injectable } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';
import type { PersonGeneration, SafetyFilterLevel } from '@google/genai';

// Ported near-verbatim from apps/web/src/core/services/gemini.ts (Phase G.5,
// see docs/backend-bootstrap.md) - same method bodies, same model defaults,
// same Developer-API-only field omissions. The only difference: the key is
// injected by the controller (read via ConfigService) instead of read from
// process.env directly here.

export interface GeminiModelInfo {
  id: string;
  displayName?: string;
}

// This app only ever creates GoogleGenAI({ apiKey }) - the Gemini Developer
// API, not Vertex AI's "Enterprise" mode. Several GenerateImages/GenerateVideos
// config fields are Vertex-only and throw client-side or server-side (400) in
// Developer API mode: for Imagen that's negativePrompt/seed/enhancePrompt/
// addWatermark/language, for Veo it's seed/generateAudio. They're
// intentionally omitted from these option types.
export interface ImagenOptions {
  aspectRatio: string;
  model: string;
  resolution: string;
  numberOfImages?: number;
  personGeneration?: string;
  safetyFilterLevel?: string;
  outputMimeType?: string;
  outputCompressionQuality?: number;
  guidanceScale?: number;
}

export interface VeoOptions {
  model: string;
  aspectRatio: string;
  resolution: string;
  durationSeconds?: number;
  negativePrompt?: string;
  personGeneration?: string;
  enhancePrompt?: boolean;
}

export interface NanoBananaOptions {
  model: string;
  aspectRatio?: string;
  imageSize?: string;
  seed?: number;
}

export interface LyriaOptions {
  model: string;
  seed?: number;
}

export type ImagenResult =
  { ok: true; dataUrl: string } | { ok: false; reason?: string };

const DEFAULT_MODEL = 'gemini-flash-latest';

function ai(key: string) {
  return new GoogleGenAI({ apiKey: key });
}

@Injectable()
export class GeminiService {
  async listModels(key: string): Promise<GeminiModelInfo[]> {
    const pager = await ai(key).models.list({ config: { pageSize: 100 } });
    const models: GeminiModelInfo[] = [];
    for await (const m of pager) {
      if (!m.name || !m.supportedActions?.includes('generateContent')) continue;
      models.push({
        id: m.name.replace(/^models\//, ''),
        displayName: m.displayName,
      });
    }
    return models;
  }

  async runText(
    prompt: string,
    key: string,
    model: string = DEFAULT_MODEL,
  ): Promise<string | null> {
    const res = await ai(key).models.generateContent({
      model: model || DEFAULT_MODEL,
      contents: prompt,
    });
    return res.text ?? null;
  }

  async runVision(
    imageBase64: string,
    query: string,
    key: string,
    model: string = DEFAULT_MODEL,
  ): Promise<string | null> {
    const res = await ai(key).models.generateContent({
      model: model || DEFAULT_MODEL,
      contents: [
        {
          role: 'user',
          parts: [
            { text: query },
            { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } },
          ],
        },
      ],
    });
    return res.text ?? null;
  }

  async runImagen(
    prompt: string,
    options: ImagenOptions,
    key: string,
  ): Promise<ImagenResult> {
    const model = options.model || 'imagen-4.0-generate-001';
    // Imagen 4 Fast has a fixed output size and rejects imageSize outright
    // ("sampleImageSize is not adjustable") - only Standard/Ultra support it.
    const supportsImageSize = model !== 'imagen-4.0-fast-generate-001';
    const res = await ai(key).models.generateImages({
      model,
      prompt,
      config: {
        numberOfImages: options.numberOfImages ?? 1,
        aspectRatio: options.aspectRatio,
        imageSize: supportsImageSize ? options.resolution : undefined,
        personGeneration: options.personGeneration as PersonGeneration,
        safetyFilterLevel: options.safetyFilterLevel as SafetyFilterLevel,
        outputMimeType: options.outputMimeType,
        outputCompressionQuality:
          options.outputMimeType === 'image/jpeg'
            ? options.outputCompressionQuality
            : undefined,
        guidanceScale: options.guidanceScale,
        includeRaiReason: true,
      },
    });
    const first = res.generatedImages?.[0];
    const bytes = first?.image?.imageBytes;
    if (!bytes) {
      // Imagen's child-safety/RAI policy can silently drop the image and
      // still return HTTP 200 - indistinguishable from a real failure unless
      // includeRaiReason is set and surfaced here.
      return { ok: false, reason: first?.raiFilteredReason };
    }
    return { ok: true, dataUrl: `data:image/png;base64,${bytes}` };
  }

  async runVeo(
    prompt: string,
    imageBase64: string | null,
    options: VeoOptions,
    key: string,
  ): Promise<string> {
    const client = ai(key);
    const image = imageBase64
      ? { imageBytes: imageBase64, mimeType: 'image/jpeg' }
      : undefined;
    const resolution = options.resolution ?? '720p';
    // 1080p/4k generations must be exactly 8s across every veo-3.1-*-preview
    // model - clamp rather than let the API reject a shorter duration picked
    // at 720p.
    const durationSeconds =
      resolution !== '720p' ? 8 : (options.durationSeconds ?? 8);
    let operation = await client.models.generateVideos({
      model: options.model || 'veo-3.1-generate-preview',
      prompt,
      image,
      config: {
        numberOfVideos: 1,
        aspectRatio: options.aspectRatio,
        resolution,
        durationSeconds,
        negativePrompt: options.negativePrompt || undefined,
      },
    });
    // No progress fraction from the API - poll every 10s, capped at 5 min.
    // This runs inside a BullMQ worker now, not a blocking HTTP request, so
    // the 5-minute cap is just a sane upper bound, not a serverless timeout
    // workaround anymore.
    for (let i = 0; i < 30 && !operation.done; i++) {
      await new Promise((resolve) => setTimeout(resolve, 10000));
      operation = await client.operations.getVideosOperation({ operation });
    }
    const video = operation.response?.generatedVideos?.[0]?.video;
    if (!video) throw new Error('no video in response');
    if (video.videoBytes)
      return `data:${video.mimeType ?? 'video/mp4'};base64,${video.videoBytes}`;
    if (video.uri) {
      const sep = video.uri.includes('?') ? '&' : '?';
      const res = await fetch(`${video.uri}${sep}key=${key}`);
      if (!res.ok) throw new Error(`video download HTTP ${res.status}`);
      const buf = await res.arrayBuffer();
      const base64 = Buffer.from(buf).toString('base64');
      return `data:${video.mimeType ?? 'video/mp4'};base64,${base64}`;
    }
    throw new Error('no video uri or bytes');
  }

  async runNanoBanana(
    prompt: string,
    imageBase64List: string[],
    options: NanoBananaOptions,
    key: string,
  ): Promise<string> {
    const contents = imageBase64List.length
      ? [
          {
            role: 'user',
            parts: [
              { text: prompt },
              ...imageBase64List.map((data) => ({
                inlineData: { mimeType: 'image/jpeg', data },
              })),
            ],
          },
        ]
      : prompt;
    const res = await ai(key).models.generateContent({
      model: options.model || 'gemini-3.1-flash-image',
      contents,
      config: {
        responseModalities: ['IMAGE'],
        imageConfig: {
          aspectRatio: options.aspectRatio,
          imageSize: options.imageSize,
        },
        seed: options.seed,
      },
    });
    const part = res.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
    if (!part?.inlineData?.data) throw new Error('no image in response');
    return `data:${part.inlineData.mimeType ?? 'image/png'};base64,${part.inlineData.data}`;
  }

  async runLyria(
    prompt: string,
    options: LyriaOptions,
    key: string,
  ): Promise<string> {
    const res = await ai(key).models.generateContent({
      model: options.model || 'lyria-3-clip-preview',
      contents: prompt,
      config: { responseModalities: ['AUDIO'], seed: options.seed },
    });
    const part = res.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
    if (!part?.inlineData?.data) throw new Error('no audio in response');
    return `data:${part.inlineData.mimeType ?? 'audio/mpeg'};base64,${part.inlineData.data}`;
  }
}
