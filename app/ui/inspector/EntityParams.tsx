import { useRef } from 'react'
import { DatabaseChips, InFrameToggle } from './shared.tsx'
import type { EP } from './shared.tsx'
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

export function CharacterParams({ node, params, updateNodeParam }: EP<CharacterNodeParams>) {
  const db = params._db
  const photos = params.photos || []
  const fileInputRef = useRef<HTMLInputElement>(null)

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
      <DatabaseChips
        label="Персонаж"
        items={db}
        selected={params.selectedItem}
        onSelect={(v) => updateNodeParam(node.id, 'selectedItem', v)}
      />
      <div className="fld">
        <span>Возраст ({params.age})</span>
        <input
          type="range"
          min="10"
          max="90"
          step="1"
          defaultValue={params.age}
          onChange={(e) => updateNodeParam(node.id, 'age', parseInt(e.target.value))}
        />
      </div>
      <div className="fld">
        <span>Эмоция</span>
        <select
          value={params.emotion}
          onChange={(e) => updateNodeParam(node.id, 'emotion', e.target.value)}
        >
          {['спокойствие', 'грусть', 'радость', 'тревога', 'задумчивость'].map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </div>
      <div className="fld">
        <span>Стилист</span>
        <select
          value={params.stylist}
          onChange={(e) => updateNodeParam(node.id, 'stylist', e.target.value)}
        >
          {['Без стилиста', 'Tigran Avetisyan', 'Anna K', 'Народный'].map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </div>
      <InFrameToggle
        value={params.inFrame}
        onChange={(v) => updateNodeParam(node.id, 'inFrame', v)}
      />
      <div className="fld">
        <span>Фото персонажа ({photos.length})</span>
        <div className="char-photo-actions">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            style={{ display: 'none' }}
            onChange={handleUpload}
          />
          <button className="btn" onClick={() => fileInputRef.current?.click()}>
            <i className="ti ti-upload" /> Загрузить
          </button>
        </div>
        <input
          type="text"
          placeholder="Pinterest board URL"
          defaultValue={params.pinterestUrl || ''}
          onBlur={(e) => updateNodeParam(node.id, 'pinterestUrl', e.target.value)}
          style={{ marginTop: 4 }}
        />
      </div>
    </>
  )
}

export function LocationParams({ node, params, updateNodeParam }: EP<LocationNodeParams>) {
  return (
    <>
      <DatabaseChips
        label="Локация"
        items={params._db}
        selected={params.selectedItem}
        onSelect={(v) => updateNodeParam(node.id, 'selectedItem', v)}
      />
      <div className="fld">
        <span>Погода</span>
        <select
          value={params.weather}
          onChange={(e) => updateNodeParam(node.id, 'weather', e.target.value)}
        >
          {['туман', 'солнце', 'дождь', 'снег', 'пасмурно'].map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </div>
      <div className="fld">
        <span>Время суток</span>
        <select
          value={params.timeOfDay}
          onChange={(e) => updateNodeParam(node.id, 'timeOfDay', e.target.value)}
        >
          {['рассвет', 'утро', 'день', 'закат', 'ночь'].map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </div>
    </>
  )
}

export function BuildingParams({ node, params, updateNodeParam }: EP<BuildingNodeParams>) {
  return (
    <>
      <DatabaseChips
        label="Здание"
        items={params._db}
        selected={params.selectedItem}
        onSelect={(v) => updateNodeParam(node.id, 'selectedItem', v)}
      />
      <div className="fld">
        <span>Этаж ({params.floor})</span>
        <input
          type="range"
          min="1"
          max="10"
          step="1"
          defaultValue={params.floor}
          onChange={(e) => updateNodeParam(node.id, 'floor', parseInt(e.target.value))}
        />
      </div>
      <InFrameToggle
        value={params.inFrame}
        onChange={(v) => updateNodeParam(node.id, 'inFrame', v)}
      />
    </>
  )
}

export function ClothingParams({ node, params, updateNodeParam }: EP<ClothingNodeParams>) {
  return (
    <>
      <DatabaseChips
        label="Дизайнер"
        items={params._db}
        selected={params.selectedItem}
        onSelect={(v) => updateNodeParam(node.id, 'selectedItem', v)}
      />
      <div className="fld">
        <span>Сезон</span>
        <select
          value={params.season}
          onChange={(e) => updateNodeParam(node.id, 'season', e.target.value)}
        >
          {['FW26', 'SS26', 'FW25', 'SS25'].map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </div>
      <div className="fld">
        <span>Износ ({params.wear}%)</span>
        <input
          type="range"
          min="0"
          max="100"
          step="1"
          defaultValue={params.wear}
          onChange={(e) => updateNodeParam(node.id, 'wear', parseInt(e.target.value))}
        />
      </div>
    </>
  )
}

export function ArtworkParams({ node, params, updateNodeParam }: EP<ArtworkNodeParams>) {
  return (
    <>
      <DatabaseChips
        label="Произведение"
        items={params._db}
        selected={params.selectedItem}
        onSelect={(v) => updateNodeParam(node.id, 'selectedItem', v)}
      />
      <div className="fld">
        <span>Масштаб ({params.scale}%)</span>
        <input
          type="range"
          min="20"
          max="300"
          step="10"
          defaultValue={params.scale}
          onChange={(e) => updateNodeParam(node.id, 'scale', parseInt(e.target.value))}
        />
      </div>
      <InFrameToggle
        value={params.inFrame}
        onChange={(v) => updateNodeParam(node.id, 'inFrame', v)}
      />
    </>
  )
}

export function FurnitureParams({ node, params, updateNodeParam }: EP<FurnitureNodeParams>) {
  return (
    <>
      <DatabaseChips
        label="Мебель"
        items={params._db}
        selected={params.selectedItem}
        onSelect={(v) => updateNodeParam(node.id, 'selectedItem', v)}
      />
      <div className="fld">
        <span>Плотность ({params.density})</span>
        <input
          type="range"
          min="1"
          max="10"
          step="1"
          defaultValue={params.density}
          onChange={(e) => updateNodeParam(node.id, 'density', parseInt(e.target.value))}
        />
      </div>
      <InFrameToggle
        value={params.inFrame}
        onChange={(v) => updateNodeParam(node.id, 'inFrame', v)}
      />
    </>
  )
}

export function MusicParams({ node, params, updateNodeParam }: EP<MusicNodeParams>) {
  return (
    <>
      <DatabaseChips
        label="Трек"
        items={params._db}
        selected={params.selectedItem}
        onSelect={(v) => updateNodeParam(node.id, 'selectedItem', v)}
      />
      <div className="fld">
        <span>Настроение</span>
        <select
          value={params.mood}
          onChange={(e) => updateNodeParam(node.id, 'mood', e.target.value)}
        >
          {['элегия', 'торжество', 'тоска', 'медитация', 'танец'].map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </div>
    </>
  )
}

export function ScriptParams({ node, params, updateNodeParam }: EP<ScriptNodeParams>) {
  return (
    <>
      <DatabaseChips
        label="Сцена"
        items={params._db}
        selected={params.selectedItem}
        onSelect={(v) => updateNodeParam(node.id, 'selectedItem', v)}
      />
      <div className="fld">
        <span>Тон</span>
        <select
          value={params.tone}
          onChange={(e) => updateNodeParam(node.id, 'tone', e.target.value)}
        >
          {['драма', 'комедия', 'лирика', 'хоррор', 'документ'].map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </div>
    </>
  )
}

export function StoryboardParams({ node, params, updateNodeParam }: EP<StoryboardNodeParams>) {
  return (
    <>
      <DatabaseChips
        label="Версия"
        items={params._db}
        selected={params.selectedItem}
        onSelect={(v) => updateNodeParam(node.id, 'selectedItem', v)}
      />
      <div className="fld">
        <span>Кадров ({params.shots})</span>
        <input
          type="range"
          min="1"
          max="12"
          step="1"
          defaultValue={params.shots}
          onChange={(e) => updateNodeParam(node.id, 'shots', parseInt(e.target.value))}
        />
      </div>
    </>
  )
}

export function TransportParams({ node, params, updateNodeParam }: EP<TransportNodeParams>) {
  return (
    <>
      <DatabaseChips
        label="Транспорт"
        items={params._db}
        selected={params.selectedItem}
        onSelect={(v) => updateNodeParam(node.id, 'selectedItem', v)}
      />
      <InFrameToggle
        value={params.inFrame}
        onChange={(v) => updateNodeParam(node.id, 'inFrame', v)}
      />
    </>
  )
}
