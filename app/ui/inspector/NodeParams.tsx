import { useEffect, useRef } from 'react'
import type { NodeParamsProps } from './shared.tsx'
import { PinterestParams } from './PinterestParams.tsx'
import { SoulParams, CameraParams, SpeakParams } from './HiggsFieldParams.tsx'
import { GeminiTextParams, GeminiVisionParams, GeminiImagenParams } from './GeminiParams.tsx'
import {
  CharacterParams,
  LocationParams,
  BuildingParams,
  ClothingParams,
  ArtworkParams,
  FurnitureParams,
  MusicParams,
  ScriptParams,
  StoryboardParams,
  TransportParams,
} from './EntityParams.tsx'
import { OutputParams, TextParams } from './UtilParams.tsx'
import type {
  CharacterNodeParams,
  LocationNodeParams,
  BuildingNodeParams,
  ClothingNodeParams,
  ArtworkNodeParams,
  FurnitureNodeParams,
  MusicNodeParams,
  ScriptNodeParams,
  StoryboardNodeParams,
  TransportNodeParams,
} from '../../types.ts'

export function NodeParamsPanel({
  node,
  updateNodeParam,
  loadPinterestBoards,
  loadPinterestPins,
  executeGraph,
}: NodeParamsProps) {
  const { nodeType, params } = node.data
  const loadedRef = useRef(false)

  useEffect(() => {
    if (nodeType === 'pinterest_board' && !loadedRef.current) {
      loadedRef.current = true
      void loadPinterestBoards(node)
    }
  }, [node, nodeType, loadPinterestBoards])

  return (
    <div className="insp-section">
      <h5>Параметры ноды</h5>
      <br />
      {nodeType === 'pinterest_board' && (
        <PinterestParams
          node={node}
          params={params}
          updateNodeParam={updateNodeParam}
          loadPinterestPins={loadPinterestPins}
          executeGraph={executeGraph}
        />
      )}
      {nodeType === 'higgsfield_soul' && (
        <SoulParams
          node={node}
          params={params}
          updateNodeParam={updateNodeParam}
          executeGraph={executeGraph}
        />
      )}
      {nodeType === 'higgsfield_camera' && (
        <CameraParams
          node={node}
          params={params}
          updateNodeParam={updateNodeParam}
          executeGraph={executeGraph}
        />
      )}
      {nodeType === 'higgsfield_speak' && (
        <SpeakParams
          node={node}
          params={params}
          updateNodeParam={updateNodeParam}
          executeGraph={executeGraph}
        />
      )}
      {nodeType === 'output_scene' && (
        <OutputParams
          node={node}
          params={params}
          updateNodeParam={updateNodeParam}
          executeGraph={executeGraph}
        />
      )}
      {nodeType === 'text_prompt' && (
        <TextParams
          node={node}
          params={params}
          updateNodeParam={updateNodeParam}
          executeGraph={executeGraph}
        />
      )}
      {nodeType === 'gemini_text' && (
        <GeminiTextParams
          node={node}
          params={params}
          updateNodeParam={updateNodeParam}
          executeGraph={executeGraph}
        />
      )}
      {nodeType === 'gemini_vision' && (
        <GeminiVisionParams
          node={node}
          params={params}
          updateNodeParam={updateNodeParam}
          executeGraph={executeGraph}
        />
      )}
      {nodeType === 'gemini_imagen' && (
        <GeminiImagenParams
          node={node}
          params={params}
          updateNodeParam={updateNodeParam}
          executeGraph={executeGraph}
        />
      )}
      {nodeType === 'character' && (
        <CharacterParams
          node={node}
          params={params as CharacterNodeParams}
          updateNodeParam={updateNodeParam}
        />
      )}
      {nodeType === 'location' && (
        <LocationParams
          node={node}
          params={params as LocationNodeParams}
          updateNodeParam={updateNodeParam}
        />
      )}
      {nodeType === 'building' && (
        <BuildingParams
          node={node}
          params={params as BuildingNodeParams}
          updateNodeParam={updateNodeParam}
        />
      )}
      {nodeType === 'clothing' && (
        <ClothingParams
          node={node}
          params={params as ClothingNodeParams}
          updateNodeParam={updateNodeParam}
        />
      )}
      {nodeType === 'artwork' && (
        <ArtworkParams
          node={node}
          params={params as ArtworkNodeParams}
          updateNodeParam={updateNodeParam}
        />
      )}
      {nodeType === 'furniture' && (
        <FurnitureParams
          node={node}
          params={params as FurnitureNodeParams}
          updateNodeParam={updateNodeParam}
        />
      )}
      {nodeType === 'music' && (
        <MusicParams
          node={node}
          params={params as MusicNodeParams}
          updateNodeParam={updateNodeParam}
        />
      )}
      {nodeType === 'script' && (
        <ScriptParams
          node={node}
          params={params as ScriptNodeParams}
          updateNodeParam={updateNodeParam}
        />
      )}
      {nodeType === 'storyboard' && (
        <StoryboardParams
          node={node}
          params={params as StoryboardNodeParams}
          updateNodeParam={updateNodeParam}
        />
      )}
      {nodeType === 'transport' && (
        <TransportParams
          node={node}
          params={params as TransportNodeParams}
          updateNodeParam={updateNodeParam}
        />
      )}
    </div>
  )
}
