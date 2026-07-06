import { useRef } from 'react'
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

export function CharacterParams({
  node,
  params,
  updateNodeParam,
  updateNodeParams,
}: EP<CharacterNodeParams>) {
  const { db, onSelect, onAdd } = usePresetDatabase(node, params, updateNodeParams)
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
      <DatabaseSelect
        label="Персонаж"
        items={db}
        selected={params.selectedItem}
        onSelect={onSelect}
        onAdd={onAdd}
        addLabel="Добавить персонажа"
      />
      <NumberField
        label="Возраст"
        min={10}
        max={90}
        step={1}
        value={params.age}
        onChange={(v) => updateNodeParam(node.id, 'age', v)}
      />
      <SelectField
        label="Эмоция"
        value={params.emotion}
        onChange={(v) => updateNodeParam(node.id, 'emotion', v)}
        options={['спокойствие', 'грусть', 'радость', 'тревога', 'задумчивость']}
      />
      <SelectField
        label="Стилист"
        value={params.stylist}
        onChange={(v) => updateNodeParam(node.id, 'stylist', v)}
        options={['Без стилиста', 'Tigran Avetisyan', 'Anna K', 'Народный']}
      />
      <InFrameToggle
        value={params.inFrame}
        onChange={(v) => updateNodeParam(node.id, 'inFrame', v)}
      />
      <DateRangeField
        label="Годы жизни"
        from={params.lifetimeFrom}
        to={params.lifetimeTo}
        onChangeFrom={(v) => updateNodeParam(node.id, 'lifetimeFrom', v)}
        onChangeTo={(v) => updateNodeParam(node.id, 'lifetimeTo', v)}
      />
      <CoordinateField
        label="Место рождения"
        value={params.birthPlace}
        onChange={(v) => updateNodeParam(node.id, 'birthPlace', v)}
      />
      <CoordinateField
        label="Место смерти"
        value={params.deathPlace}
        onChange={(v) => updateNodeParam(node.id, 'deathPlace', v)}
      />
      <CoordinateField
        label="Текущие координаты"
        value={params.currentPosition}
        onChange={(v) => updateNodeParam(node.id, 'currentPosition', v)}
      />
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
      </div>
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
