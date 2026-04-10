// Minimal root layout — pages are served as static HTML from public/
// This layout only wraps the API routes and any future TSX pages.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
