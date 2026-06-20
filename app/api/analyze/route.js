import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

// 1. Vercel 환경 변수에서 API 키를 안전하게 가져옵니다.
const apiKey = process.env.GEMINI_API_KEY;

// 2. 구글 AI 최신 SDK 초기화 (API 키가 없어도 빌드 시 에러가 나지 않도록 안전장치 추가)
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export async function POST(request: Request) {
  try {
    // 프론트엔드에서 보낸 주식 티커(예: aapl, amzn) 및 데이터를 받습니다.
    const { ticker, stockData } = await await request.json();

    if (!ticker) {
      return NextResponse.json({ error: "티커가 누락되었습니다." }, { status: 400 });
    }

    // API 키가 없을 때 화면이 완전히 뻗지 않도록 핸들링
    if (!ai) {
      return NextResponse.json({
        error: "models/gemini-1.5-flash is not found",
        details: "Vercel 환경 변수에 GEMINI_API_KEY가 올바르게 등록되지 않았거나 동기화 대기 중입니다."
      }, { status: 401 });
    }

    // 3. 구글에서 공식 지정한 최신 표준 프리티어 모델 'gemini-1.5-flash' 호출
    // 옛날 모델명인 'gemini-pro'를 절대 사용하지 않아 구글 서버 차단을 원천 봉쇄합니다.
    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `너는 전문 주식 분석가야. 다음 주식 종목(${ticker.toUpperCase()})의 최근 데이터와 지표를 분석해서 깔끔한 한국어 투자 리포트를 마크다운 양식으로 작성해 줘. 한눈에 보기 쉽게 요약과 결론을 꼭 포함해 줘.\n\n[주가 데이터]\n${JSON.stringify(stockData, null, 2)}`
            }
          ]
        }
      ]
    });

    // 구글 서버가 보내온 분석 리포트 텍스트 추출
    const reportText = response.text || "리포트를 생성할 수 없습니다.";

    // 프론트엔드로 리포트 결과 반환
    return NextResponse.json({ text: reportText });

  } catch (error: any) {
    console.error("구글 Gemini API 연동 에러 발생:", error);
    
    // 에러 발생 시 프론트엔드에 구글 서버 메시지를 명확히 전달하여 디버깅을 돕습니다.
    return NextResponse.json({
      error: error.message || "구글 AI 실시간 연동 에러 발생",
      details: "모델명 호환성 혹은 API Key 권한을 다시 확인해 주세요."
    }, { status: 500 });
  }
}
