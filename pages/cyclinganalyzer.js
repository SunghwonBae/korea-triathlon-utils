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
    const menuBtn = document.getElementById('menuBtn');
    const menuClose = document.getElementById('menuClose');
    const slideMenu = document.getElementById('slideMenu');
    const menuOverlay = document.getElementById('menuOverlay');
    const folders = document.querySelectorAll('.folder-header');

    const toggleMenu = () => {
      slideMenu?.classList.toggle('active');
      menuOverlay?.classList.toggle('active');
    };

    menuBtn?.addEventListener('click', toggleMenu);
    menuClose?.addEventListener('click', toggleMenu);
    menuOverlay?.addEventListener('click', toggleMenu);

    folders.forEach(header => {
      header.onclick = () => {
        const submenu = header.nextElementSibling;
        const arrow = header.querySelector('.arrow');
        const isOpen = submenu?.style.display === 'block';
        document.querySelectorAll('.submenu-list').forEach(el => el.style.display = 'none');
        document.querySelectorAll('.arrow').forEach(el => el.style.transform = 'rotate(0deg)');
        if (!isOpen && submenu) {
          submenu.style.display = 'block';
          if (arrow) arrow.style.transform = 'rotate(180deg)';
        }
      };
    });

    return () => {
      menuBtn?.removeEventListener('click', toggleMenu);
      menuClose?.removeEventListener('click', toggleMenu);
      menuOverlay?.removeEventListener('click', toggleMenu);
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

      <header className="header-bar">
        <div className="logo"><a href="/" onClick={(e) => safeNav(e, '/')}>KOREA TRIATHLON</a></div>
        <button id="menuBtn" className="hamburger">☰</button>
      </header>

      <div id="menuOverlay" className="menu-overlay"></div>
      <nav id="slideMenu" className="slide-menu">
        <div className="menu-header">
          <h2>Korea Triathlon Utils</h2>
          <button id="menuClose" className="close-x">✕</button>
        </div>
        <ul className="menu-list">
          <li className="menu-folder">
            <div className="menu-link folder-header">
              <span>🧮 Utils</span>
              <span className="arrow">▼</span>
            </div>
            <ul className="submenu-list">
              <li><a href="/ironman_calculator.html" onClick={(e) => safeNav(e, '/ironman_calculator.html')} className="sub-item">⚖️킹코스 완주시간</a></li>
              <li><a href="/gelwater_calculator.html" onClick={(e) => safeNav(e, '/gelwater_calculator.html')} className="sub-item">🍌보급 계산</a></li>
              <li><a href="/bike_calculator.html" onClick={(e) => safeNav(e, '/bike_calculator.html')} className="sub-item">🚴싸이클 기어비 케이던스</a></li>
              <li><a href="/bike_gpx_zwo.html" onClick={(e) => safeNav(e, '/bike_gpx_zwo.html')} className="sub-item">🚴.gpx to .zwo 워크아웃생성</a></li>
              <li><a href="/cyclinganalyzer" onClick={(e) => safeNav(e, '/cyclinganalyzer')} className="sub-item current">📊싸이클구간 평속 분석리포트</a></li>
              <li><a href="/running_calculator.html" onClick={(e) => safeNav(e, '/running_calculator.html')} className="sub-item">🏃런 보폭 회전수</a></li>
              <li><a href="/runpace_calculator.html" onClick={(e) => safeNav(e, '/runpace_calculator.html')} className="sub-item">🏃마라톤 페이스 시뮬레이터</a></li>
              <li><a href="/swimming_calculator.html" onClick={(e) => safeNav(e, '/swimming_calculator.html')} className="sub-item">🏊수영 페이스 계산기</a></li>
            </ul>
          </li>
          <li><a href="/" onClick={(e) => safeNav(e, '/')} className="menu-link">🏠 홈으로</a></li>
        </ul>
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
        .header-bar { position: fixed; top: 0; width: 100%; height: 60px; background: #0A317E; display: flex; align-items: center; justify-content: space-between; padding: 0 20px; z-index: 1000; }
        .logo a { color: white; text-decoration: none; font-weight: bold; }
        .hamburger { background: none; border: none; color: white; font-size: 1.5rem; cursor: pointer; }
        .slide-menu { position: fixed; top: 0; right: -300px; width: 300px; height: 100%; background: white; z-index: 2000; transition: 0.3s; padding: 20px; box-shadow: -5px 0 15px rgba(0,0,0,0.1); overflow-y: auto; }
        :global(.slide-menu.active) { right: 0 !important; }
        .menu-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: none; z-index: 1500; }
        :global(.menu-overlay.active) { display: block !important; }
        .menu-link { display: block; padding: 15px; color: #333; text-decoration: none; border-bottom: 1px solid #eee; }
        .sub-item { display: block; padding: 12px 12px 12px 35px; color: #555; text-decoration: none; font-size: 0.9rem; border-bottom: 1px dashed #f0f0f0; }
        .sub-item.current { background: #eef2ff; color: #0A317E; font-weight: bold; }
        .main-content { display: flex; align-items: center; justify-content: center; min-height: 100vh; padding-top: 60px; }
        .card { background: white; padding: 40px; border-radius: 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); text-align: center; max-width: 400px; width: 100%; }
        .btn-on { width: 100%; padding: 15px; background: #0A317E; color: white; border: none; border-radius: 12px; font-weight: bold; cursor: pointer; }
        .btn-off { width: 100%; padding: 15px; background: #cbd5e1; color: white; border: none; border-radius: 12px; cursor: not-allowed; }
      `}</style>
    </div>
  );
}