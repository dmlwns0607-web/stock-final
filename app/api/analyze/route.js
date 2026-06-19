import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { ticker } = await req.json();
    if (!ticker) return NextResponse.json({ error: '티커를 입력하세요.' }, { status: 400 });
    const symbol = ticker.trim().toUpperCase();

    const OPENAI_KEY = process.env.OPENAI_API_KEY;

    // 알파벤티지 제한을 우회하기 위해 야후 파이낸스 데이터 쿼리 사용
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

    // 실시간 가격 및 변동률 계산
    const meta = resultData.meta;
    const price = meta.regularMarketPrice || 'N/A';
    const previousClose = meta.previousClose || 0;
    let changePercent = 'N/A';
    
    if (price !== 'N/A' && previousClose) {
      const change = ((price - previousClose) / previousClose) * 100;
      changePercent = `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
    }

    // OpenAI에게 분석 요청 (기본 지표는 GPT가 최신 트렌드를 반영해 분석하도록 프롬프트 작성)
    const prompt = `미국 주식 시장의 ${symbol} (현재가: $${price}, 전일 대비 변동률: ${changePercent}) 종목에 대한 최근 시장 평가와 기업 가치(PER/PBR 추정치 포함)를 바탕으로 간결하고 전문적인 투자 리포트를 한국어로 요약해서 작성해줘.`;

    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1000,
      }),
    });

    const openaiData = await openaiRes.json();
    const reportText = openaiData.choices?.[0]?.message?.content || '리포트 생성 실패';

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
