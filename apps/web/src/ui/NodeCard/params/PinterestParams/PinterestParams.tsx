import cn from "classnames";
import type { NodeRef, PinItem, BoardItem } from "@/types.ts";
import type { NodeParamsProps } from "@/ui/NodeCard/params/shared.tsx";
import { SelectField } from "@/ui/components/SelectField/SelectField.tsx";
import styles from "@/ui/NodeCard/params/PinterestParams/PinterestParams.module.css";

export function PinterestParams({
    node,
    params,
    updateNodeParam,
    loadPinterestPins,
}: {
    node: NodeRef;
    params: Record<string, unknown>;
    updateNodeParam: NodeParamsProps["updateNodeParam"];
    loadPinterestPins: NodeParamsProps["loadPinterestPins"];
}) {
    const boards = (params.boards as BoardItem[]) || [];
    const pins = (params.pins as PinItem[]) || [];

    const handleBoardChange = async (id: string) => {
        const name = boards.find((b) => b.id === id)?.name ?? "";
        updateNodeParam(node.id, "boardId", id);
        updateNodeParam(node.id, "boardName", name);
        await loadPinterestPins(node, id);
    };

    return (
        <>
            <SelectField
                label="Pinterest Доска"
                value={(params.boardId as string) || ""}
                onChange={handleBoardChange}
                options={
                    boards.length === 0
                        ? [
                              {
                                  value: "",
                                  label: "Подключите Pinterest в профиле, чтобы увидеть доски...",
                              },
                          ]
                        : boards.map((b) => ({ value: b.id, label: b.name }))
                }
            />
            <div className={styles.fld}>
                <span>Выберите изображение (Pin)</span>
                <div className={styles.pinterestPinsGrid}>
                    {pins.map((p) => (
                        <div
                            key={p.id}
                            className={cn(
                                styles.pinterestPinItem,
                                params.selectedPin === p.image && styles.isSelected,
                            )}
                            style={{ backgroundImage: `url('${p.image}')` }}
                            title={p.title}
                            onClick={() => {
                                updateNodeParam(node.id, "selectedPin", p.image);
                            }}
                        />
                    ))}
                </div>
            </div>
        </>
    );
}
