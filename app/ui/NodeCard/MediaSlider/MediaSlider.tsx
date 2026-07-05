import cn from 'classnames'
import styles from './MediaSlider.module.css'

export interface MediaItem {
  url: string
  type?: 'image' | 'video'
}

export function MediaSlider({
  items,
  index = 0,
  onIndexChange,
  onDelete,
}: {
  items: MediaItem[]
  index?: number
  onIndexChange?: (i: number) => void
  onDelete?: (i: number) => void
}) {
  if (items.length === 0) return null
  const activeIndex = Math.min(index, items.length - 1)
  const item = items[activeIndex]

  return (
    <div className={styles.slider}>
      {item.type === 'video' ? (
        <video src={item.url} className={cn(styles.media, 'nodrag', 'nowheel')} controls muted />
      ) : (
        <img src={item.url} alt="" className={styles.media} />
      )}
      {items.length > 1 && onIndexChange && (
        <>
          <button
            className={cn(styles.nav, styles.prev)}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation()
              onIndexChange((activeIndex - 1 + items.length) % items.length)
            }}
          >
            <i className="ti ti-chevron-left" />
          </button>
          <button
            className={cn(styles.nav, styles.next)}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation()
              onIndexChange((activeIndex + 1) % items.length)
            }}
          >
            <i className="ti ti-chevron-right" />
          </button>
          <span className={styles.count}>
            {activeIndex + 1}/{items.length}
          </span>
        </>
      )}
      {onDelete && (
        <button
          className={styles.del}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation()
            onDelete(activeIndex)
          }}
        >
          <i className="ti ti-trash" />
        </button>
      )}
    </div>
  )
}
