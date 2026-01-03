import { useState, useEffect } from 'react';
import Head from 'next/head';

export default function CyclingAnalyzer() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const menuBtn = document.getElementById('menuToggle');
    const menuClose = document.getElementById('menuClose');
    const slideMenu = document.getElementById('slideMenu');
    const menuOverlay = document.getElementById('menuOverlay');

    const toggleMenu = (show) => {
      if (show) {
        slideMenu?.classList.add('is-active');
        menuOverlay?.classList.add('is-active');
        document.body.style.overflow = 'hidden';
      } else {
        slideMenu?.classList.remove('is-active');
        menuOverlay?.classList.remove('is-active');
        document.body.style.overflow = '';
      }
    };

    const openMenu = () => toggleMenu(true);
    const closeMenu = () => toggleMenu(false);

    menuBtn?.addEventListener('click', openMenu);
    menuClose?.addEventListener('click', closeMenu);
    menuOverlay?.addEventListener('click', closeMenu);

    return () => {
      menuBtn?.removeEventListener('click', openMenu);
      menuClose?.removeEventListener('click', closeMenu);
      menuOverlay?.removeEventListener('click', closeMenu);
    };
  }, [mounted]);

  // 안전한 이동을 위한 보호막 함수
  const safeNav = (e, url) => {
    e.preventDefault();
    window.location.href = url;
  };

  const handleUpload = async () => {
    if (!file) return alert("엑셀 파일을 선택해주세요.");
    setLoading(true);
    const cleanTitle = file.name.replace(/\.[^/.]+$/, "");
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', cleanTitle);
    try {
      const res = await fetch('/api/convert', { method: 'POST', body: formData });
      if (!res.ok) throw new Error("분석 중 오류 발생");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${cleanTitle}_분석리포트.html`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      <Head><title>사이클 구간 분석기 | 부천트라이</title></Head>

      <div className="header-section">
        <button id="menuToggle" className="menu-btn" aria-label="메뉴 열기">☰</button>
        <h1>📊 사이클 구간 분석기</h1>
      </div>

      <div id="menuOverlay" className="menu-overlay"></div>
      <nav id="slideMenu" className="slide-menu">
        <div className="menu-header">
          <h2>Korea Triathlon Utils</h2>
          <button id="menuClose" className="menu-close-btn">✕</button>
        </div>
        <ul className="menu-list">
          <li className="menu-folder">
            <div className="menu-link folder-header" style={{cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <span>🧮 Utils</span>
              <span className="arrow" style={{transform: 'rotate(180deg)', transition: 'transform 0.3s'}}>▼</span>
            </div>
            {/* 하위 메뉴 펼쳐진 상태로 고정 */}
            <ul className="submenu-list" style={{display: 'block', backgroundColor: '#f8f9fa', listStyle: 'none', padding: 0}}>
              <li><a href="/ironman_calculator.html" onClick={(e) => safeNav(e, '/ironman_calculator.html')} className="menu-link" style={{paddingLeft: '30px', fontSize: '0.95rem'}}>⚖️킹코스 완주시간</a></li>
              <li><a href="/gelwater_calculator.html" onClick={(e) => safeNav(e, '/gelwater_calculator.html')} className="menu-link" style={{paddingLeft: '30px', fontSize: '0.95rem'}}>🍌보급 계산</a></li>
              <li><a href="/bike_calculator.html" onClick={(e) => safeNav(e, '/bike_calculator.html')} className="menu-link" style={{paddingLeft: '30px', fontSize: '0.95rem'}}>🚴싸이클 기어비 케이던스</a></li>
              <li><a href="/bike_gpx_zwo.html" onClick={(e) => safeNav(e, '/bike_gpx_zwo.html')} className="menu-link" style={{paddingLeft: '30px', fontSize: '0.95rem'}}>🚴.gpx to .zwo 워크아웃생성</a></li>
              <li><a href="/cyclinganalyzer" onClick={(e) => safeNav(e, '/cyclinganalyzer')} className="menu-link" style={{paddingLeft: '30px', fontSize: '0.95rem', fontWeight: 'bold', color: '#0A317E', borderLeft: '5px solid #0A317E', backgroundColor: '#eef2ff'}}>📊싸이클구간 평속 분석리포트</a></li>
              <li><a href="/running_calculator.html" onClick={(e) => safeNav(e, '/running_calculator.html')} className="menu-link" style={{paddingLeft: '30px', fontSize: '0.95rem'}}>🏃런 보폭 회전수</a></li>
              <li><a href="/runpace_calculator.html" onClick={(e) => safeNav(e, '/runpace_calculator.html')} className="menu-link" style={{paddingLeft: '30px', fontSize: '0.95rem'}}>🏃런 페이스</a></li>
              <li><a href="/run_mileage_calculator.html" onClick={(e) => safeNav(e, '/run_mileage_calculator.html')} className="menu-link" style={{paddingLeft: '30px', fontSize: '0.95rem'}}>🏃런 마일리지</a></li>
            </ul>
          </li>
          <li><a href="/" onClick={(e) => safeNav(e, '/')} className="menu-link">🏠 홈으로</a></li>
        </ul>
        <div className="menu-footer">
            <img src="powered_by_strava.png" alt="Powered by Strava" />
        </div>
      </nav>

      <main className="main-content">
        <div className="card">
          <div className="emoji">🏁</div>
          <h1>Cycling Analyzer</h1>
          <p>엑셀 파일을 업로드하여 구간 리포트를 생성하세요.</p>
          <div className="file-input"><input type="file" accept=".xlsx, .csv" onChange={(e) => setFile(e.target.files[0])} /></div>
          <button onClick={handleUpload} disabled={loading} className={loading ? "btn-off" : "btn-on"}>
            {loading ? "분석 중..." : "리포트 생성"}
          </button>
        </div>
      </main>

      <style jsx>{`
        /* bucheonTriStyle.css에서 제공하지 않는 로컬 스타일만 유지 */
        .main-content { display: flex; align-items: center; justify-content: center; min-height: 100vh; }
        .card { background: white; padding: 40px; border-radius: 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); text-align: center; max-width: 400px; width: 100%; }
        .file-input { margin: 20px 0; }
        .btn-on { width: 100%; padding: 15px; background: #0A317E; color: white; border: none; border-radius: 12px; font-weight: bold; cursor: pointer; }
        .btn-off { width: 100%; padding: 15px; background: #cbd5e1; color: white; border: none; border-radius: 12px; cursor: not-allowed; }
      `}</style>
    </div>
  );
}