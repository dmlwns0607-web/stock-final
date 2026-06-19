export const metadata = {
  title: 'AI 주식 분석기',
  description: 'AI를 활용한 주식 분석 리포트 생성기',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body style={{ margin: 0, backgroundColor: '#ffffff' }}>
        {children}
      </body>
    </html>
  );
}
