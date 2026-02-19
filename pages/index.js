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

  // 모바일 기기 체크 공통 함수
const isMobile = () => /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

// 토스 클릭 핸들러
const handleTossClick = (event, accountNo) => {
  if (!isMobile()) {
    event.preventDefault();
    navigator.clipboard.writeText(accountNo).then(() => {
      document.getElementById('tossModal').style.display = 'flex';
    });
  }
}

// 카카오페이 클릭 핸들러
const handleKakaoClick = (event) => {
  if (!isMobile()) {
    event.preventDefault();
    document.getElementById('kakaoModal').style.display = 'flex';
  }
}

// 모달 닫기 공통 함수
const closeQrModal = (modalId) => {
  document.getElementById(modalId).style.display = 'none';
}

  const menuItems = [
    { icon: "📅", title: "D-Day", desc: "D-Day 관리", url: "/dday.html" },
    { icon: "🏆", title: "IM CHART", desc: "IRONMAN 대회 기록 분석", url: "/report/report_ironman.html" },
    { icon: "🥇", title: "Tri-Gram", desc: "챌린지 대회 기록 분석", url: "/report/report_challenge.html" },
    { icon: "🏁", title: "TRI-ing", desc: "대한철인3종협회 기록 분석", url: "/report/report_triathlon.html" },
    { icon: "💾", title: "T-Memory", desc: "기록 저장 및 분석", url: "/report/triathlon_memory.html" },
    { icon: "🗂️", title: "T-Memory Report", desc: "기록 보고서 생성", url: "/report/memory_report.html" },
    { icon: "📈", title: "대회 통계 비교", desc: "여러 대회 기록 비교 분석", url: "/report/report_all_v2.html" },
    { icon: "👑", title: "킹코스 완주 기록", desc: "2019년까지 킹완주자 기록", url: "/report/report_old_king.html" },
    { icon: "🔍", title: "아이언맨 통합 기록검색기", desc: "아이언맨 대회기록검색", url: "/report/ironman_records_search_all.html" },
    { icon: "📸", title: "IM 트래커 캡처기록", desc: "트래커 캡처에서 기록 추출", url: "/report/ironman_tracker_capture_records.html" },
    { icon: "📊", title: "사이클 구간평속 분석", desc: "사이클 구간별속도 분석", url: "/cyclinganalyzer" },
    { icon: "⚖️", title: "킹코스 완주시간", desc: "철인3종 예상 기록 계산", url: "/util/ironman_calculator.html" },
    { icon: "🍌", title: "보급 계산기", desc: "경기 중 필요한 에너지 보급량", url: "/util/gelwater_calculator.html" },
    { icon: "🚴", title: "기어비 케이던스", desc: "자전거 기어비 및 속도 계산", url: "/util/bike_calculator.html" },
    { icon: "🏔️", title: "업힐 분석기", desc: "경사도/파워별 기어비 분석", url: "/util/bike_uphill.html" },
    { icon: "🚴", title: "GPX to ZWO", desc: "코스 파일을 워크아웃으로 변환", url: "/util/bike_gpx_zwo.html" },
    { icon: "🚴", title: "AI 바이크핏 분석", desc: "AI 기반 바이크핏 분석", url: "/util/bikefit.html" },
    { icon: "🏃", title: "런 보폭/회전수", desc: "달리기 케이던스 및 보폭 계산", url: "/util/running_calculator.html" },
    { icon: "🏃", title: "런 페이스", desc: "목표 기록을 위한 페이스표", url: "/util/runpace_calculator.html" },
    { icon: "🏃", title: "런 마일리지", desc: "주간/월간 마일리지 관리", url: "/util/run_mileage_calculator.html" },
    { icon: "🏊", title: "수영 CSS 계산기", desc: "지속 가능한 수영 속도 분석", url: "/util/swim_css_calculator.html" },
    { icon: "🏊", title: "수영 SWOLF 분석기", desc: "효율적인 수영을 위한 SWOLF", url: "/util/swim_swolf_calculator.html" },
    { icon: "🚨", title: "수영 컷오프 계산기", desc: "대회 컷오프 시간 계산", url: "/util/swim_cutoff_calculator.html" },
    { icon: "🌊", title: "수영 오픈워터 변환기", desc: "오픈워터 수영 기록 변환", url: "/util/swim_ows_calculator.html" },
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
      <Script src="/js/back_exit_handler.js" strategy="afterInteractive" />
      <Head>
        <title>Korea Triathlon Utils</title>
        <link rel="apple-touch-icon" sizes="180x180" href="/favicon/apple-touch-icon.png"/>
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon/favicon-32x32.png"/>
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon/favicon-16x16.png"/>
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
        <div className="donation-section">
          <div className="donation-card">
            <p className="donation-text">⚡ 더 나은 서비스를 위해 파워젤 한개 후원하기</p>
            <div className="donation-btn-group">
              <a href="Supertoss://send?amount=0&bank=%EC%B9%B4%EC%B9%B4%EC%98%A4%EB%B1%85%ED%81%AC&accountNo=3333137635297&origin=qr" className="btn-toss" onClick={(e) => handleTossClick(e, '3333137635297')}>
                <img src="/img/Toss_Symbol_Primary.png" width="20" height="20" alt="Toss" className="btn-icon"/>
                Toss 후원
              </a>
              <a href="https://qr.kakaopay.com/Ej8KxM6os" target="_blank" className="btn-kakao" onClick={handleKakaoClick}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="#3C1E1E" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 3c-5.5 0-10 3.6-10 8 0 3 2 5.5 4.9 7l-1.2 4.5c-.1.4.3.7.6.5l5.4-3.5c.1 0 .3 0 .4 0 5.5 0 10-3.6 10-8s-4.5-8-10-8z"/>
                </svg>
                카카오페이
              </a>
            </div>
          </div>
        </div>
          <div id="tossModal" className="qr-modal-overlay" onClick={() => closeQrModal('tossModal')}>
            <div className="qr-modal-content" onclick="event.stopPropagation()">
                <h3 style={{ color: '#0064FF' }}>Toss로 후원하기</h3>
                <p>계좌번호가 복사되었습니다!</p>
                <div className="account-badge toss-bg">카카오뱅크 3333137635297</div>
                <img src="/img/toss_qr.jpg" alt="Toss QR" className="qr-image"/>
                <button className="qr-btn-close" onClick={() => closeQrModal('tossModal')}>닫기</button>
            </div>
            </div>

            <div id="kakaoModal" className="qr-modal-overlay" onClick={() => closeQrModal('kakaoModal')}>
            <div className="qr-modal-content" onclick="event.stopPropagation()">
                <h3 style={{ color: '#3C1E1E' }}>카카오페이 후원</h3>
                <p>카톡앱으로 QR코드를 스캔하세요.</p>
                <div className="account-badge kakao-bg">카카오페이 송금코드</div>
                <img src="/img/Kakaopay_qr.png" alt="KakaoPay QR" className="qr-image"/>
                <button className="qr-btn-close" onClick={() => closeQrModal('kakaoModal')}>닫기</button>
            </div>
            </div>
        <p className="copyright">
          2026 Korea Triathlon Utils.<br className="mobile-br"/> 
           🄯 Copyleft. Powered by <a href='https://cafe.naver.com/swimbikerun' target="_blank">부천트라이</a> 배성훤.
        </p>
        <p className="special-link">
          특별링크!! 내란대장경 : <a href="https://mhrk.campaignus.me/rebellion" target="_blank">https://mhrk.campaignus.me/rebellion</a>
        </p>
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
          font-size: 1rem;
        }
