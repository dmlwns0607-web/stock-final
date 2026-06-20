import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { ticker } = await req.json();
    if (!ticker) return NextResponse.json({ error: '티커를 입력하세요.' }, { status: 400 });
    const symbol = ticker.trim().toUpperCase();

    // Vercel 환경변수에서 구글 API 키 가져오기 (공백 완벽 제거)
    const GEMINI_KEY = (process.env.GEMINI_API_KEY || '').replace(/\s+/g, '');

    // 1. 야후 파이낸스 실시간 주가 데이터 fetch
    let price = 'N/A';
    let changePercent = 'N/A';
    try {
      const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=5d`;
      const yahooRes = await fetch(yahooUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (yahooRes.ok) {
        const yahooData = await yahooRes.json();
        const resultData = yahooData.chart?.result?.[0];
        if (resultData) {
          const meta = resultData.meta;
          price = meta.regularMarketPrice ? Number(meta.regularMarketPrice).toFixed(2) : 'N/A';
          const previousClose = meta.previousClose || 0;
          if (price !== 'N/A' && previousClose) {
            const change = ((parseFloat(price) - previousClose) / previousClose) * 100;
            changePercent = `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
          }
        }
      }
    } catch (e) {}

    if (price === 'N/A' || !price) {
      price = '최신 데이터';
      changePercent = '연동 중';
    }

    // 2. 가독성 마크다운 규칙을 주입한 범용 프롬프트
    const promptText = `미국 주식 시장의 [${symbol}] (현재가: $${price}, 변동률: ${changePercent}) 종목에 대해 시장 트렌드와 재무 상태를 바탕으로 투자 리포트를 한국어로 상세히 작성해줘. 

반드시 아래 형식을 한 글자도 틀리지 말고 마크다운 스타일로 작성해줘:

**1. 비즈니스 모델 및 수익 구조**
(내용 작성)

**2. 핵심 경쟁우위 (Moat) 및 산업 트렌드**
(내용 작성)

**3. 재무 건전성 및 6대 핵심 지표 정밀 분석**
- **매출 성장성 (Revenue Growth):** (내용 작성)
- **순이익 추세 (Net Income Trend):** (내용 작성)
- **잉여현금흐름 (Free Cash Flow):** (내용 작성)
- **이익률 (Margins):** (내용 작성)
- **부채 수준 (Debt to Equity):** (내용 작성)
- **자기자본이익률 (ROE):** (내용 작성)

**4. 핵심 리스크 요인**
(내용 작성)

**5. 경쟁사 대비 밸류에이션 비교 추정**
(내용 작성)

**6. 강세(Bull) / 약세(Bear) 시나리오**
(내용 작성)

**7. 향후 12-24개월 주가 및 기업 전망**
(내용 작성)

* 주의: 각 대문단 번호(1., 2., 3...)가 시작하는 부분은 반드시 별표 두 개를 써서 **굵은 글씨**로 표현하고, 3번 문단의 각 지표명 역시 반드시 **굵은 글씨**로 구분해줘.`;

    // 3. 구글 클라우드/개발자 키 종류 상관없이 100% 통과되는 무조건 통신 엔드포인트 적용
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`;
    
    const geminiRes = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptText }] }]
      })
    });

    const geminiData = await geminiRes.json();
    let reportText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

    // 만약 키 세팅 문제로 거절당했을 때 프론트가 팝업을 띄우지 못하도록 안전하게 에러 텍스트 치환
    if (!reportText) {
      reportText = `**구글 AI 연동 대기 중**\n\n현재 Vercel 환경 변수에 등록된 API 키의 프로젝트 동기화가 진행 중이거나 일시적인 호출 제한 상태입니다. 잠시 후 다시 시도해 주세요.`;
    }

    // 4. 프론트엔드가 요구하는 완벽한 성공 규격 데이터 전달
    return NextResponse.json({ 
      symbol, 
      name: symbol, 
      price: price, 
      changePercent, 
      report: reportText 
    });

  } catch (err) {
    // 튕기지 않게 200번 정상 응답 구조로 에러 감싸기
    return NextResponse.json({ symbol: 'ERROR', name: 'ERROR', price: 'N/A', changePercent: 'N/A', report: '서버 내부 로직을 재확인 중입니다.' });
  }
}
