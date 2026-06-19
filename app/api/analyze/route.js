import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { ticker } = await req.json();
    if (!ticker) return NextResponse.json({ error: '티커를 입력하세요.' }, { status: 400 });
    const symbol = ticker.trim().toUpperCase();

    const AV_KEY = process.env.ALPHA_VANTAGE_API_KEY;
    const OPENAI_KEY = process.env.OPENAI_API_KEY;

    const overviewRes = await fetch(`https://www.alphavantage.co/query?function=OVERVIEW&symbol=${symbol}&apikey=${AV_KEY}`);
    const overview = await overviewRes.json();
    const quoteRes = await fetch(`https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${AV_KEY}`);
    const quote = await quoteRes.json();

    if (!overview || !overview.Symbol) {
      return NextResponse.json({ error: '존재하지 않는 티커입니다.' }, { status: 404 });
    }

    const price = quote['Global Quote']?.['05. price'] || 'N/A';
    const change = quote['Global Quote']?.['10. change percent'] || 'N/A';

    const prompt = `주식 ${overview.Name} (${symbol})의 현재가 $${price} (${change}) 및 PER:${overview.PERatio}, PBR:${overview.PriceToBookRatio} 데이터를 바탕으로 투자 리포트를 간결하게 한국어로 요약해줘.`;

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

    return NextResponse.json({ symbol, name: overview.Name, price, changePercent: change, report: reportText });
  } catch (err) {
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
