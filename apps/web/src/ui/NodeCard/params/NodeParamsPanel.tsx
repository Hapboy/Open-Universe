import { useEffect, useRef } from "react";
import { useUserContext } from "../../../store/contexts/UserContext.tsx";
import type { NodeParamsProps } from "./shared.tsx";
import { PinterestParams } from "./PinterestParams/PinterestParams.tsx";
import { SoulParams, CameraParams, SpeakParams } from "./HiggsFieldParams.tsx";
import {
    GeminiTextParams,
    GeminiVisionParams,
    GeminiImagenParams,
    GeminiVeoParams,
    GeminiNanoBananaParams,
    GeminiLyriaParams,
} from "./GeminiParams.tsx";
import {
    CharacterParams,
    LocationParams,
    MiseEnSceneParams,
    BuildingParams,
    ClothingParams,
    ArtworkParams,
    FurnitureParams,
    MusicParams,
    ScriptParams,
    StoryboardParams,
    TransportParams,
} from "./EntityParams/EntityParams.tsx";
import { OutputParams, TextParams } from "./UtilParams.tsx";
import type {
    CharacterNodeParams,
    LocationNodeParams,
    MiseEnSceneNodeParams,
    BuildingNodeParams,
    ClothingNodeParams,
    ArtworkNodeParams,
    FurnitureNodeParams,
    MusicNodeParams,
    ScriptNodeParams,
    StoryboardNodeParams,
    TransportNodeParams,
} from "../../../types.ts";

