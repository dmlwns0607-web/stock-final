import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { ticker } = await req.json();
    if (!ticker) return NextResponse.json({ error: '티커를 입력하세요.' }, { status: 400 });
    const symbol = ticker.trim().toUpperCase();

    const GEMINI_KEY = (process.env.GEMINI_API_KEY || '').trim();

    // 1. 야후 파이낸스 주식 데이터 호출
    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`;
    const yahooRes = await fetch(yahooUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    
    if (!yahooRes.ok) {
      return NextResponse.json({ error: '존재하지 않거나 불러올 수 없는 티커입니다.' }, { status: 404 });
    }

    const yahooData = await yahooRes.json();
    const resultData = yahooData.chart?.result?.[0];
    
    if (!resultData) {
      return NextResponse.json({ error: '주식 데이터를 찾을 수 없습니다.' }, { status: 404 });
    }

    const meta = resultData.meta;
    const price = meta.regularMarketPrice || 'N/A';
    const previousClose = meta.previousClose || 0;
    let changePercent = 'N/A';
    
    if (price !== 'N/A' && previousClose) {
      const change = ((price - previousClose) / previousClose) * 100;
      changePercent = `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
    }

    // 2. 요청하신 모든 심층 분석 항목을 포함한 초고형 프롬프트 작성
    const prompt = `미국 주식 시장의 ${symbol} (현재가: $${price}, 전일 대비 변동률: ${changePercent}) 종목에 대해 다음 항목들을 빠짐없이 심층 분석하여 전문적인 투자 리포트를 한국어로 작성해줘. 눈에 잘 들어오게 줄바꿈과 기호(■, *, -)를 적극적으로 활용해줘.

[필수 분석 항목]
1. 비즈니스 모델 및 수익 구조
2. 핵심 경쟁우위 (Moat) 및 산업 트렌드
3. 재무 건전성 상세 분석 (매출 성장성, 순이익 추세, 잉여현금흐름(FCF), 이익률, 부채 수준, ROE)
4. 핵심 리스크 요인
5. 경쟁사 대비 밸류에이션 비교 추정
6. 강세(Bull) / 약세(Bear) 시나리오
7. 향후 12-24개월 주가 및 기업 전망`;

    // 에러를 원천 차단하는 구글 정식 v1 주소 형식 (models 앞에 /를 명확히 세팅)
    const geminiUrl = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`;

    const geminiRes = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      }),
    });

    const geminiData = await geminiRes.json();
    
    // 구글 API 에러 체크
    if (geminiData.error) {
      return NextResponse.json({ error: `AI 에러: ${geminiData.error.message}` }, { status: 500 });
    }

    const reportText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '리포트 생성 실패';

    return NextResponse.json({ 
      symbol, 
      name: symbol, 
      price: price.toString(), 
      changePercent, 
      report: reportText 
    });
  } catch (err) {
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
