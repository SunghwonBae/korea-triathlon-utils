import Head from 'next/head';

export default function MainIndex() {
  const safeNav = (e, url) => {
    e.preventDefault();
    window.location.href = url;
  };

  const menuItems = [
    { icon: "⚖️", title: "킹코스 완주시간", desc: "철인3종 예상 기록 계산", url: "/ironman_calculator.html" },
    { icon: "🍌", title: "보급 계산기", desc: "경기 중 필요한 에너지 보급량", url: "/gelwater_calculator.html" },
    { icon: "🚴", title: "기어비 케이던스", desc: "자전거 기어비 및 속도 계산", url: "/bike_calculator.html" },
    { icon: "🚴", title: "GPX to ZWO", desc: "코스 파일을 워크아웃으로 변환", url: "/bike_gpx_zwo.html" },
    { icon: "📊", title: "사이클 평속 분석", desc: "라이딩 구간별속도 분석 리포트생성", url: "/cyclinganalyzer" },
    { icon: "🏃", title: "런 보폭/회전수", desc: "달리기 케이던스 및 보폭 계산", url: "/running_calculator.html" },
    { icon: "🏃", title: "런 페이스", desc: "목표 기록을 위한 페이스표", url: "/runpace_calculator.html" },
    { icon: "🏃", title: "런 마일리지", desc: "주간/월간 마일리지 관리", url: "/run_mileage_calculator.html" },
  ];

  return (
    <div className="main-container">
      <Head>
        <title>Korea Triathlon Utils</title>
        <link rel="icon" href="/favicon.ico" />
        <link rel="manifest" href="/site.webmanifest" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <header className="hero-header">
        <div className="header-content">
          <h1>KOREA TRIATHLON UTILS</h1>
          <p className="subtitle">철인3종 훈련과 경기력 향상을 위한<br className="mobile-br"/> 스마트한 분석 도구 모음</p>
        </div>
      </header>

      <section className="content-section">
        <div className="menu-grid">
          {menuItems.map((item, index) => (
            <a key={index} href={item.url} onClick={(e) => safeNav(e, item.url)} className="menu-card">
              <span className="card-icon">{item.icon}</span>
              <div className="card-text">
                <span className="card-title">{item.title}</span>
                <span className="card-desc">{item.desc}</span>
              </div>
            </a>
          ))}
        </div>
      </section>

      <footer className="main-footer">
        <p>2026 Korea Triathlon Utils. 🄯 Copyleft. Powered by 부천트라이 배성훤.</p>
      </footer>

      <style jsx>{`
        .main-container {
          min-height: 100vh;
          background-color: #f8f9fc;
          font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, Roboto, sans-serif;
        }
        .hero-header {
          background: linear-gradient(135deg, #0A317E 0%, #1e40af 100%);
          color: white;
          padding: 80px 20px 120px;
          text-align: center;
          position: relative;
          border-bottom-left-radius: 30px;
          border-bottom-right-radius: 30px;
          box-shadow: 0 10px 30px rgba(10, 49, 126, 0.2);
          z-index: 1;
        }
        .header-content h1 {
          font-size: 2.2rem;
          font-weight: 800;
          margin: 0 0 15px 0;
          letter-spacing: -0.02em;
          text-shadow: 0 2px 4px rgba(0,0,0,0.1);
          color: #ffffff;
        }
        .subtitle {
          font-size: 1.1rem;
          color: #e0e7ff;
          line-height: 1.6;
          font-weight: 400;
          margin: 0;
        }
        .mobile-br { display: none; }
        .content-section {
          max-width: 1100px;
          margin: -80px auto 40px;
          padding: 0 20px;
          position: relative;
          z-index: 50;
        }
        .menu-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
          gap: 20px;
        }
        .menu-card {
          background: white;
          padding: 30px 20px;
          border-radius: 20px;
          text-decoration: none;
          color: #333;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
          border: 1px solid rgba(255,255,255,0.5);
          cursor: pointer;
          user-select: none;
          -webkit-tap-highlight-color: transparent;
        }
        .menu-card:hover {
          transform: translateY(-8px);
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
          border-color: #e0e7ff;
        }
        .menu-card:active {
          transform: scale(0.98);
          background-color: #f3f4f6;
        }
        .card-icon {
          font-size: 3rem;
          margin-bottom: 15px;
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));
        }
        .card-text {
          display: flex;
          flex-direction: column;
          flex: 1;
        }
        .card-title {
          font-size: 1.2rem;
          font-weight: 700;
          color: #1f2937;
          margin-bottom: 8px;
        }
        .card-desc {
          font-size: 0.9rem;
          color: #6b7280;
          line-height: 1.4;
        }
        .main-footer {
          text-align: center;
          padding: 40px 20px;
          color: #9ca3af;
          font-size: 0.85rem;
        }
        @media (max-width: 640px) {
          .hero-header {
            padding: 60px 10px 100px;
            border-radius: 0 0 20px 20px;
          }
          .header-content h1 { 
            font-size: 1.6rem; 
            letter-spacing: -0.05em;
            width: 100%;
            margin-left: 0;
            margin-right: 0;
            inset: 13px auto auto 50px !important;
          }
          .subtitle { font-size: 1rem; }
          .mobile-br { display: block; }
          .menu-grid { grid-template-columns: 1fr; gap: 15px; }
          .menu-card {
            flex-direction: row;
            text-align: left;
            padding: 20px;
            align-items: center;
          }
          .card-icon {
            font-size: 2.5rem;
            margin-bottom: 0;
            margin-right: 20px;
          }
          .card-title { margin-bottom: 4px; }
        }
      `}</style>
    </div>
  );
}