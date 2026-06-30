import type { Edge, Node } from '@xyflow/react';
import type { NodeParams } from '../types.ts';
import { HiggsfieldService, PinterestService } from './services.ts';

type ShowToast = (msg: string) => void;
type SetRenderImage = (img: string | null) => void;

export async function runGraph(
  nodes: Node<NodeParams>[],
  edges: Edge[],
  showToast: ShowToast,
  setRenderImage: SetRenderImage
): Promise<void> {
  const resolved: Record<string, unknown> = {};

  for (let pass = 0; pass < nodes.length; pass++) {
    for (const node of nodes) {
      const d = node.data;

      // Skip nodes whose output is already resolved from a previous pass
      if (d.outputs[0]?.id && resolved[d.outputs[0].id] !== undefined) continue;

      if (d.nodeType === 'pinterest_board') {
        resolved[d.outputs[0]?.id] = d.params.selectedPin;

      } else if (d.nodeType === 'text_prompt') {
        resolved[d.outputs[0]?.id] = d.params.text;

      } else if (d.nodeType === 'higgsfield_soul') {
        const faceEdge   = edges.find(e => e.targetHandle === d.inputs[0]?.id);
        const promptEdge = edges.find(e => e.targetHandle === d.inputs[1]?.id);
        const faceVal    = faceEdge   ? (resolved[faceEdge.sourceHandle   ?? ''] as string) : null;
        const promptVal  = promptEdge ? (resolved[promptEdge.sourceHandle  ?? ''] as string) : d.params.prompt as string;
        resolved[d.outputs[0]?.id] = await HiggsfieldService.runSoul(promptVal, faceVal, showToast);

      } else if (d.nodeType === 'higgsfield_camera') {
        const edge = edges.find(e => e.targetHandle === d.inputs[0]?.id);
        const val  = edge ? (resolved[edge.sourceHandle ?? ''] as string) : null;
        resolved[d.outputs[0]?.id] = await HiggsfieldService.runMotion(val, d.params.motionPreset as string, showToast);

      } else if (['character', 'location', 'building', 'clothing', 'artwork',
                  'furniture', 'music', 'script', 'storyboard', 'transport'].includes(d.nodeType)) {
        if (d.outputs[0]?.id) resolved[d.outputs[0].id] = d.params.selectedItem;

      } else if (d.nodeType === 'higgsfield_speak') {
        const edge = edges.find(e => e.targetHandle === d.inputs[0]?.id);
        const val  = edge ? (resolved[edge.sourceHandle ?? ''] as string) : null;
        resolved[d.outputs[0]?.id] = await HiggsfieldService.runSpeak(val, d.params.expression as string, showToast);
      }
    }
  }

  const outNode = nodes.find(n => n.data.nodeType === 'output_scene');
  if (outNode) {
    const vEdge = edges.find(e => e.targetHandle === outNode.data.inputs[0]?.id);
    const mEdge = edges.find(e => e.targetHandle === outNode.data.inputs[1]?.id);
    const img = (vEdge && resolved[vEdge.sourceHandle ?? '']) ||
                (mEdge && resolved[mEdge.sourceHandle ?? '']) || null;
    const prev = (window as Window & { customRenderImage?: string | null }).customRenderImage;
    if (img !== prev) {
      setRenderImage(img as string | null);
      showToast('Кадр фильма обновлен на основе выходов графа!');
    }
  }
}

// Re-export services for convenience
export { PinterestService, HiggsfieldService };
