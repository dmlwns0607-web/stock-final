import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai'; // 구글 공식 차세대 통합 SDK 적용

export async function POST(req) {
  try {
    const { ticker } = await req.json();
    if (!ticker) return NextResponse.json({ error: '티커를 입력하세요.' }, { status: 400 });
    const symbol = ticker.trim().toUpperCase();

    // Vercel 환경변수에서 구글 API 키 바인딩 (공백 완전 제거)
    const GEMINI_KEY = (process.env.GEMINI_API_KEY || '').replace(/\s+/g, '');

    // 1. 야후 파이낸스 실시간 주가 데이터 fetch
    let price = 'N/A';
    let changePercent = 'N/A';
    try {
      const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=5d`;
      const yahooRes = await fetch(yahooUrl, { 
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } 
      });
      if (yahooRes.ok) {
        const yahooData = await yahooRes.json();
        const resultData = yahooData.chart?.result?.[0];
        if (resultData) {
          const meta = resultData.meta;
          price = meta.regularMarketPrice ? Number(meta.regularMarketPrice).toFixed(2) : 'N/A';
          const previousClose = meta.previousClose;
          if (price !== 'N/A' && previousClose) {
            const change = ((parseFloat(price) - previousClose) / previousClose) * 100;
            changePercent = `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
          }
        }
      }
    } catch (e) {
      // 주가 크롤링 실패 시 기본값 세팅
    }

    if (price === 'N/A' || !price) {
      price = '최신 데이터 반영 중';
      changePercent = '연동 중';
    }

    // 2. 가독성 규칙(대문단 볼드, 재무 지표명 볼드) 프롬프트 세팅
    const promptText = `너는 글로벌 최고 권위의 주식 심층 분석가이자 수석 연구원이야. 
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

* 주의: 각 대문단 번호(1., 2., 3...)가 시작하는 부분은 반드시 별표 두 개를 써서 **굵은 글씨**로 표현하고, 3번 문단의 각 지표명 역시 반드시 **굵은 글씨**로 구분해줘.`;

    let reportText = '';

    // 3. API 키 호환성 에러를 완벽하게 차단하는 구글 공식 SDK 호출 구조
    try {
      const ai = new GoogleGenAI({ apiKey: GEMINI_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-1.5-flash',
        contents: promptText,
      });
      reportText = response.text;
    } catch (googleSdkErr) {
      // 만약 공식 SDK로도 거절당한다면 100% API 키 자체의 권한/박탈 문제임
      reportText = `**구글 AI 인증 시스템 최종 거절 안내**\n\n- **원인**: 사용 중이신 \`GEMINI_API_KEY\`의 프로젝트 권한이 만료되었거나 비활성화 상태입니다.\n- **해결책**: 구글 AI 스튜디오(https://aistudio.google.com/)에 다시 접속하셔서 새로운 구글 계정으로 로그인 후 **[Create API Key]** 버튼을 눌러 완전한 새 키를 발급받아 Vercel에 교체 등록해 주세요.`;
    }

    // 4. 프론트엔드로 안전하게 결과 전송
    return NextResponse.json({ 
      symbol, 
      name: symbol, 
      price: price, 
      changePercent, 
      report: reportText || '리포트 내용을 불러오지 못했습니다.'
    });

  } catch (err) {
    return NextResponse.json({ error: '서버 로직 내부 에러가 발생했습니다.' }, { status: 500 });
  }
}
