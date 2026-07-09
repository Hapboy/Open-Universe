import { edgeInput } from "../../../core/graph.ts";
import { HIGGSFIELD_PRESETS } from "../../../data/presets.ts";
import { WirableTextField, type EEP } from "./shared.tsx";
import { SelectField } from "../../components/SelectField/SelectField.tsx";
import { TextField } from "../../components/TextField/TextField.tsx";
import { RangeField } from "../../components/RangeField/RangeField.tsx";

export function SoulParams({ node, params, edges, resolved, updateNodeParam }: EEP) {
    const prompt = edgeInput(node.data, edges, resolved, 1);
    return (
        <>
            <WirableTextField
                label="Промпт стилизации"
                node={node}
                paramKey="prompt"
                params={params}
                wired={prompt.wired}
                liveValue={prompt.value}
                updateNodeParam={updateNodeParam}
            />
            <RangeField
                label="Влияние лица (Face Weight)"
                min={0}
                max={1}
                step={0.1}
                value={params.faceWeight as number}
                onChange={(v) => updateNodeParam(node.id, "faceWeight", v)}
            />
        </>
    );
}

export function CameraParams({ node, params, updateNodeParam }: EEP) {
    return (
        <SelectField
            label="Движение камеры (Пресет)"
            value={params.motionPreset as string}
            onChange={(v) => updateNodeParam(node.id, "motionPreset", v)}
            options={HIGGSFIELD_PRESETS}
        />
    );
}

export function SpeakParams({ node, params, updateNodeParam }: EEP) {
    return (
        <TextField
            label="Мимика / Липсинк Текст"
            defaultValue={params.expression as string}
            onBlur={(v) => updateNodeParam(node.id, "expression", v)}
        />
    );
}
