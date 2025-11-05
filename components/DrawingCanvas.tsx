import React, { useState, useRef } from 'react';
import { View, StyleSheet, Dimensions, PanResponder } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

const CANVAS_SIZE = Math.min(Dimensions.get('window').width - 32, 400);

type DrawingCanvasProps = {
  color: string;
  brushSize: number;
  tool: 'brush' | 'eraser';
  onPathsChange: (paths: string[]) => void;
};

export const DrawingCanvas: React.FC<DrawingCanvasProps> = ({
  color,
  brushSize,
  tool,
  onPathsChange,
}) => {
  const [paths, setPaths] = useState<string[]>([]);
  const [currentPath, setCurrentPath] = useState<string>('');
  const pathStartRef = useRef<{ x: number; y: number } | null>(null);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        pathStartRef.current = { x: locationX, y: locationY };
        setCurrentPath(`M ${locationX} ${locationY}`);
      },
      onPanResponderMove: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        setCurrentPath((prev) => `${prev} L ${locationX} ${locationY}`);
      },
      onPanResponderRelease: () => {
        if (currentPath) {
          const newPaths = [...paths, currentPath];
          setPaths(newPaths);
          onPathsChange(newPaths);
          setCurrentPath('');
        }
        pathStartRef.current = null;
      },
    })
  ).current;

  const strokeColor = tool === 'eraser' ? '#000000' : color;
  const strokeWidth = tool === 'eraser' ? brushSize * 2 : brushSize;

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      <Svg width={CANVAS_SIZE} height={CANVAS_SIZE}>
        <Rect width={CANVAS_SIZE} height={CANVAS_SIZE} fill="#000000" />
        {paths.map((path, index) => (
          <Path
            key={index}
            d={path}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        ))}
        {currentPath && (
          <Path
            d={currentPath}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        )}
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: CANVAS_SIZE,
    height: CANVAS_SIZE,
    backgroundColor: '#000000',
    borderRadius: 12,
    overflow: 'hidden',
  },
});
