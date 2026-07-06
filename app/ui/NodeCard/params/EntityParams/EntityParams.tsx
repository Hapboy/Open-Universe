import { useRef, useState, useEffect } from 'react'
import cn from 'classnames'
import { DatabaseSelect, InFrameToggle, usePresetDatabase } from '../shared.tsx'
import type { EP } from '../shared.tsx'
import { SelectField } from '../../../components/SelectField/SelectField.tsx'
import { RangeField } from '../../../components/RangeField/RangeField.tsx'
import { NumberField } from '../../../components/NumberField/NumberField.tsx'
import { CoordinateField } from '../../../components/CoordinateField/CoordinateField.tsx'
import { DateRangeField } from '../../../components/DateRangeField/DateRangeField.tsx'
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
} from '../../../../types.ts'
import styles from './EntityParams.module.css'

/* Custom drop-down list with preview SVG shapes */
interface DropdownOption {
  value: string
  label: string
  previewSvg: React.ReactNode
}

interface DropdownWithPreviewsProps {
  label: string
  value: string
  onChange: (val: string) => void
  options: DropdownOption[]
}

function DropdownWithPreviews({ label, value, onChange, options }: DropdownWithPreviewsProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  const selectedOption = options.find((opt) => opt.value === value) || options[0]

  return (
    <div className={styles.customSelectWrapper} ref={dropdownRef}>
      <span className={styles.selectLabel}>{label}</span>
      <div className={styles.selectTrigger} onClick={() => setIsOpen(!isOpen)}>
        {selectedOption && (
          <div className={styles.selectedContent}>
            <div className={styles.previewThumb}>{selectedOption.previewSvg}</div>
            <span className={styles.selectedText}>{selectedOption.label}</span>
          </div>
        )}
        <i className={cn('ti ti-chevron-down', styles.chevron, isOpen && styles.chevronOpen)} />
      </div>
      {isOpen && (
        <div className={styles.selectDropdown}>
          {options.map((opt) => (
            <div
              key={opt.value}
              className={cn(styles.selectOption, opt.value === value && styles.selectOptionActive)}
              onClick={() => {
                onChange(opt.value)
                setIsOpen(false)
              }}
            >
              <div className={styles.previewThumb}>{opt.previewSvg}</div>
              <span className={styles.optionText}>{opt.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* Custom Text and TextArea Field components */
function TextField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className={styles.fld}>
      <span>{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={styles.txtInput}
      />
    </div>
  )
}

function TextAreaField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className={styles.fld}>
      <span>{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={styles.txtArea}
        rows={2}
      />
    </div>
  )
}

/* Styling Dropdown Options Lists */
const haircutOptions: DropdownOption[] = [
  {
    value: 'Короткая',
    label: 'Короткая',
    previewSvg: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <circle cx="12" cy="13" r="5" />
        <path d="M9 9 C9 7, 15 7, 15 9" />
        <path d="M10 8 L10 6" />
        <path d="M14 8 L14 6" />
      </svg>
    ),
  },
  {
    value: 'Каре',
    label: 'Каре',
    previewSvg: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <circle cx="12" cy="13" r="5" />
        <path d="M7 11 C7 7, 17 7, 17 11 V15" />
      </svg>
    ),
  },
  {
    value: 'Длинная',
    label: 'Длинная',
    previewSvg: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <circle cx="12" cy="11" r="5" />
        <path d="M7 9 C7 5, 17 5, 17 9 V20 C17 20, 15 18, 12 18 C9 18, 7 20, 7 20 Z" />
      </svg>
    ),
  },
  {
    value: 'Косы',
    label: 'Косы',
    previewSvg: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <circle cx="12" cy="10" r="5" />
        <path d="M7 8 C7 5, 17 5, 17 8" />
        <path d="M8 15 L7 18 L8 21" />
        <path d="M16 15 L17 18 L16 21" />
      </svg>
    ),
  },
  {
    value: 'С дредами',
    label: 'С дредами',
    previewSvg: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <circle cx="12" cy="11" r="5" />
        <path d="M6 7 L4 12" />
        <path d="M8 6 L6 14" />
        <path d="M16 6 L18 14" />
        <path d="M18 7 L20 12" />
        <path d="M12 5 L12 8" />
      </svg>
    ),
  },
]

const tattooOptions: DropdownOption[] = [
  {
    value: 'Нет',
    label: 'Нет',
    previewSvg: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <rect x="6" y="6" width="12" height="12" rx="2" />
        <line x1="6" y1="18" x2="18" y2="6" />
      </svg>
    ),
  },
  {
    value: 'Геометрия',
    label: 'Геометрия',
    previewSvg: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <rect x="6" y="6" width="12" height="12" rx="2" />
        <polygon points="12,8 16,15 8,15" fill="rgba(239,159,39,0.2)" />
      </svg>
    ),
  },
  {
    value: 'Рукав',
    label: 'Рукав',
    previewSvg: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <rect x="6" y="6" width="12" height="12" rx="2" />
        <path d="M8 8 C8 8, 10 16, 16 16" strokeDasharray="2 2" />
        <path d="M10 6 C10 6, 12 14, 14 12" strokeDasharray="1 1" />
      </svg>
    ),
  },
  {
    value: 'Минимализм',
    label: 'Минимализм',
    previewSvg: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <rect x="6" y="6" width="12" height="12" rx="2" />
        <circle cx="12" cy="12" r="1.5" fill="currentColor" />
      </svg>
    ),
  },
]

