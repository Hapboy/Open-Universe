export interface RunSoulRequest {
    prompt: string;
    faceRefUrl: string | null;
}

export interface RunMotionRequest {
    frameUrl: string | null;
    preset: string;
}

export interface RunSpeakRequest {
    avatarUrl: string | null;
    speechText: string;
}
