'use client';

import { useState } from 'react';

export default function Home() {
  const [ticker, setTicker] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleAnalyze = async () => {
    if (!ticker) return alert('티커를 입력하세요!');
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult(data);
      } else {
        alert(data.error || '오류가 발생했습니다.');
      }
    } catch (err) {
      alert('서버와 통신 중 오류가 발생했습니다.');
    }
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: '600px', margin: '50px auto', padding: '20px', fontFamily: 'sans-serif' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '30px' }}>📊 AI 주식 분석기</h1>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="예: AAPL, NVDA, TSLA"
          value={ticker}
          onChange={(e) => setTicker(e.target.value)}
          style={{ flex: 1, padding: '12px', fontSize: '16px', borderRadius: '8px', border: '1px solid #ccc' }}
        />
        <button
          onClick={handleAnalyze}
          disabled={loading}
          style={{ padding: '12px 24px', fontSize: '16px', borderRadius: '8px', border: 'none', backgroundColor: '#0070f3', color: '#fff', cursor: 'pointer', fontWeight: 'bold' }}
        >
          {loading ? '분석 중...' : '분석하기'}
        </button>
      </div>

      {result && (
        <div style={{ marginTop: '30px', padding: '20px', borderRadius: '8px', backgroundColor: '#f5f5f7', border: '1px solid #e5e5ea' }}>
          <h2>{result.name} ({result.symbol})</h2>
          <p style={{ fontSize: '18px', fontWeight: 'bold' }}>
            현재가: ${result.price} 
            <span style={{ marginLeft: '10px', color: result.changePercent.includes('-') ? '#ff3b30' : '#34c759' }}>
              ({result.changePercent})
            </span>
          </p>
          <hr style={{ border: '0', borderTop: '1px solid #d1d1d6', margin: '20px 0' }} />
          <h3 style={{ marginBottom: '10px' }}>🤖 AI 투자 리포트 요약</h3>
          <p style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6', color: '#3a3a3c' }}>{result.report}</p>
        </div>
      )}
    </div>
  );
}