const accessoryOptions: DropdownOption[] = [
  {
    value: 'Нет',
    label: 'Нет',
    previewSvg: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <circle cx="12" cy="12" r="6" />
      </svg>
    ),
  },
  {
    value: 'Очки',
    label: 'Очки',
    previewSvg: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <circle cx="8" cy="12" r="3" />
        <circle cx="16" cy="12" r="3" />
        <line x1="11" y1="12" x2="13" y2="12" />
        <path d="M5 12 L3 10" />
        <path d="M19 12 L21 10" />
      </svg>
    ),
  },
  {
    value: 'Серьги',
    label: 'Серьги',
    previewSvg: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <circle cx="12" cy="10" r="4" />
        <circle cx="7" cy="14" r="1.5" />
        <circle cx="17" cy="14" r="1.5" />
      </svg>
    ),
  },
  {
    value: 'Шарф',
    label: 'Шарф',
    previewSvg: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path d="M8 8 C12 6, 16 6, 16 8 C16 11, 8 11, 8 14 C8 17, 16 17, 16 14" />
      </svg>
    ),
  },
]

const clothingOptions: DropdownOption[] = [
  {
    value: 'Пальто',
    label: 'Пальто',
    previewSvg: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path d="M7 8 V20 H17 V8 L12 12 Z" />
        <line x1="12" y1="12" x2="12" y2="20" />
      </svg>
    ),
  },
  {
    value: 'Куртка',
    label: 'Куртка',
    previewSvg: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path d="M6 9 L12 6 L18 9 V18 H6 Z" />
        <line x1="12" y1="6" x2="12" y2="18" strokeWidth="2" />
      </svg>
    ),
  },
  {
    value: 'Костюм',
    label: 'Костюм',
    previewSvg: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path d="M6 7 L12 11 L18 7 V20 H6 Z" />
        <path d="M12 11 L10 15 H14 Z" fill="currentColor" />
      </svg>
    ),
  },
  {
    value: 'Свитер',
    label: 'Свитер',
    previewSvg: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path d="M7 9 C7 7, 17 7, 17 9 V19 H7 Z" />
        <path d="M10 9 V19 M14 9 V19" strokeDasharray="2 1" />
      </svg>
    ),
  },
]

