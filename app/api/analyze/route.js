import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { ticker } = await req.json();
    if (!ticker) return NextResponse.json({ error: '티커를 입력하세요.' }, { status: 400 });
    const symbol = ticker.trim().toUpperCase();

    const GEMINI_KEY = process.env.GEMINI_API_KEY;

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

    // 2. 완전 무료 구글 Gemini AI 모델에 리포트 요약 요청
    const prompt = `미국 주식 시장의 ${symbol} (현재가: $${price}, 전일 대비 변동률: ${changePercent}) 종목에 대한 최근 시장 평가와 기업 가치(PER/PBR 추정치 포함)를 바탕으로 간결하고 전문적인 투자 리포트를 한국어로 요약해서 작성해줘.`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        }),
      }
    );

    const geminiData = await geminiRes.json();
    
    // 만약 구글 AI가 에러를 뱉었을 경우 체크
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
