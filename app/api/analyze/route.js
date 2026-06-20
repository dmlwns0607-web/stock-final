import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { ticker } = await req.json();
    if (!ticker) return NextResponse.json({ error: '티커를 입력하세요.' }, { status: 400 });
    const symbol = ticker.trim().toUpperCase();

    // Vercel 환경변수에 등록된 구글 API 키를 가져옵니다.
    const GEMINI_KEY = (process.env.GEMINI_API_KEY || '').trim();

    // 1. 야후 파이낸스에서 실시간 주가 데이터 긁어오기
    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=5d`;
    const yahooRes = await fetch(yahooUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    
    let price = 'N/A';
    let changePercent = 'N/A';

    if (yahooRes.ok) {
      const yahooData = await yahooRes.json();
      const resultData = yahooData.chart?.result?.[0];
      if (resultData) {
        const meta = resultData.meta;
        price = meta.regularMarketPrice || 'N/A';
        const previousClose = meta.previousClose || 0;
        if (price !== 'N/A' && previousClose) {
          const change = ((price - previousClose) / previousClose) * 100;
          changePercent = `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
        }
      }
    }

    // 2. 제미나이 AI에게 실시간으로 던질 프롬프트 (요청하신 가독성 규칙 포함)
    const prompt = `너는 글로벌 최고 권위의 주식 심층 분석가이자 수석 연구원이야. 
미국 주식 시장의 [${symbol}] (실시간 현재가: $${price}, 전일 대비 변동률: ${changePercent}) 종목에 대해 시장 트렌드와 공개된 재무 데이터를 바탕으로 전문적인 투자 리포트를 한국어로 실시간 작성해줘. 

출력할 때 반드시 아래 형식을 정확히 지켜서 작성해줘:

**1. 비즈니스 모델 및 수익 구조**
(여기에 상세 내용 작성)

**2. 핵심 경쟁우위 (Moat) 및 산업 트렌드**
(여기에 상세 내용 작성)

**3. 재무 건전성 및 6대 핵심 지표 정밀 분석**
- **매출 성장성 (Revenue Growth):** (최신 추정 수치 및 설명)
- **순이익 추세 (Net Income Trend):** (최신 추정 수치 및 설명)
- **잉여현금흐름 (Free Cash Flow):** (최신 추정 수치 및 설명)
- **이익률 (Margins):** (최신 추정 수치 및 설명)
- **부채 수준 (Debt to Equity):** (최신 추정 수치 및 설명)
- **자기자본이익률 (ROE):** (최신 추정 수치 및 설명)

**4. 핵심 리스크 요인**
(여기에 상세 내용 작성)

**5. 경쟁사 대비 밸류에이션 비교 추정**
(여기에 상세 내용 작성)

**6. 강세(Bull) / 약세(Bear) 시나리오**
(여기에 상세 내용 작성)

**7. 향후 12-24개월 주가 및 기업 전망**
(여기에 상세 내용 작성)

* 주의: 각 대문단 번호(1., 2., 3...)가 시작하는 부분은 반드시 별표 두 개를 써서 **굵은 글씨**로 표현하고, 3번 문단의 각 지표명(**매출 성장성 (Revenue Growth):** 등) 역시 반드시 **굵은 글씨**로 구분해줘.`;

    // 3. 구글 AI 서버 최신 v1 규격 주소 호출 (가장 안정적인 1.5-flash 모델 적용)
    const geminiUrl = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`;

    const geminiRes = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      }),
    });

    const geminiData = await geminiRes.json();
    
    // 구글 서버 에러 핸들링
    if (geminiData.error) {
      return NextResponse.json({ error: `구글 AI 에러: ${geminiData.error.message} (모델 주소나 API 키를 확인하세요)` }, { status: 500 });
    }

    // 제미나이가 실시간으로 생성한 답변 텍스트 추출
    const reportText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '리포트 실시간 생성에 실패했습니다.';

    // 프론트엔드로 실시간 결과 전송
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
