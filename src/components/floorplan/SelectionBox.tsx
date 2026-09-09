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
      keepRatio={false}
      enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right', 'middle-left', 'middle-right', 'top-center', 'bottom-center']}
      borderStroke="#171717"
      borderStrokeWidth={1.5}
      borderDash={[3, 3]}
      anchorFill="#FFFFFF"
      anchorStroke="#171717"
      anchorStrokeWidth={1.5}
      anchorSize={10}
      anchorCornerRadius={3}
      onTransformEnd={() => {
        if (!trRef.current) return;
        const node = trRef.current.nodes()[0];
        if (!node) return;

        const scaleX = node.scaleX();
        const scaleY = node.scaleY();

        // Reset scale and recalculate width/height
        node.scaleX(1);
        node.scaleY(1);

        const rawW = node.width() || (node.getClientRect ? node.getClientRect().width / (scaleX || 1) : 80);
        const rawH = node.height() || (node.getClientRect ? node.getClientRect().height / (scaleY || 1) : 80);

        const newW = Math.max(30, Math.round(rawW * scaleX));
        const newH = Math.max(30, Math.round(rawH * scaleY));

        onTransformEnd({
          x: Math.round(node.x()),
          y: Math.round(node.y()),
          width: newW,
          height: newH,
          rotation: Math.round(node.rotation())
        });
      }}
    />
  );
};