export function NodeParamsPanel({
    node,
    edges,
    resolved,
    scenes,
    updateNodeParam,
    updateNodeParams,
    setNodePhotos,
    addImageInput,
    addTextInput,
    loadPinterestBoards,
    loadPinterestPins,
    executeGraph,
}: NodeParamsProps) {
    const { nodeType, params } = node.data;
    const loadedRef = useRef(false);
    const { currentUser, hydrated, pinterestStatus } = useUserContext();
    // Whether we know for sure whether Pinterest is connected (one way or the
    // other) - logged-out is immediately settled (definitely not connected),
    // logged-in waits for pinterestStatus to resolve so this doesn't fire the
    // real fetch's mock fallback before the real answer is in and get stuck
    // showing mock boards to an actually-connected user (loadedRef below only
    // ever fires once).
    const pinterestStatusReady = hydrated && (!currentUser || pinterestStatus !== null);

    useEffect(() => {
        if (nodeType === "pinterest_board" && !loadedRef.current && pinterestStatusReady) {
            loadedRef.current = true;
            void loadPinterestBoards(node);
        }
    }, [node, nodeType, loadPinterestBoards, pinterestStatusReady]);

    return (
        <>
            {nodeType === "pinterest_board" && (
                <PinterestParams
                    node={node}
                    params={params}
                    updateNodeParam={updateNodeParam}
                    loadPinterestPins={loadPinterestPins}
                />
            )}
            {nodeType === "higgsfield_soul" && (
                <SoulParams
                    node={node}
                    params={params}
                    edges={edges}
                    resolved={resolved}
                    updateNodeParam={updateNodeParam}
                    executeGraph={executeGraph}
                />
            )}
            {nodeType === "higgsfield_camera" && (
                <CameraParams
                    node={node}
                    params={params}
                    edges={edges}
                    resolved={resolved}
                    updateNodeParam={updateNodeParam}
                    executeGraph={executeGraph}
                />
            )}
            {nodeType === "higgsfield_speak" && (
                <SpeakParams
                    node={node}
                    params={params}
                    edges={edges}
                    resolved={resolved}
                    updateNodeParam={updateNodeParam}
                    executeGraph={executeGraph}
                />
            )}
            {nodeType === "output_scene" && (
                <OutputParams
                    node={node}
                    params={params}
                    edges={edges}
                    resolved={resolved}
                    scenes={scenes}
                    updateNodeParam={updateNodeParam}
                    executeGraph={executeGraph}
                />
            )}
            {nodeType === "text_prompt" && (
                <TextParams
                    node={node}
                    params={params}
                    edges={edges}
                    resolved={resolved}
                    updateNodeParam={updateNodeParam}
                    executeGraph={executeGraph}
                    addTextInput={addTextInput}
                />
            )}
            {nodeType === "gemini_text" && (
                <GeminiTextParams
                    node={node}
                    params={params}
                    edges={edges}
                    resolved={resolved}
                    updateNodeParam={updateNodeParam}
                    executeGraph={executeGraph}
                />
            )}
            {nodeType === "gemini_vision" && (
                <GeminiVisionParams
                    node={node}
                    params={params}
                    edges={edges}
                    resolved={resolved}
                    updateNodeParam={updateNodeParam}
                    executeGraph={executeGraph}
                />
            )}
            {nodeType === "gemini_imagen" && (
                <GeminiImagenParams
                    node={node}
                    params={params}
                    edges={edges}
                    resolved={resolved}
                    updateNodeParam={updateNodeParam}
                    executeGraph={executeGraph}
                />
            )}
            {nodeType === "gemini_veo" && (
                <GeminiVeoParams
                    node={node}
                    params={params}
                    edges={edges}
                    resolved={resolved}
                    updateNodeParam={updateNodeParam}
                    executeGraph={executeGraph}
                />
            )}
            {nodeType === "gemini_nanobanana" && (
                <GeminiNanoBananaParams
                    node={node}
                    params={params}
                    edges={edges}
                    resolved={resolved}
                    updateNodeParam={updateNodeParam}
                    executeGraph={executeGraph}
                    addImageInput={addImageInput}
                />
            )}
            {nodeType === "gemini_lyria" && (
                <GeminiLyriaParams
                    node={node}
                    params={params}
                    edges={edges}
                    resolved={resolved}
                    updateNodeParam={updateNodeParam}
                    executeGraph={executeGraph}
                />
            )}
            {nodeType === "character" && (
                <CharacterParams
                    node={node}
                    params={params as CharacterNodeParams}
                    updateNodeParam={updateNodeParam}
                    updateNodeParams={updateNodeParams}
                    setNodePhotos={setNodePhotos}
                />
            )}
            {nodeType === "location" && (
                <LocationParams
                    node={node}
                    params={params as LocationNodeParams}
                    updateNodeParam={updateNodeParam}
                    updateNodeParams={updateNodeParams}
                    setNodePhotos={setNodePhotos}
                />
            )}
            {nodeType === "mise_en_scene" && (
                <MiseEnSceneParams
                    node={node}
                    params={params as MiseEnSceneNodeParams}
                    updateNodeParam={updateNodeParam}
                    updateNodeParams={updateNodeParams}
                    setNodePhotos={setNodePhotos}
                />
            )}
            {nodeType === "building" && (
                <BuildingParams
                    node={node}
                    params={params as BuildingNodeParams}
                    updateNodeParam={updateNodeParam}
                    updateNodeParams={updateNodeParams}
                    setNodePhotos={setNodePhotos}
                />
            )}
            {nodeType === "clothing" && (
                <ClothingParams
                    node={node}
                    params={params as ClothingNodeParams}
                    updateNodeParam={updateNodeParam}
                    updateNodeParams={updateNodeParams}
                    setNodePhotos={setNodePhotos}
                />
            )}
            {nodeType === "artwork" && (
                <ArtworkParams
                    node={node}
                    params={params as ArtworkNodeParams}
                    updateNodeParam={updateNodeParam}
                    updateNodeParams={updateNodeParams}
                    setNodePhotos={setNodePhotos}
                />
            )}
            {nodeType === "furniture" && (
                <FurnitureParams
                    node={node}
                    params={params as FurnitureNodeParams}
                    updateNodeParam={updateNodeParam}
                    updateNodeParams={updateNodeParams}
                    setNodePhotos={setNodePhotos}
                />
            )}
            {nodeType === "music" && (
                <MusicParams
                    node={node}
                    params={params as MusicNodeParams}
                    updateNodeParam={updateNodeParam}
                    updateNodeParams={updateNodeParams}
                    setNodePhotos={setNodePhotos}
                />
            )}
            {nodeType === "script" && (
                <ScriptParams
                    node={node}
                    params={params as ScriptNodeParams}
                    updateNodeParam={updateNodeParam}
                    updateNodeParams={updateNodeParams}
                    setNodePhotos={setNodePhotos}
                />
            )}
            {nodeType === "storyboard" && (
                <StoryboardParams
                    node={node}
                    params={params as StoryboardNodeParams}
                    updateNodeParam={updateNodeParam}
                    updateNodeParams={updateNodeParams}
                />
            )}
            {nodeType === "transport" && (
                <TransportParams
                    node={node}
                    params={params as TransportNodeParams}
                    updateNodeParam={updateNodeParam}
                    updateNodeParams={updateNodeParams}
                    setNodePhotos={setNodePhotos}
                />
            )}
        </>
    );
}
