import React, { useEffect, useRef, useState } from 'react';
import { Platform, View, StyleSheet, ActivityIndicator } from 'react-native';

interface SplineSceneProps {
  /** Spline scene URL, e.g. https://prod.spline.design/xxxx/scene.splinecode */
  scene: string;
  height?: number;
}

const VIEWER_SRC = 'https://unpkg.com/@splinetool/viewer@1.9.82/build/spline-viewer.js';

/**
 * Web-only Spline 3D scene embed.
 * Loads the official spline-viewer web component from CDN at runtime,
 * so it adds zero weight to the native app bundle. Returns null on iOS/Android.
 */
export default function SplineScene({ scene, height = 420 }: SplineSceneProps) {
  if (Platform.OS !== 'web') return null;

  const hostRef = useRef<View>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Inject the spline-viewer script once
    if (!document.querySelector(`script[src="${VIEWER_SRC}"]`)) {
      const script = document.createElement('script');
      script.type = 'module';
      script.src = VIEWER_SRC;
      document.head.appendChild(script);
    }

    // Mount the <spline-viewer> custom element into our host View's DOM node
    const hostNode = hostRef.current as unknown as HTMLElement | null;
    if (!hostNode) return;

    const viewer = document.createElement('spline-viewer');
    viewer.setAttribute('url', scene);
    viewer.setAttribute('loading-anim-type', 'spinner-small-dark');
    viewer.style.width = '100%';
    viewer.style.height = '100%';
    viewer.style.position = 'absolute';
    viewer.style.inset = '0';
    hostNode.appendChild(viewer);

    const onLoad = () => setLoading(false);
    viewer.addEventListener('load-complete', onLoad);
    // Fallback: hide spinner after a few seconds even if the event doesn't fire
    const timer = setTimeout(() => setLoading(false), 6000);

    return () => {
      clearTimeout(timer);
      viewer.removeEventListener('load-complete', onLoad);
      viewer.remove();
    };
  }, [scene]);

  return (
    <View ref={hostRef} style={[styles.host, { height }]}>
      {loading && (
        <View style={styles.loader} pointerEvents="none">
          <ActivityIndicator size="large" color="#e94560" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 20,
  },
  loader: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
});
