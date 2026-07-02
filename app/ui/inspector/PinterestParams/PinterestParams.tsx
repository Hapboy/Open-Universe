import cn from 'classnames'
import type { Node } from '@xyflow/react'
import type { NodeParams, PinItem, BoardItem } from '../../../types.ts'
import type { NodeParamsProps } from '../shared.tsx'
import styles from './PinterestParams.module.css'

export function PinterestParams({
  node,
  params,
  updateNodeParam,
  loadPinterestPins,
}: {
  node: Node<NodeParams>
  params: Record<string, unknown>
  updateNodeParam: NodeParamsProps['updateNodeParam']
  loadPinterestPins: NodeParamsProps['loadPinterestPins']
}) {
  const boards = (params.boards as BoardItem[]) || []
  const pins = (params.pins as PinItem[]) || []

  const handleBoardChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value
    const name = e.target.options[e.target.selectedIndex].text
    updateNodeParam(node.id, 'boardId', id)
    updateNodeParam(node.id, 'boardName', name)
    await loadPinterestPins(node, id)
  }

  return (
    <>
      <div className={styles.fld}>
        <span>Pinterest Доска</span>
        <select value={(params.boardId as string) || ''} onChange={handleBoardChange}>
          {boards.length === 0 ? (
            <option value="">Сначала введите API Pinterest в настройках...</option>
          ) : (
            boards.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))
          )}
        </select>
      </div>
      <div className={styles.fld}>
        <span>Выберите изображение (Pin)</span>
        <div className={styles.pinterestPinsGrid}>
          {pins.map((p) => (
            <div
              key={p.id}
              className={cn(
                styles.pinterestPinItem,
                params.selectedPin === p.image && styles.isSelected
              )}
              style={{ backgroundImage: `url('${p.image}')` }}
              title={p.title}
              onClick={() => {
                updateNodeParam(node.id, 'selectedPin', p.image)
              }}
            />
          ))}
        </div>
      </div>
    </>
  )
}
