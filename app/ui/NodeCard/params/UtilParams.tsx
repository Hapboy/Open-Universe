import type { EEP } from './shared.tsx'
import { SelectField } from '../../components/SelectField/SelectField.tsx'
import { TextField } from '../../components/TextField/TextField.tsx'

export function OutputParams({ node, params, updateNodeParam }: EEP) {
  const ENGINES = ['Hayverse Realtime Veo 3', 'Hayverse Draft', 'Hayverse Cinema 4K']
  return (
    <SelectField
      label="Рендер-движок"
      value={params.renderingEngine as string}
      onChange={(v) => updateNodeParam(node.id, 'renderingEngine', v)}
      options={ENGINES}
    />
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
