// ...existing code...
import React, { useRef, useState, useEffect } from 'react';
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
};

type Stroke = {
  color: string;
  width: number;
  d: string;
};

export const DrawingCanvas = React.forwardRef<View, DrawingCanvasProps>(
  ({ color, brushSize, tool, onStroke, onDrawingStart, onDrawingEnd }, ref) => {
    const [strokes, setStrokes] = useState<Stroke[]>([]);
    const currentPath = useRef<string>('');

    // keep latest props in refs so PanResponder handlers always use current values
    const colorRef = useRef(color);
    const brushRef = useRef(brushSize);
    const toolRef = useRef(tool);
    const onStrokeRef = useRef(onStroke);
    const onDrawingStartRef = useRef(onDrawingStart);
    const onDrawingEndRef = useRef(onDrawingEnd);

    useEffect(() => { colorRef.current = color; }, [color]);
    useEffect(() => { brushRef.current = brushSize; }, [brushSize]);
    useEffect(() => { toolRef.current = tool; }, [tool]);
    useEffect(() => { onStrokeRef.current = onStroke; }, [onStroke]);
    useEffect(() => { onDrawingStartRef.current = onDrawingStart; }, [onDrawingStart]);
    useEffect(() => { onDrawingEndRef.current = onDrawingEnd; }, [onDrawingEnd]);

    const panResponder = useRef(
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt) => {
          onDrawingStartRef.current?.();

          const { locationX, locationY } = evt.nativeEvent;
          const strokeColor = toolRef.current === 'eraser' ? '#000000' : colorRef.current;
          currentPath.current = `M ${locationX} ${locationY}`;
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
          // drop any degenerate single-point strokes to avoid empty/invalid path rendering
          setStrokes((prev) => prev.filter((s) => typeof s.d === 'string' && s.d.includes(' L ')));
          currentPath.current = '';
          onDrawingEndRef.current?.();
        },
        onPanResponderTerminate: () => {
          setStrokes((prev) => prev.filter((s) => typeof s.d === 'string' && s.d.includes(' L ')));
          currentPath.current = '';
          onDrawingEndRef.current?.();
        },
      })
    ).current;

    return (
      <View ref={ref} style={styles.wrapper} {...panResponder.panHandlers}>
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