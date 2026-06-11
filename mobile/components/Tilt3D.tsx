import React, { useRef, useEffect } from 'react';
import { Animated, Platform, View, StyleSheet } from 'react-native';

interface Tilt3DProps {
  children: React.ReactNode;
  /** Max tilt in degrees */
  maxTilt?: number;
  /** Spotlight glow color */
  glowColor?: string;
  style?: any;
}

/**
 * Interactive 3D tilt wrapper.
 * Web: tracks the cursor and tilts with perspective; a spotlight glow follows the mouse.
 * Native: runs a slow idle float + tilt loop so the element feels alive without a cursor.
 */
export default function Tilt3D({ children, maxTilt = 14, glowColor = '#e94560', style }: Tilt3DProps) {
  const rotateX = useRef(new Animated.Value(0)).current;
  const rotateY = useRef(new Animated.Value(0)).current;
  const floatY = useRef(new Animated.Value(0)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const glowX = useRef(new Animated.Value(0)).current;
  const glowY = useRef(new Animated.Value(0)).current;
  const containerRef = useRef<View>(null);

  // Idle float loop (all platforms) + idle sway on native
  useEffect(() => {
    const float = Animated.loop(
      Animated.sequence([
        Animated.timing(floatY, { toValue: -8, duration: 2200, useNativeDriver: true }),
        Animated.timing(floatY, { toValue: 0, duration: 2200, useNativeDriver: true }),
      ])
    );
    float.start();

    let sway: Animated.CompositeAnimation | null = null;
    if (Platform.OS !== 'web') {
      sway = Animated.loop(
        Animated.sequence([
          Animated.timing(rotateY, { toValue: maxTilt * 0.5, duration: 3000, useNativeDriver: true }),
          Animated.timing(rotateY, { toValue: -maxTilt * 0.5, duration: 3000, useNativeDriver: true }),
          Animated.timing(rotateY, { toValue: 0, duration: 3000, useNativeDriver: true }),
        ])
      );
      sway.start();
    }
    return () => {
      float.stop();
      sway?.stop();
    };
  }, []);

  const webHandlers =
    Platform.OS === 'web'
      ? {
          onMouseMove: (e: any) => {
            const node = containerRef.current as any;
            const rect = node?.getBoundingClientRect?.() || (e.currentTarget as any)?.getBoundingClientRect?.();
            if (!rect) return;
            const px = (e.clientX - rect.left) / rect.width;  // 0..1
            const py = (e.clientY - rect.top) / rect.height;  // 0..1
            Animated.spring(rotateY, { toValue: (px - 0.5) * 2 * maxTilt, useNativeDriver: true, speed: 30, bounciness: 4 }).start();
            Animated.spring(rotateX, { toValue: -(py - 0.5) * 2 * maxTilt, useNativeDriver: true, speed: 30, bounciness: 4 }).start();
            glowX.setValue(e.clientX - rect.left - 110);
            glowY.setValue(e.clientY - rect.top - 110);
          },
          onMouseEnter: () => {
            Animated.timing(glowOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
          },
          onMouseLeave: () => {
            Animated.spring(rotateX, { toValue: 0, useNativeDriver: true, speed: 12 }).start();
            Animated.spring(rotateY, { toValue: 0, useNativeDriver: true, speed: 12 }).start();
            Animated.timing(glowOpacity, { toValue: 0, duration: 300, useNativeDriver: true }).start();
          },
        }
      : {};

  return (
    <View ref={containerRef} style={[styles.wrapper, style]} {...(webHandlers as any)}>
      {/* Spotlight glow following cursor (web only renders meaningfully) */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.glow,
          {
            backgroundColor: glowColor,
            opacity: glowOpacity.interpolate({ inputRange: [0, 1], outputRange: [0, 0.18] }),
            transform: [{ translateX: glowX }, { translateY: glowY }],
          },
        ]}
      />
      <Animated.View
        style={{
          transform: [
            { perspective: 900 },
            { translateY: floatY },
            {
              rotateX: rotateX.interpolate({
                inputRange: [-90, 90],
                outputRange: ['-90deg', '90deg'],
              }),
            },
            {
              rotateY: rotateY.interpolate({
                inputRange: [-90, 90],
                outputRange: ['-90deg', '90deg'],
              }),
            },
          ],
        }}
      >
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  glow: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    top: 0,
    left: 0,
    zIndex: 1,
    ...(Platform.OS === 'web' ? ({ filter: 'blur(60px)' } as any) : {}),
  },
});
