// ...existing code...
import React, { useRef, useState, useEffect, useImperativeHandle } from 'react';
import { View, PanResponder, StyleSheet } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

type Tool = 'brush' | 'eraser';

export type DrawingCanvasProps = {
  color: string;
  brushSize: number;
  tool: Tool;
  onStroke?: () => void;
  onDrawingStart?: () => void;
  onDrawingEnd?: () => void;
  onStrokesChange?: (count: number) => void;
};

type Stroke = {
  color: string;
  width: number;
  d: string;
};

export type DrawingCanvasHandle = {
  undo: () => void;
  rootRef: View | null;
};

export const DrawingCanvas = React.forwardRef<DrawingCanvasHandle, DrawingCanvasProps>(
  (
    { color, brushSize, tool, onStroke, onDrawingStart, onDrawingEnd, onStrokesChange },
    ref
  ) => {
    const [strokes, setStrokes] = useState<Stroke[]>([]);
    const currentPath = useRef<string>('');
    const viewRef = useRef<View>(null);

    // keep latest props in refs so PanResponder handlers always use current values
    const colorRef = useRef(color);
    const brushRef = useRef(brushSize);
    const toolRef = useRef(tool);
    const onStrokeRef = useRef(onStroke);
    const onDrawingStartRef = useRef(onDrawingStart);
    const onDrawingEndRef = useRef(onDrawingEnd);
    const onStrokesChangeRef = useRef(onStrokesChange);

    useEffect(() => { colorRef.current = color; }, [color]);
    useEffect(() => { brushRef.current = brushSize; }, [brushSize]);
    useEffect(() => { toolRef.current = tool; }, [tool]);
    useEffect(() => { onStrokeRef.current = onStroke; }, [onStroke]);
    useEffect(() => { onDrawingStartRef.current = onDrawingStart; }, [onDrawingStart]);
    useEffect(() => { onDrawingEndRef.current = onDrawingEnd; }, [onDrawingEnd]);
    useEffect(() => { onStrokesChangeRef.current = onStrokesChange; }, [onStrokesChange]);
    useEffect(() => {
      onStrokesChangeRef.current?.(strokes.length);
    }, [strokes.length]);

    const touchStartedAt = useRef<{ x: number; y: number } | null>(null);
    const hasMovedRef = useRef(false);

    const undo = () => {
      setStrokes((prev) => {
        if (prev.length === 0) return prev;
        return prev.slice(0, -1);
      });
      currentPath.current = '';
      hasMovedRef.current = false;
      touchStartedAt.current = null;
    };

    const finalizeStroke = () => {
      setStrokes((prev) => {
        if (prev.length === 0) return prev;
        const next = [...prev];
        const lastIndex = next.length - 1;

        // If the user only tapped (no move events), turn it into a tiny segment
        // so it renders as a dot instead of being dropped.
        if (!hasMovedRef.current && touchStartedAt.current) {
          const { x, y } = touchStartedAt.current;
          const tinyOffset = 0.1;
          next[lastIndex] = {
            ...next[lastIndex],
            d: `M ${x} ${y} L ${x + tinyOffset} ${y + tinyOffset}`,
          };
        }

        return next;
      });

      currentPath.current = '';
      hasMovedRef.current = false;
      touchStartedAt.current = null;
      onDrawingEndRef.current?.();
    };

    const panResponder = useRef(
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt) => {
          onDrawingStartRef.current?.();

          const { locationX, locationY } = evt.nativeEvent;
          const strokeColor = toolRef.current === 'eraser' ? '#000000' : colorRef.current;
          currentPath.current = `M ${locationX} ${locationY}`;
          touchStartedAt.current = { x: locationX, y: locationY };
          hasMovedRef.current = false;
          setStrokes((prev) => [
            ...prev,
            {
              color: strokeColor,
              width: brushRef.current,
              d: currentPath.current,
            },
          ]);
          onStrokeRef.current?.();
        },
        onPanResponderMove: (evt) => {
          const { locationX, locationY } = evt.nativeEvent;
          // append to current path string
          currentPath.current += ` L ${locationX} ${locationY}`;
          hasMovedRef.current = true;
          setStrokes((prev) => {
            if (prev.length === 0) return prev;
            const next = [...prev];
            next[next.length - 1] = {
              ...next[next.length - 1],
              d: currentPath.current,
            };
            return next;
          });
        },
        onPanResponderRelease: () => {
          finalizeStroke();
        },
        onPanResponderTerminate: () => {
          finalizeStroke();
        },
      })
    ).current;

    useImperativeHandle(ref, () => ({
      undo,
      rootRef: viewRef.current,
    }));

    return (
      <View ref={viewRef} style={styles.wrapper} {...panResponder.panHandlers}>
        <Svg width="100%" height="100%">
          <Rect x={0} y={0} width="100%" height="100%" fill="#000000" />
          {strokes.map((s, idx) => {
            // skip empty or degenerate paths to avoid CoreGraphics warnings
            if (!s.d || s.d.trim().length === 0) return null;
            return (
              <Path
                key={idx}
                d={s.d}
                stroke={s.color}
                strokeWidth={s.width}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            );
          })}
        </Svg>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#000',
    borderRadius: 12,
    overflow: 'hidden',
  },
});
// ...existing code...
