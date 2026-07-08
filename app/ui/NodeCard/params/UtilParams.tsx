import { useRef } from 'react'
import cn from 'classnames'
import type { EEP, NodeParamsProps } from './shared.tsx'
import { SelectField } from '../../components/SelectField/SelectField.tsx'
import { TextField } from '../../components/TextField/TextField.tsx'
import { NumberField } from '../../components/NumberField/NumberField.tsx'
import styles from './UtilParams.module.css'

export function OutputParams({
  node,
  params,
  scenes,
  updateNodeParam,
}: EEP & { scenes: NodeParamsProps['scenes'] }) {
  const ENGINES = ['Hayverse Realtime Veo 3', 'Hayverse Draft', 'Hayverse Cinema 4K']
  const fileInputRef = useRef<HTMLInputElement>(null)
  const track = (params.track as number) ?? 1

  // Switching track snaps this scene's start to align with whatever scene is
  // currently last on the target track — recreates the old "parallel scene"
  // pattern (two scenes sharing a start on different tracks). Re-applied on
  // every toggle, in either direction; if the target track is empty, start
  // is left untouched.
  const handleTrackChange = (t: number) => {
    if (t === track) return
    const targetTrackScenes = scenes.filter((s) => s.track === t && s.id !== node.id)
    const lastOnTarget = targetTrackScenes.reduce<(typeof targetTrackScenes)[number] | null>(
      (max, s) => (!max || s.start > max.start ? s : max),
      null
    )
    updateNodeParam(node.id, 'track', t)
    if (lastOnTarget) updateNodeParam(node.id, 'start', lastOnTarget.start)
  }

  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => updateNodeParam(node.id, 'coverUrl', ev.target!.result as string)
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  return (
    <>
      <TextField
        label="Название сцены"
        defaultValue={params.title as string}
        onBlur={(v) => updateNodeParam(node.id, 'title', v)}
      />
      <NumberField
        label="Начало (сек)"
        value={params.start as number}
        min={0}
        onChange={(v) => updateNodeParam(node.id, 'start', v)}
      />
      <NumberField
        label="Длительность (сек)"
        value={params.duration as number}
        min={1}
        onChange={(v) => updateNodeParam(node.id, 'duration', v)}
      />
      <div className={styles.fld}>
        <span>Дорожка</span>
        <div className={styles.segBtn}>
          {[1, 2].map((t) => (
            <button
              key={t}
              className={cn(track === t && styles.isOn)}
              onClick={() => handleTrackChange(t)}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
      <div className={styles.fld}>
        <span>Обложка сцены</span>
        {params.coverUrl ? (
          <div className={styles.coverPreviewWrapper}>
            <img src={params.coverUrl as string} className={styles.coverPreviewImg} alt="Обложка" />
          </div>
        ) : null}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleCoverUpload}
        />
        <button className={styles.btn} onClick={() => fileInputRef.current?.click()}>
          <i className="ti ti-upload" /> Загрузить обложку
        </button>
      </div>
      <SelectField
        label="Рендер-движок"
        value={params.renderingEngine as string}
        onChange={(v) => updateNodeParam(node.id, 'renderingEngine', v)}
        options={ENGINES}
      />
    </>
  )
}

export function TextParams({ node, params, updateNodeParam }: EEP) {
  return (
    <TextField
      label="Текстовое значение"
      defaultValue={params.text as string}
      onBlur={(v) => updateNodeParam(node.id, 'text', v)}
    />
  )
}
