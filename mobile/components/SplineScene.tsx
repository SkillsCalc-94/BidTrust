import React, { useEffect, useRef, useState } from 'react';
import { Platform, View, StyleSheet } from 'react-native';

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
 * Collapses to zero height until the scene finishes loading, so a slow or
 * failed CDN load never leaves a blank gap on the page.
 */
export default function SplineScene({ scene, height = 420 }: SplineSceneProps) {
  if (Platform.OS !== 'web') return null;

  const hostRef = useRef<View>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!document.querySelector(`script[src="${VIEWER_SRC}"]`)) {
      const script = document.createElement('script');
      script.type = 'module';
      script.src = VIEWER_SRC;
      document.head.appendChild(script);
    }

    const hostNode = hostRef.current as unknown as HTMLElement | null;
    if (!hostNode) return;

    const viewer = document.createElement('spline-viewer');
    viewer.setAttribute('url', scene);
    viewer.style.width = '100%';
    viewer.style.height = '100%';
    viewer.style.position = 'absolute';
    viewer.style.inset = '0';
    hostNode.appendChild(viewer);

    const onLoad = () => setLoaded(true);
    viewer.addEventListener('load-complete', onLoad);

    return () => {
      viewer.removeEventListener('load-complete', onLoad);
      viewer.remove();
    };
  }, [scene]);

  return (
    <View
      ref={hostRef}
      style={[
        styles.host,
        // Collapse until loaded — page never shows a blank gap
        loaded ? { height, opacity: 1 } : { height: 0, opacity: 0 },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  host: {
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 20,
  },
});
