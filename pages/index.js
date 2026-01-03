export default function MainIndex() {
  const safeNav = (e, url) => {
    e.preventDefault();
    window.location.href = url;
  };

  return (
    <div className="main-container">
      <header className="main-header">
        <h1>KOREA TRIATHLON UTILS</h1>
      </header>

      <section className="hero-section">
        <p className="subtitle">트라이애슬론 훈련 및 대회 분석 도구 모음</p>
        <div className="menu-grid">
          <a href="/ironman_calculator.html" onClick={(e) => safeNav(e, '/ironman_calculator.html')} className="menu-card">⚖️ 킹코스 완주시간</a>
          <a href="/gelwater_calculator.html" onClick={(e) => safeNav(e, '/gelwater_calculator.html')} className="menu-card">🍌 보급 계산기</a>
          <a href="/bike_calculator.html" onClick={(e) => safeNav(e, '/bike_calculator.html')} className="menu-card">🚴 기어비 케이던스</a>
          <a href="/bike_gpx_zwo.html" onClick={(e) => safeNav(e, '/bike_gpx_zwo.html')} className="menu-card">🚴 GPX to ZWO 변환</a>
          <a href="/cyclinganalyzer" onClick={(e) => safeNav(e, '/cyclinganalyzer')} className="menu-card highlight">📊 사이클 평속 분석</a>
          <a href="/running_calculator.html" onClick={(e) => safeNav(e, '/running_calculator.html')} className="menu-card">🏃 런 보폭/회전수</a>
          <a href="/runpace_calculator.html" onClick={(e) => safeNav(e, '/runpace_calculator.html')} className="menu-card">🏃 마라톤 페이스</a>
          <a href="/swimming_calculator.html" onClick={(e) => safeNav(e, '/swimming_calculator.html')} className="menu-card">🏊 수영 페이스</a>
        </div>
      </section>

      <style jsx>{`
        .main-container { min-height: 100vh; background: #f4f7fa; font-family: sans-serif; }
        .main-header { background: #0A317E; color: white; padding: 40px 20px; text-align: center; }
        .hero-section { max-width: 1000px; margin: 0 auto; padding: 40px 20px; }
        .subtitle { text-align: center; color: #666; margin-bottom: 40px; font-size: 1.2rem; }
        .menu-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 20px; }
        .menu-card { background: white; padding: 30px 20px; border-radius: 15px; text-decoration: none; color: #333; font-weight: bold; text-align: center; transition: 0.3s; box-shadow: 0 4px 6px rgba(0,0,0,0.05); border: 1px solid #eee; }
        .menu-card:hover { transform: translateY(-5px); box-shadow: 0 10px 20px rgba(0,0,0,0.1); border-color: #0A317E; color: #0A317E; }
        .menu-card.highlight { background: #eef2ff; border: 2px solid #0A317E; }
      `}</style>
    </div>
  );
}