/* 공통 모달 스타일 */
.qr-modal-overlay {
  display: none;
  position: fixed;
  top: 0; left: 0;
  width: 100%; height: 100%;
  background: rgba(0, 0, 0, 0.7);
  z-index: 9999;
  justify-content: center;
  align-items: center;
}

.qr-modal-content {
  background: white;
  padding: 30px;
  border-radius: 24px;
  text-align: center !important;
  width: 90%;
  max-width: 320px;
}

.qr-image {
  width: 100%;
  max-width: 200px;
  margin: 15px auto;
  display: block;
  border: 1px solid #f0f0f0;
  border-radius: 12px;
}

/* 계좌 정보 뱃지 컬러 구분 */
.account-badge {
  padding: 10px;
  border-radius: 10px;
  font-weight: bold;
  font-size: 14px;
}
.toss-bg { background: #f0f5ff; color: #0064FF; }
.kakao-bg { background: #fff9c4; color: #3c1e1e; }

.qr-btn-close {
  margin-top: 10px;
  width: 100%;
  padding: 12px;
  border: none;
  border-radius: 12px;
  background: #f5f5f5;
  cursor: pointer;
  font-weight: bold;
}
        .donation-section { max-width: 400px; margin: 0 auto 50px; padding: 0 15px; }
        .donation-card {
          background: white; padding: 24px; border-radius: 20px;
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.06); border: 1px solid #f1f5f9;
        }
        .donation-text {
          color: #1e293b !important; font-weight: 600; font-size: 0.8rem;
          margin-bottom: 18px !important; display: block;
        }
        .donation-btn-group { display: flex; gap: 8px; }
        .btn-toss, .btn-kakao {
          flex: 1; height: 48px; border-radius: 12px; font-weight: 600; font-size: 0.8rem;
          text-decoration: none; display: flex; align-items: center; justify-content: center; gap: 8px;
          transition: transform 0.1s;
        }
        .btn-toss { background-color: #f2f5f9; color: #333d4b !important; }
        .btn-kakao { background-color: #FFEB00; color: #3C1E1E !important; }
        .btn-toss:active, .btn-kakao:active { transform: scale(0.97); }
        .copyright { color: #94a3b8; font-size: 0.8rem; line-height: 1.6; }
        .special-link { font-size: 0.8rem; }
        .special-link a { color: #cbd5e1; text-decoration: underline; }
        @media (max-width: 480px) {
            .btn-toss, .btn-kakao {height:38px;}
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