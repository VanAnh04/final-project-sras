import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { CALL_ENGINE_HTML } from '../../realtime/callEngineHtml';
import { callManager } from '../../realtime/callManager';

/**
 * WebView 1×1 ẩn chạy WebRTC (xem callEngineHtml.ts). Không có giao diện — chỉ nối lệnh/sự kiện giữa
 * callManager và trang. CallOverlay chỉ render component này khi đang có cuộc gọi cần âm thanh.
 */
export default function CallEngine() {
  const webRef = useRef<WebView>(null);

  useEffect(() => {
    callManager.attachEngine((cmd) =>
      webRef.current?.injectJavaScript(
        `window.__callEngine&&window.__callEngine.handle(${JSON.stringify(cmd)});true;`,
      ),
    );
    return () => callManager.detachEngine();
  }, []);

  return (
    <View pointerEvents="none" style={styles.hidden}>
      <WebView
        ref={webRef}
        // https → secure context, điều kiện bắt buộc của getUserMedia.
        source={{ html: CALL_ENGINE_HTML, baseUrl: 'https://localhost/' }}
        originWhitelist={['*']}
        javaScriptEnabled
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        mediaCapturePermissionGrantType="grant"
        onMessage={(e) => callManager.onEngineMessage(e.nativeEvent.data)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  hidden: { position: 'absolute', width: 1, height: 1, opacity: 0, left: 0, top: 0 },
});
