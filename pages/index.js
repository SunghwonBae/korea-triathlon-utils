import { useState, useEffect } from 'react';
import Head from 'next/head';
import Script from 'next/script';

export default function MainIndex() {

  // PWA 설치 관련 상태 관리
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallLayer, setShowInstallLayer] = useState(false);

  useEffect(() => {
    // 1. 브라우저의 설치 가능 이벤트를 가로챕니다.
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // 이미 설치되어 있지 않은 경우에만 레이어를 보여줍니다.
      setShowInstallLayer(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    // 설치 팝업 표시
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    }
    setDeferredPrompt(null);
    setShowInstallLayer(false);
  };

  const closeLayer = () => {
    setShowInstallLayer(false);
  };

  const menuItems = [
    { icon: "🏆", title: "IM CHART", desc: "IRONMAN 대회 기록 분석", url: "/report_ironman.html" },
    { icon: "🥇", title: "Tri-Gram", desc: "챌린지 대회 기록 분석", url: "/report_challenge.html" },
    { icon: "🏁", title: "TRI-ing", desc: "대한철인3종협회 기록 분석", url: "/report_triathlon.html" },
    { icon: "💾", title: "T-Memory", desc: "기록 저장 및 분석", url: "/triathlon_memory.html" },
    { icon: "🗂️", title: "T-Memory Report", desc: "기록 보고서 생성", url: "/memory_report.html" },
    { icon: "⚖️", title: "킹코스 완주시간", desc: "철인3종 예상 기록 계산", url: "/ironman_calculator.html" },
    { icon: "🍌", title: "보급 계산기", desc: "경기 중 필요한 에너지 보급량", url: "/gelwater_calculator.html" },
    { icon: "🚴", title: "기어비 케이던스", desc: "자전거 기어비 및 속도 계산", url: "/bike_calculator.html" },
    { icon: "🏔️", title: "업힐 분석기", desc: "경사도/파워별 기어비 분석", url: "/bike_uphill.html" },
    { icon: "🚴", title: "GPX to ZWO", desc: "코스 파일을 워크아웃으로 변환", url: "/bike_gpx_zwo.html" },
    { icon: "📊", title: "사이클 구간평속 분석", desc: "사이클 구간별속도 분석", url: "/cyclinganalyzer" },
    { icon: "🏃", title: "런 보폭/회전수", desc: "달리기 케이던스 및 보폭 계산", url: "/running_calculator.html" },
    { icon: "🏃", title: "런 페이스", desc: "목표 기록을 위한 페이스표", url: "/runpace_calculator.html" },
    { icon: "🏃", title: "런 마일리지", desc: "주간/월간 마일리지 관리", url: "/run_mileage_calculator.html" },
  ];

  const [displayItems, setDisplayItems] = useState(menuItems);

  useEffect(() => {
    const STORAGE_KEY = 'my_private_ddays';
    try {
      const privateData = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');

      if (privateData.length > 0) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const upcoming = privateData
          .filter(e => new Date(e.startDate) >= today)
          .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
          .slice(0, 2);

        const ddayItems = upcoming.map(event => {
          const eventDate = new Date(event.startDate);
          const diffTime = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate()).getTime() - today.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          let dDayStr = `D-${diffDays}`;
          if (diffDays === 0) dDayStr = 'D-DAY';

          return {
            isDday: true,
            id: event.id,
            title: event.title,
            desc: event.startDate,
            dday: dDayStr,
            url: `/dday.html?date=${event.startDate}`
          };
        });

        if (ddayItems.length > 0) {
          setDisplayItems([...ddayItems, ...menuItems]);
        }
      }
    } catch (error) {
      console.error("Error processing D-Day events:", error);
    }
  }, []);

  return (
    <div className="main-container">
      {/* PWA 설치 유도 레이어 */}
      {showInstallLayer && (
        <div className="install-overlay">
          <div className="install-card">
            <button className="close-btn" onClick={closeLayer}>&times;</button>
            <span className="install-icon">📲</span>
            <h3>KTriUtils 설치</h3>
            <p>홈 화면에 추가하면 브라우저 주소창 없이<br/>앱처럼 쾌적하게 사용할 수 있습니다.</p>
            <button className="install-action-btn" onClick={handleInstallClick}>홈 화면에 추가하기</button>
          </div>
        </div>
      )}
      <Script src="/back_exit_handler.js" strategy="afterInteractive" />
      <Head>
        <title>Korea Triathlon Utils</title>
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png"/>
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png"/>
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png"/>
        <link rel="manifest" href="/site.webmanifest"/>
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
          {displayItems.map((item, index) => {
            if (item.isDday) {
              return (
                <a key={item.id || index} href={item.url} className="menu-card dday-card">
                  <div className="dday-header">
                    <span className="dday-tag">{item.dday}</span>
                  </div>
                  <div className="card-text">
                    <span className="card-title">{item.title}</span>
                    <span className="card-desc">{item.desc}</span>
                  </div>
                </a>
              );
            }
            return (
              <a key={index} href={item.url} className="menu-card">
                <span className="card-icon">{item.icon}</span>
                <div className="card-text">
                  <span className="card-title">{item.title}</span>
                  <span className="card-desc">{item.desc}</span>
                </div>
              </a>
            );
          })}
        </div>
      </section>

      <footer className="main-footer">
        <p>2026 Korea Triathlon Utils.<br className="mobile-br"/> 🄯 Copyleft. Powered by 부천트라이 배성훤.</p>
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
          margin: -80px auto 20px;
          padding: 0 20px;
          position: relative;
          z-index: 50;
        }
        .menu-grid {
          display: grid;
          /* 수정됨: 1fr 대신 minmax(0, 1fr) 사용하여 텍스트가 길어도 강제로 늘어나지 않게 함 */
          grid-template-columns: repeat(4, minmax(0, 1fr));
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
          /* 수정됨: Flexbox/Grid 아이템이 내부 컨텐츠에 의해 늘어나는 것을 방지 */
          min-width: 0;
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
          width: 100%;
          min-width: 0;
        }
        .card-title {
          font-size: 1.2rem;
          font-weight: 700;
          color: #1f2937;
          margin-bottom: 8px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          display: block;
          width: 100%;
          /* 수정됨: 안전장치 추가 */
          max-width: 100%;
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
        @media (max-width: 1024px) {
          .menu-grid {
            /* 수정됨 */
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
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
          /* 수정됨 */
          .menu-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
          .menu-card {
            flex-direction: column;
            text-align: center;
            padding: 20px 10px;
            align-items: center;
            justify-content: flex-start;
            min-height: 150px;
          }
          .card-icon {
            font-size: 2.5rem;
            margin-bottom: 10px;
            margin-right: 0;
          }
          .card-title { font-size: 1rem; margin-bottom: 6px; word-break: keep-all; }
          .card-desc { font-size: 0.75rem; line-height: 1.3; color: #6b7280; }
        }

        /* 모바일 가로모드 (Landscape) 최적화 */
        @media (max-height: 600px) and (orientation: landscape) {
          .hero-header {
            padding: 30px 20px 70px;
          }
          .header-content h1 {
            font-size: 1.4rem;
            margin-bottom: 5px;
            position: relative;
            inset: auto !important;
            width: 100%;
            text-align: center;
          }
          .subtitle {
            font-size: 0.9rem;
          }
          .mobile-br { display: none; }
          .content-section {
            margin-top: -50px;
          }
          .menu-grid {
            /* 수정됨 */
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 12px;
          }
          .menu-card {
            flex-direction: column;
            text-align: center;
            padding: 15px 10px;
            align-items: center;
          }
          .card-icon {
            font-size: 2rem;
            margin-bottom: 8px;
            margin-right: 0;
          }
          .card-title { font-size: 0.95rem; }
          .card-desc { font-size: 0.8rem; line-height: 1.3; }
        }
        .dday-card {
          background: linear-gradient(135deg, #fff9e6, #fff2d1);
          border: 1px solid #ffe0b2;
          align-items: center;
          text-align: center;
          padding: 20px;
          justify-content: center;
        }
        .dday-card:hover {
          border-color: #ffc107;
        }
        .dday-header {
          margin-bottom: 25px;
        }
        .dday-tag {
          background-color: #ff9800;
          color: white;
          font-weight: 900;
          padding: 16px 20px;
          border-radius: 100px;
          font-size: 1.5rem;
          display: inline-block;
          box-shadow: 0 10px 6px rgba(255, 152, 0, 0.3);
          min-width: 100px;
          min-height: 70px;
        }
        .dday-card .card-text {
          text-align: center;
          width: 100%;
          overflow: hidden;
        }
        .dday-card .card-title {
          font-size: 1.15rem;
          color: #4a2c00;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          display: block;
          margin-bottom: 4px;
        }
        .dday-card .card-desc {
          color: #6d4c41;
          font-size: 0.95rem;
          font-weight: 600;
        }
        @media (max-width: 640px) {
          .dday-tag {
            font-size: 1.3rem;
            padding: 20px 16px;
            min-width: 80px;
            min-height: 60px;
          }
          .dday-card {
            padding: 12px;
          }
          .dday-header {
            margin-bottom: 10px;
          }
        }
        .install-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0, 0, 0, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }
        .install-card {
          background: white;
          padding: 30px;
          border-radius: 25px;
          width: 100%;
          max-width: 320px;
          text-align: center;
          position: relative;
          box-shadow: 0 20px 40px rgba(0,0,0,0.3);
          animation: slideUp 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        @keyframes slideUp {
          from { transform: translateY(50px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .close-btn {
          position: absolute;
          top: 15px; right: 15px;
          background: none; border: none;
          font-size: 24px; color: #9ca3af;
          cursor: pointer;
        }
        .install-icon { font-size: 3.5rem; display: block; margin-bottom: 15px; }
        .install-card h3 { margin: 0 0 10px; font-size: 1.3rem; color: #1f2937; }
        .install-card p { font-size: 0.95rem; color: #6b7280; line-height: 1.5; margin-bottom: 25px; }
        .install-action-btn {
          background: #0984e3;
          color: white;
          border: none;
          padding: 15px 30px;
          border-radius: 12px;
          font-weight: bold;
          width: 100%;
          font-size: 1rem;
          cursor: pointer;
          transition: background 0.2s;
        }
        .install-action-btn:active { background: #0773c5; }
      `}</style>
    </div>
  );
}