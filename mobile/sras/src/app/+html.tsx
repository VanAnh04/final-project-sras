import { type PropsWithChildren } from 'react';

/**
 * Root HTML template for Expo Router Web.
 * Cung cấp bộ font sans-serif chuẩn hỗ trợ đầy đủ tiếng Việt cho nền tảng web,
 * loại bỏ hoàn toàn lỗi hiển thị ký tự tiếng Việt bị nhảy sang font serif (Times New Roman) trên Windows.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="vi">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <style
          id="expo-root-font-fix"
          dangerouslySetInnerHTML={{
            __html: `
              html, body, #root, [dir], [dir="auto"] {
                font-family: 'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
                -webkit-font-smoothing: antialiased;
                -moz-osx-font-smoothing: grayscale;
              }
              div[dir="auto"], span[dir="auto"], input, textarea {
                font-family: 'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
              }
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
