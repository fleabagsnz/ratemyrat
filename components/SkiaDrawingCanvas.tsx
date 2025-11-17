// components/SkiaDrawingCanvas.tsx
import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { StyleSheet } from 'react-native';
import {
  Canvas,
  Path,
  Skia,
  useTouchHandler,
  Group,
  Surface,
  ImageFormat,
} from '@shopify/react-native-skia';

export type SkiaCanvasHandle = {
  exportPng: () => Promise<string>; // base64 PNG
  clear: () => void;
};

type Stroke = {
  path: any;
  color: string;
  width: number;
};

type Props = {
  color: string;
  brushSize: number;
  backgroundColor?: string;
};

const CANVAS_SIZE = 300;

export const SkiaDrawingCanvas = forwardRef<SkiaCanvasHandle, Props>(
  ({ color, brushSize, backgroundColor = '#000000' }, ref) => {
    const [strokes, setStrokes] = useState<Stroke[]>([]);
    const currentStrokeRef = useRef<Stroke | null>(null);

    const touchHandler = useTouchHandler({
      onStart: (touch) => {
        const p = Skia.Path.Make();
        p.moveTo(touch.x, touch.y);

        const stroke: Stroke = {
          path: p,
          color,
          width: brushSize,
        };

        currentStrokeRef.current = stroke;
        setStrokes((prev) => [...prev, stroke]);
      },
      onActive: (touch) => {
        if (!currentStrokeRef.current) return;
        currentStrokeRef.current.path.lineTo(touch.x, touch.y);
        // We need to trigger a re-render since we mutated the path:
        setStrokes((prev) => [...prev]);
      },
      onEnd: () => {
        currentStrokeRef.current = null;
      },
    });

    useImperativeHandle(ref, () => ({
      exportPng: async () => {
        // offscreen render
        const surface = Skia.Surface.MakeOffscreen(CANVAS_SIZE, CANVAS_SIZE);
        const canvas = surface?.getCanvas();
        if (!canvas) {
          throw new Error('Could not create Skia surface');
        }

        // background
        const bgPaint = Skia.Paint();
        bgPaint.setColor(Skia.Color(backgroundColor));
        canvas.drawPaint(bgPaint);

        // draw all strokes
        strokes.forEach((s) => {
          const paint = Skia.Paint();
          paint.setColor(Skia.Color(s.color));
          paint.setStyle(1); // stroke
          paint.setStrokeWidth(s.width);
          paint.setStrokeCap(1); // round
          canvas.drawPath(s.path, paint);
        });

        const image = surface.makeImageSnapshot();
        const base64 = image.encodeToBase64(ImageFormat.PNG, 100);
        return base64;
      },
      clear: () => {
        setStrokes([]);
        currentStrokeRef.current = null;
      },
    }));

    return (
      <Canvas
        style={styles.canvas}
        onTouch={touchHandler}
      >
        <Group>
          {strokes.map((s, idx) => (
            <Path
              key={idx}
              path={s.path}
              color={s.color}
              style="stroke"
              strokeWidth={s.width}
              strokeCap="round"
              strokeJoin="round"
            />
          ))}
        </Group>
      </Canvas>
    );
  }
);

const styles = StyleSheet.create({
  canvas: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#000000',
    borderRadius: 12,
    overflow: 'hidden',
  },
});
