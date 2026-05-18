import React, { useRef, useEffect, useCallback } from 'react';
import {
  View,
  TouchableOpacity,
  Animated,
  type LayoutChangeEvent,
} from 'react-native';
import { useTheme } from '@theme';
import { AppText } from './AppText';

interface SegmentedControlProps {
  segments: string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}

export const SegmentedControl: React.FC<SegmentedControlProps> = ({
  segments,
  selectedIndex,
  onSelect,
}) => {
  const { colors, borderRadius, spacing, shadows } = useTheme();
  const layouts = useRef<{ x: number; width: number }[]>([]);
  const indicatorAnim = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const widthAnim = useRef(new Animated.Value(0)).current;

  const animateTo = useCallback(
    (index: number) => {
      const layout = layouts.current[index];
      if (!layout) return;
      Animated.spring(indicatorAnim.x, {
        toValue: layout.x,
        friction: 8,
        tension: 300,
        useNativeDriver: true,
      }).start();
      Animated.spring(widthAnim, {
        toValue: layout.width,
        friction: 8,
        tension: 300,
        useNativeDriver: true,
      }).start();
    },
    [indicatorAnim.x, widthAnim],
  );

  useEffect(() => {
    animateTo(selectedIndex);
  }, [selectedIndex, animateTo]);

  const onSegmentLayout = (index: number) => (e: LayoutChangeEvent) => {
    const { x, width } = e.nativeEvent.layout;
    layouts.current[index] = { x, width };
    if (index === selectedIndex) {
      indicatorAnim.setValue({ x, y: 0 });
      widthAnim.setValue(width);
    }
  };

  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: colors.backgroundSecondary,
        borderRadius: borderRadius.md,
        padding: 2,
        marginHorizontal: spacing.md,
        marginTop: spacing.sm,
      }}
    >
      <Animated.View
        style={{
          position: 'absolute',
          left: 0,
          top: 2,
          bottom: 2,
          backgroundColor: colors.surface,
          borderRadius: borderRadius.sm,
          ...shadows.sm,
          transform: [{ translateX: indicatorAnim.x }],
          width: widthAnim,
        }}
      />
      {segments.map((segment, index) => (
        <TouchableOpacity
          key={segment}
          activeOpacity={1}
          onPress={() => onSelect(index)}
          onLayout={onSegmentLayout(index)}
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 10,
            zIndex: 1,
          }}
        >
          <AppText
            variant="body"
            style={{
              fontWeight: index === selectedIndex ? '700' : '500',
              fontSize: 14,
              color:
                index === selectedIndex
                  ? colors.textPrimary
                  : colors.textSecondary,
            }}
          >
            {segment}
          </AppText>
        </TouchableOpacity>
      ))}
    </View>
  );
};
