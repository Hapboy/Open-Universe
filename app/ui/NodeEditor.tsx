import { useCallback, useMemo } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  useReactFlow,
  type NodeTypes,
  type Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useAppContext } from '../store/AppContext.tsx';
import { NodeCard } from './NodeCard.tsx';
import type { NodeParams } from '../types.ts';

const nodeTypes: NodeTypes = { custom: NodeCard as unknown as NodeTypes['custom'] };

function NodeEditorCanvas() {
  const {
    nodes, edges,
    onNodesChange, onEdgesChange, onConnect,
    selectNode, selectedNodeId,
    createNode, showToast,
  } = useAppContext();

  const { screenToFlowPosition } = useReactFlow();

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    selectNode(node.id);
  }, [selectNode]);

  const onPaneClick = useCallback(() => {
    selectNode(null);
  }, [selectNode]);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('node-template-type');
    if (!type) return;

    const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });
    const node = createNode(type, position.x, position.y);
    if (node) {
      selectNode(node.id);
      if (type === 'pinterest_board') {
        showToast('Pinterest: добавляем доску...');
      }
    }
  }, [screenToFlowPosition, createNode, selectNode, showToast]);

  const styledNodes = useMemo(() =>
    nodes.map(n => ({ ...n, selected: n.id === selectedNodeId })),
    [nodes, selectedNodeId]
  );

  return (
    <div className="canvas-wrap" id="canvasWrap" style={{ position: 'relative', width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={styledNodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onDragOver={onDragOver}
        onDrop={onDrop}
        nodeTypes={nodeTypes}
        fitView
        deleteKeyCode="Delete"
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={20} size={1} color="var(--color-border)" />
        <Controls />
        <MiniMap
          nodeColor={n => (n.data as NodeParams).color || '#888'}
          style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 6 }}
        />
      </ReactFlow>
      <div className="hint" id="hint" style={{ pointerEvents: 'none' }}>
        Перетащи ноду из палитры слева. Соедини выход одной ноды со совместимым входом другой — тянем от правого порта к левому.
      </div>
    </div>
  );
}

export function NodeEditor() {
  return (
    <ReactFlowProvider>
      <NodeEditorCanvas />
    </ReactFlowProvider>
  );
}