export function CharacterParams({
  node,
  params,
  updateNodeParam,
  updateNodeParams,
}: EP<CharacterNodeParams>) {
  const { db, onSelect, onAdd } = usePresetDatabase(node, params, updateNodeParams)
  const photos = params.photos || []
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Toggle Category Tags and Search State
  const [activeTags, setActiveTags] = useState<Record<string, boolean>>({
    general: true,
    birth: false,
    arc: false,
    styling: false,
  })
  const [searchQuery, setSearchQuery] = useState('')

  const isAllActive = activeTags.general && activeTags.birth && activeTags.arc && activeTags.styling

  const toggleTag = (tag: string) => {
    setActiveTags((prev) => ({
      ...prev,
      [tag]: !prev[tag],
    }))
  }

  const toggleAll = () => {
    const nextVal = !isAllActive
    setActiveTags({
      general: nextVal,
      birth: nextVal,
      arc: nextVal,
      styling: nextVal,
    })
  }

  // Filter components by active tab tag and search label queries
  const shouldShow = (category: string, label: string) => {
    if (!activeTags[category as keyof typeof activeTags]) return false
    if (!searchQuery) return true
    return label.toLowerCase().includes(searchQuery.toLowerCase())
  }

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    Promise.all(
      files.map(
        (file) =>
          new Promise<string>((resolve) => {
            const reader = new FileReader()
            reader.onload = (ev) => resolve(ev.target!.result as string)
            reader.readAsDataURL(file)
          })
      )
    ).then((newPhotos) => {
      const next = [...photos, ...newPhotos]
      updateNodeParam(node.id, 'photos', next)
      updateNodeParam(node.id, 'photoIdx', next.length - 1)
    })
    e.target.value = ''
  }

  return (
    <>
      {/* Category selector tags and Search input */}
      <div className={styles.searchContainer}>
        <div className={styles.searchBar}>
          <i className="ti ti-search" />
          <input
            type="text"
            placeholder="Search parameters..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
        </div>
        <div className={styles.tagsContainer}>
          <button
            className={cn(styles.tagBtn, activeTags.general && styles.tagBtnActive)}
            onClick={() => toggleTag('general')}
          >
            General
          </button>
          <button
            className={cn(styles.tagBtn, activeTags.birth && styles.tagBtnActive)}
            onClick={() => toggleTag('birth')}
          >
            Birth
          </button>
          <button
            className={cn(styles.tagBtn, activeTags.arc && styles.tagBtnActive)}
            onClick={() => toggleTag('arc')}
          >
            Arc
          </button>
          <button
            className={cn(styles.tagBtn, activeTags.styling && styles.tagBtnActive)}
            onClick={() => toggleTag('styling')}
          >
            Styling
          </button>
          <button
            className={cn(styles.tagBtn, isAllActive && styles.tagBtnActiveAll)}
            onClick={toggleAll}
          >
            All
          </button>
        </div>
      </div>

      {/* 1. GENERAL CATEGORY */}
      {shouldShow('general', 'Персонаж Preset') && (
        <DatabaseSelect
          label="Персонаж"
          items={db}
          selected={params.selectedItem}
          onSelect={onSelect}
          onAdd={onAdd}
          addLabel="Добавить персонажа"
        />
      )}

      {shouldShow('general', 'Обложка Персонажа') && photos.length > 0 && (
        <div className={styles.coverPreviewWrapper}>
          <img
            src={photos[params.photoIdx ?? 0]}
            className={styles.coverPreviewImg}
            alt="Character Cover"
          />
        </div>
      )}

      {shouldShow('general', 'Имя') && (
        <TextField
          label="Имя"
          value={params.name || ''}
          onChange={(v) => updateNodeParam(node.id, 'name', v)}
        />
      )}

      {shouldShow('general', 'Текущие координаты') && (
        <CoordinateField
          label="Текущие координаты"
          value={params.currentPosition}
          onChange={(v) => updateNodeParam(node.id, 'currentPosition', v)}
        />
      )}

      {shouldShow('general', 'Фото Персонажа') && (
        <div className={styles.fld}>
          <span>Фото персонажа ({photos.length})</span>
          <div className={styles.charPhotoActions}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              style={{ display: 'none' }}
              onChange={handleUpload}
            />
            <button className={styles.btn} onClick={() => fileInputRef.current?.click()}>
              <i className="ti ti-upload" /> Загрузить
            </button>
          </div>
          <input
            key={params.selectedItem}
            type="text"
            placeholder="Pinterest board URL"
            defaultValue={params.pinterestUrl || ''}
            onBlur={(e) => updateNodeParam(node.id, 'pinterestUrl', e.target.value)}
            style={{ marginTop: 4 }}
          />
          {photos.length > 0 && (
            <div className={styles.thumbnailsList}>
              {photos.map((url, idx) => (
                <div
                  key={idx}
                  className={cn(
                    styles.thumbCell,
                    idx === params.photoIdx && styles.thumbCellActive
                  )}
                  onClick={() => updateNodeParam(node.id, 'photoIdx', idx)}
                  style={{ backgroundImage: `url(${url})` }}
                  title="Установить как обложку"
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* 2. BIRTH CATEGORY */}
      {shouldShow('birth', 'Годы жизни Время рождения и смерти') && (
        <DateRangeField
          label="Годы жизни"
          from={params.lifetimeFrom}
          to={params.lifetimeTo}
          onChangeFrom={(v) => updateNodeParam(node.id, 'lifetimeFrom', v)}
          onChangeTo={(v) => updateNodeParam(node.id, 'lifetimeTo', v)}
        />
      )}

      {shouldShow('birth', 'Место рождения') && (
        <CoordinateField
          label="Место рождения"
          value={params.birthPlace}
          onChange={(v) => updateNodeParam(node.id, 'birthPlace', v)}
        />
      )}

      {shouldShow('birth', 'Место смерти') && (
        <CoordinateField
          label="Место смерти"
          value={params.deathPlace}
          onChange={(v) => updateNodeParam(node.id, 'deathPlace', v)}
        />
      )}

      {/* 3. ARC CATEGORY */}
      {shouldShow('arc', 'Кто она?') && (
        <TextAreaField
          label="Кто она?"
          value={params.arcWho || ''}
          onChange={(v) => updateNodeParam(node.id, 'arcWho', v)}
        />
      )}

      {shouldShow('arc', 'Чего она хочет внутри?') && (
        <TextAreaField
          label="Чего она хочет внутри?"
          value={params.arcWants || ''}
          onChange={(v) => updateNodeParam(node.id, 'arcWants', v)}
        />
      )}

      {shouldShow('arc', 'Как она этого достигнет?') && (
        <TextAreaField
          label="Как она этого достигнет?"
          value={params.arcHow || ''}
          onChange={(v) => updateNodeParam(node.id, 'arcHow', v)}
        />
      )}

      {shouldShow('arc', 'Что на кону?') && (
        <TextAreaField
          label="Что на кону?"
          value={params.arcStake || ''}
          onChange={(v) => updateNodeParam(node.id, 'arcStake', v)}
        />
      )}

      {/* 4. STYLING CATEGORY */}
      {shouldShow('styling', 'Возраст') && (
        <NumberField
          label="Возраст"
          min={10}
          max={90}
          step={1}
          value={params.age}
          onChange={(v) => updateNodeParam(node.id, 'age', v)}
        />
      )}

      {shouldShow('styling', 'Эмоция') && (
        <SelectField
          label="Эмоция"
          value={params.emotion}
          onChange={(v) => updateNodeParam(node.id, 'emotion', v)}
          options={['спокойствие', 'грусть', 'радость', 'тревога', 'задумчивость']}
        />
      )}

      {shouldShow('styling', 'Стилист') && (
        <SelectField
          label="Стилист"
          value={params.stylist}
          onChange={(v) => updateNodeParam(node.id, 'stylist', v)}
          options={['Без стилиста', 'Tigran Avetisyan', 'Anna K', 'Народный']}
        />
      )}

      {shouldShow('styling', 'В кадре') && (
        <InFrameToggle
          value={params.inFrame}
          onChange={(v) => updateNodeParam(node.id, 'inFrame', v)}
        />
      )}

      {shouldShow('styling', 'Прическа') && (
        <DropdownWithPreviews
          label="Прическа"
          value={params.haircut || 'Короткая'}
          onChange={(v) => updateNodeParam(node.id, 'haircut', v)}
          options={haircutOptions}
        />
      )}

      {shouldShow('styling', 'Татуировки') && (
        <DropdownWithPreviews
          label="Татуировки"
          value={params.tattoos || 'Нет'}
          onChange={(v) => updateNodeParam(node.id, 'tattoos', v)}
          options={tattooOptions}
        />
      )}

      {shouldShow('styling', 'Аксессуары') && (
        <DropdownWithPreviews
          label="Аксессуары"
          value={params.accessories || 'Нет'}
          onChange={(v) => updateNodeParam(node.id, 'accessories', v)}
          options={accessoryOptions}
        />
      )}

      {shouldShow('styling', 'Одежда') && (
        <DropdownWithPreviews
          label="Одежда"
          value={params.clothing || 'Куртка'}
          onChange={(v) => updateNodeParam(node.id, 'clothing', v)}
          options={clothingOptions}
        />
      )}
    </>
  )
}

export function LocationParams({
  node,
  params,
  updateNodeParam,
  updateNodeParams,
}: EP<LocationNodeParams>) {
  const { db, onSelect, onAdd } = usePresetDatabase(node, params, updateNodeParams)

  return (
    <>
      <DatabaseSelect
        label="Локация"
        items={db}
        selected={params.selectedItem}
        onSelect={onSelect}
        onAdd={onAdd}
        addLabel="Добавить локацию"
      />
      <SelectField
        label="Погода"
        value={params.weather}
        onChange={(v) => updateNodeParam(node.id, 'weather', v)}
        options={['туман', 'солнце', 'дождь', 'снег', 'пасмурно']}
      />
      <SelectField
        label="Время суток"
        value={params.timeOfDay}
        onChange={(v) => updateNodeParam(node.id, 'timeOfDay', v)}
        options={['рассвет', 'утро', 'день', 'закат', 'ночь']}
      />
      <div className={styles.fld}>
        <span>Интерьер / Экстерьер</span>
        <div className={styles.segBtn}>
          {['Интерьер', 'Экстерьер'].map((v) => (
            <button
              key={v}
              className={cn(params.interiorExterior === v && styles.isOn)}
              onClick={() =>
                updateNodeParam(node.id, 'interiorExterior', v as 'Интерьер' | 'Экстерьер')
              }
            >
              {v}
            </button>
          ))}
        </div>
      </div>
      <RangeField
        label={`Уровень повреждения дома (${params.damageLevel ?? 0}%)`}
        min={0}
        max={100}
        step={5}
        value={params.damageLevel ?? 0}
        onChange={(v) => updateNodeParam(node.id, 'damageLevel', v)}
      />
    </>
  )
}

export function BuildingParams({
  node,
  params,
  updateNodeParam,
  updateNodeParams,
}: EP<BuildingNodeParams>) {
  const { db, onSelect, onAdd } = usePresetDatabase(node, params, updateNodeParams)
  return (
    <>
      <DatabaseSelect
        label="Здание"
        items={db}
        selected={params.selectedItem}
        onSelect={onSelect}
        onAdd={onAdd}
        addLabel="Добавить здание"
      />
      <NumberField
        label="Этаж"
        min={1}
        max={10}
        step={1}
        value={params.floor}
        onChange={(v) => updateNodeParam(node.id, 'floor', v)}
      />
      <InFrameToggle
        value={params.inFrame}
        onChange={(v) => updateNodeParam(node.id, 'inFrame', v)}
      />
    </>
  )
}

export function ClothingParams({
  node,
  params,
  updateNodeParam,
  updateNodeParams,
}: EP<ClothingNodeParams>) {
  const { db, onSelect, onAdd } = usePresetDatabase(node, params, updateNodeParams)
  return (
    <>
      <DatabaseSelect
        label="Дизайнер"
        items={db}
        selected={params.selectedItem}
        onSelect={onSelect}
        onAdd={onAdd}
        addLabel="Добавить дизайнера"
      />
      <SelectField
        label="Сезон"
        value={params.season}
        onChange={(v) => updateNodeParam(node.id, 'season', v)}
        options={['FW26', 'SS26', 'FW25', 'SS25']}
      />
      <RangeField
        label={`Износ (${params.wear}%)`}
        min={0}
        max={100}
        step={1}
        value={params.wear}
        onChange={(v) => updateNodeParam(node.id, 'wear', v)}
      />
    </>
  )
}

export function ArtworkParams({
  node,
  params,
  updateNodeParam,
  updateNodeParams,
}: EP<ArtworkNodeParams>) {
  const { db, onSelect, onAdd } = usePresetDatabase(node, params, updateNodeParams)
  return (
    <>
      <DatabaseSelect
        label="Произведение"
        items={db}
        selected={params.selectedItem}
        onSelect={onSelect}
        onAdd={onAdd}
        addLabel="Добавить произведение"
      />
      <RangeField
        label={`Масштаб (${params.scale}%)`}
        min={20}
        max={300}
        step={10}
        value={params.scale}
        onChange={(v) => updateNodeParam(node.id, 'scale', v)}
      />
      <InFrameToggle
        value={params.inFrame}
        onChange={(v) => updateNodeParam(node.id, 'inFrame', v)}
      />
    </>
  )
}

export function FurnitureParams({
  node,
  params,
  updateNodeParam,
  updateNodeParams,
}: EP<FurnitureNodeParams>) {
  const { db, onSelect, onAdd } = usePresetDatabase(node, params, updateNodeParams)
  return (
    <>
      <DatabaseSelect
        label="Мебель"
        items={db}
        selected={params.selectedItem}
        onSelect={onSelect}
        onAdd={onAdd}
        addLabel="Добавить мебель"
      />
      <RangeField
        label={`Плотность (${params.density})`}
        min={1}
        max={10}
        step={1}
        value={params.density}
        onChange={(v) => updateNodeParam(node.id, 'density', v)}
      />
      <InFrameToggle
        value={params.inFrame}
        onChange={(v) => updateNodeParam(node.id, 'inFrame', v)}
      />
    </>
  )
}

export function MusicParams({
  node,
  params,
  updateNodeParam,
  updateNodeParams,
}: EP<MusicNodeParams>) {
  const { db, onSelect, onAdd } = usePresetDatabase(node, params, updateNodeParams)
  return (
    <>
      <DatabaseSelect
        label="Трек"
        items={db}
        selected={params.selectedItem}
        onSelect={onSelect}
        onAdd={onAdd}
        addLabel="Добавить трек"
      />
      <SelectField
        label="Настроение"
        value={params.mood}
        onChange={(v) => updateNodeParam(node.id, 'mood', v)}
        options={['элегия', 'торжество', 'тоска', 'медитация', 'танец']}
      />
    </>
  )
}

export function ScriptParams({
  node,
  params,
  updateNodeParam,
  updateNodeParams,
}: EP<ScriptNodeParams>) {
  const { db, onSelect, onAdd } = usePresetDatabase(node, params, updateNodeParams)
  return (
    <>
      <DatabaseSelect
        label="Сцена"
        items={db}
        selected={params.selectedItem}
        onSelect={onSelect}
        onAdd={onAdd}
        addLabel="Добавить сцену"
      />
      <SelectField
        label="Тон"
        value={params.tone}
        onChange={(v) => updateNodeParam(node.id, 'tone', v)}
        options={['драма', 'комедия', 'лирика', 'хоррор', 'документ']}
      />
    </>
  )
}

export function StoryboardParams({
  node,
  params,
  updateNodeParam,
  updateNodeParams,
}: EP<StoryboardNodeParams>) {
  const { db, onSelect, onAdd } = usePresetDatabase(node, params, updateNodeParams)
  return (
    <>
      <DatabaseSelect
        label="Версия"
        items={db}
        selected={params.selectedItem}
        onSelect={onSelect}
        onAdd={onAdd}
        addLabel="Добавить версию"
      />
      <NumberField
        label="Кадров"
        min={1}
        max={12}
        step={1}
        value={params.shots}
        onChange={(v) => updateNodeParam(node.id, 'shots', v)}
      />
    </>
  )
}

export function TransportParams({
  node,
  params,
  updateNodeParam,
  updateNodeParams,
}: EP<TransportNodeParams>) {
  const { db, onSelect, onAdd } = usePresetDatabase(node, params, updateNodeParams)
  return (
    <>
      <DatabaseSelect
        label="Транспорт"
        items={db}
        selected={params.selectedItem}
        onSelect={onSelect}
        onAdd={onAdd}
        addLabel="Добавить транспорт"
      />
      <InFrameToggle
        value={params.inFrame}
        onChange={(v) => updateNodeParam(node.id, 'inFrame', v)}
      />
    </>
  )
}
