'use client';

import React, { useEffect, useRef } from 'react';
import { Transformer } from 'react-konva';
import Konva from 'konva';

interface SelectionBoxProps {
  selectedId: string | null;
  isEditable: boolean;
  onTransformEnd: (newAttrs: {
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
  }) => void;
}

export const SelectionBox: React.FC<SelectionBoxProps> = ({
  selectedId,
  isEditable,
  onTransformEnd
}) => {
  const trRef = useRef<Konva.Transformer>(null);

  useEffect(() => {
    if (!trRef.current) return;
    const stage = trRef.current.getStage();
    if (!stage) return;

    if (selectedId && isEditable) {
      const selectedNode = stage.findOne(`#${selectedId}`);
      if (selectedNode) {
        trRef.current.nodes([selectedNode]);
        trRef.current.getLayer()?.batchDraw();
        return;
      }
    }
    trRef.current.nodes([]);
    trRef.current.getLayer()?.batchDraw();
  }, [selectedId, isEditable]);

  if (!isEditable) return null;

  return (
    <Transformer
      ref={trRef}
      boundBoxFunc={(oldBox, newBox) => {
        // Enforce minimum dimension of 30px
        if (newBox.width < 30 || newBox.height < 30) {
          return oldBox;
        }
        return newBox;
      }}
      rotateEnabled={true}
      resizeEnabled={true}
      borderStroke="#171717"
      borderStrokeWidth={1.5}
      borderDash={[3, 3]}
      anchorFill="#FFFFFF"
      anchorStroke="#171717"
      anchorStrokeWidth={1.5}
      anchorSize={8}
      anchorCornerRadius={2}
      onTransformEnd={() => {
        if (!trRef.current) return;
        const node = trRef.current.nodes()[0];
        if (!node) return;

        const scaleX = node.scaleX();
        const scaleY = node.scaleY();

        // Reset scale and recalculate width/height
        node.scaleX(1);
        node.scaleY(1);

        onTransformEnd({
          x: Math.round(node.x()),
          y: Math.round(node.y()),
          width: Math.max(30, Math.round(node.width() * scaleX)),
          height: Math.max(30, Math.round(node.height() * scaleY)),
          rotation: Math.round(node.rotation())
        });
      }}
    />
  );
};
