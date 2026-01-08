import { useState, useEffect } from 'react';
import Head from 'next/head';
import Script from 'next/script';

export default function CyclingAnalyzer() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);
  const [isLinkOpen, setIsLinkOpen] = useState(true);
  const [isUtilsOpen, setIsUtilsOpen] = useState(true);
  const [isReportsOpen, setIsReportsOpen] = useState(true);

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
    <div className="min-h-screen bg-[#f4f7f9]">
      <Script src="/back_exit_handler.js" strategy="afterInteractive" />
      <Head>
        <title>📊 사이클 구간평속 리포트 생성</title>
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png"/>
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png"/>
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png"/>
        <link rel="manifest" href="/site.webmanifest"/>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="google" content="notranslate" />
      </Head>

      <div className="header-section">
        <button id="menuToggle" className="menu-btn" aria-label="메뉴 열기">☰</button>
        <h1>📊 사이클 구간평속 리포트 생성</h1>
      </div>

      <div id="menuOverlay" className="menu-overlay"></div>
      <nav id="slideMenu" className="slide-menu">
        <div className="menu-header">
          <h2>Korea Triathlon Utils</h2>
          <button id="menuClose" className="menu-close-btn">✕</button>
        </div>
        <ul className="menu-list">
          <li><a href="/" onClick={(e) => safeNav(e, '/')} className="menu-link">🏠 홈으로</a></li>
           {/* Reports 메뉴 임시 비공개 */}
          {/* <li className="menu-folder">
            <div className="menu-link folder-header" onClick={() => setIsReportsOpen(!isReportsOpen)} style={{cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <span>📊 Reports</span>
              <span className="arrow" style={{transform: isReportsOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s'}}>▼</span>
            </div>
            <ul className="submenu-list" style={{display: isReportsOpen ? 'block' : 'none', backgroundColor: '#f8f9fa', listStyle: 'none', padding: 0}}>
              <li><a href="/report_ironman.html" onClick={(e) => safeNav(e, '/report_ironman.html')} className="menu-link" style={{paddingLeft: '30px', fontSize: '0.95rem'}}>🔴 IM CHART</a></li>
              <li><a href="/report_challenge.html" onClick={(e) => safeNav(e, '/report_challenge.html')} className="menu-link" style={{paddingLeft: '30px', fontSize: '0.95rem'}}>🟠 Tri-Gram #CHALLENGE</a></li>
              <li><a href="/report_triathlon.html" onClick={(e) => safeNav(e, '/report_triathlon.html')} className="menu-link" style={{paddingLeft: '30px', fontSize: '0.95rem'}}>🔵 TRI-ing My Best!</a></li>
              <li><a href="/cyclinganalyzer" onClick={(e) => safeNav(e, '/cyclinganalyzer')} className="menu-link" style={{paddingLeft: '30px', fontSize: '0.95rem', fontWeight: 'bold', color: '#007bff', borderLeft: '5px solid #007bff', backgroundColor: '#eef2ff'}}>📊 사이클 구간평속 분석</a></li>
            </ul>
          </li>*/}
          <li className="menu-folder">
            <div className="menu-link folder-header" onClick={() => setIsUtilsOpen(!isUtilsOpen)} style={{cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <span>🧮 Utils</span>
              <span className="arrow" style={{transform: isUtilsOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s'}}>▼</span>
            </div>
            <ul className="submenu-list" style={{display: isUtilsOpen ? 'block' : 'none', backgroundColor: '#f8f9fa', listStyle: 'none', padding: 0}}>
              <li><a href="/ironman_calculator.html" onClick={(e) => safeNav(e, '/ironman_calculator.html')} className="menu-link" style={{paddingLeft: '30px', fontSize: '0.95rem'}}>⚖️ 킹코스 완주시간</a></li>
              <li><a href="/gelwater_calculator.html" onClick={(e) => safeNav(e, '/gelwater_calculator.html')} className="menu-link" style={{paddingLeft: '30px', fontSize: '0.95rem'}}>🍌 보급 계산</a></li>
              <li><a href="/bike_calculator.html" onClick={(e) => safeNav(e, '/bike_calculator.html')} className="menu-link" style={{paddingLeft: '30px', fontSize: '0.95rem'}}>🚴 자전거 기어비</a></li>
              <li><a href="/bike_uphill.html" onClick={(e) => safeNav(e, '/bike_uphill.html')} className="menu-link" style={{paddingLeft: '30px', fontSize: '0.95rem'}}>🚴 싸이클 업힐 분석기</a></li>
              <li><a href="/bike_gpx_zwo.html" onClick={(e) => safeNav(e, '/bike_gpx_zwo.html')} className="menu-link" style={{paddingLeft: '30px', fontSize: '0.95rem'}}>🚴 .gpx to .zwo 워크아웃생성</a></li>
              <li><a href="/cyclinganalyzer" onClick={(e) => safeNav(e, '/cyclinganalyzer')} className="menu-link" style={{paddingLeft: '30px', fontSize: '0.95rem', fontWeight: 'bold', color: '#007bff', borderLeft: '5px solid #007bff', backgroundColor: '#eef2ff'}}>📊 사이클 구간평속 분석</a></li>
              <li><a href="/running_calculator.html" onClick={(e) => safeNav(e, '/running_calculator.html')} className="menu-link" style={{paddingLeft: '30px', fontSize: '0.95rem'}}>🏃 런 보폭 회전수</a></li>
              <li><a href="/runpace_calculator.html" onClick={(e) => safeNav(e, '/runpace_calculator.html')} className="menu-link" style={{paddingLeft: '30px', fontSize: '0.95rem'}}>🏃 런 페이스</a></li>
              <li><a href="/run_mileage_calculator.html" onClick={(e) => safeNav(e, '/run_mileage_calculator.html')} className="menu-link" style={{paddingLeft: '30px', fontSize: '0.95rem'}}>🏃 런 마일리지</a></li>
            </ul>
          </li>
          <li className="menu-folder">
            <div className="menu-link folder-header" onClick={() => setIsLinkOpen(!isLinkOpen)} style={{cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <span>🔗 링크</span>
              <span className="arrow" style={{transform: isLinkOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s'}}>▼</span>
            </div>
            <ul className="submenu-list" style={{display: isLinkOpen ? 'block' : 'none', backgroundColor: '#f8f9fa', listStyle: 'none', padding: 0}}>
              <li><a href="https://cafe.naver.com/ktriathlonservice" target="_blank" className="menu-link" style={{paddingLeft: '30px', fontSize: '0.95rem'}}>KTS</a></li>
              <li><a href="https://www.triathlon.or.kr/" target="_blank" className="menu-link" style={{paddingLeft: '30px', fontSize: '0.95rem'}}>철인3종협회</a></li>
            </ul>
          </li>
        </ul>
      </nav>

      <main className="main-content">
        <div className="card">
          <div className="card-header">
            <div className="icon-circle">🚴</div>
            <h2>사이클 구간 평속 분석</h2>
            <p className="desc">파일(.xlsx, .csv)을 업로드하면<br/>분석한 html을 다운해드립니다.</p>
            <a href="/2025_구례IRONMAN_홍길동클럽_싸이클_구간기록.xlsx" download className="sample-link">
              📥 샘플 파일 다운로드
            </a>
          </div>

          <div className="upload-section">
            <input 
              type="file" 
              id="fileInput" 
              accept=".xlsx, .csv" 
              onChange={(e) => setFile(e.target.files[0])} 
              style={{display: 'none'}}
            />
            <label htmlFor="fileInput" className={`upload-box ${file ? 'has-file' : ''}`}>
              {file ? (
                <div className="file-info">
                  <span className="file-icon">📄</span>
                  <div className="file-text">
                    <span className="file-name">{file.name}</span>
                    <span className="file-size">{(file.size / 1024).toFixed(1)} KB</span>
                  </div>
                  <span className="change-badge">변경</span>
                </div>
              ) : (
                <div className="upload-placeholder">
                  <span className="upload-icon">☁️</span>
                  <span className="upload-main-text">파일 선택하기</span>
                  <span className="upload-sub-text">또는 여기로 파일을 끌어오세요</span>
                </div>
              )}
            </label>
          </div>

          <button onClick={handleUpload} disabled={loading || !file} className={`action-btn ${loading ? 'loading' : ''}`}>
            {loading ? (
              <>
                <span className="spinner"></span> 분석 중...
              </>
            ) : (
              "분석 리포트 생성"
            )}
          </button>
        </div>

        <div className="guide-section">
          <h3>📁 엑셀 업로드 양식 가이드</h3>
          <p>
            업로드할 엑셀 파일은 상단 헤더에 <strong>[구간 (km)]</strong>가 필수이며,<br/>
            우측으로 선수 이름, 아래로 구간 거리별 평속이 배치되어야 합니다.
          </p>
          <div className="guide-images" style={{marginBottom: '60px'}}>
            <img 
              src="/upload_sample.PNG" 
              alt="엑셀 업로드 양식 예시" 
              onClick={() => setSelectedImage('/upload_sample.PNG')}
              className="upload-sample-img"
            />
          </div>

          <div className="accordion-header" onClick={() => setIsReportOpen(!isReportOpen)}>
            <h3>📊 분석 리포트 예시</h3>
            <span className={`accordion-arrow ${isReportOpen ? 'open' : ''}`}>▼</span>
          </div>

          {isReportOpen && (
            <div className="accordion-content">
              <p>업로드 후 생성되는 리포트에는 다음과 같은 분석 차트가 제공됩니다.</p>
              <div className="guide-images report-gallery">
                <img src="/report_chart_01.PNG" alt="분석 리포트 예시 1" onClick={() => setSelectedImage('/report_chart_01.PNG')} />
                <img src="/report_chart_02.PNG" alt="분석 리포트 예시 2" onClick={() => setSelectedImage('/report_chart_02.PNG')} />
                <img src="/report_chart_03.PNG" alt="분석 리포트 예시 3" onClick={() => setSelectedImage('/report_chart_03.PNG')} />
                <img src="/report_chart_04.PNG" alt="분석 리포트 예시 4" onClick={() => setSelectedImage('/report_chart_04.PNG')} />
                <img src="/report_chart_05.PNG" alt="분석 리포트 예시 5" onClick={() => setSelectedImage('/report_chart_05.PNG')} />
              </div>
            </div>
          )}
        </div>

        {selectedImage && (
          <div className="lightbox" onClick={() => setSelectedImage(null)}>
            <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
              <img src={selectedImage} alt="확대 이미지" />
              <button className="close-lightbox" onClick={() => setSelectedImage(null)}>✕</button>
            </div>
          </div>
        )}
      </main>

      <style jsx>{`
        /* bucheonTriStyle.css에서 제공하지 않는 로컬 스타일만 유지 */
        .header-section {
          display: flex;
          align-items: center;
          padding: 15px 20px;
          border-bottom: 2px solid var(--primary-blue);
          background-color: var(--header-bg);
          border-bottom: 2px solid #007bff;
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 100;
        }
        .header-section h1 {
          font-size: 1.3rem;
          font-weight: 800;
          margin: 0 0 0 12px;
          color: #1f2937;
          line-height: 1.2;
        }
        .menu-btn {
          font-size: 1.6rem;
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
          color: #374151;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .main-content { display: flex; flex-direction: column; align-items: center; min-height: 100vh; padding: 90px 20px 60px; gap: 60px; }
        .card { 
          background: white; 
          padding: 40px; 
          border-radius: 24px; 
          box-shadow: 0 20px 40px rgba(0,0,0,0.08); 
          text-align: center; 
          max-width: 420px; 
          width: 100%; 
          border: 1px solid rgba(0,0,0,0.02);
        }
        .icon-circle {
          width: 60px; height: 60px; background: #eef2ff; border-radius: 50%; 
          display: flex; align-items: center; justify-content: center; 
          font-size: 30px; margin: 0 auto 20px;
        }
        .card-header h2 { margin: 0 0 10px; color: #1f2937; font-size: 1.5rem; font-weight: 800; }
        .desc { color: #6b7280; font-size: 0.95rem; line-height: 1.5; margin-bottom: 15px; }
        
        .sample-link {
          display: inline-block;
          margin-bottom: 30px;
          color: #6b7280;
          font-size: 0.85rem;
          text-decoration: none;
          background: #f3f4f6;
          padding: 6px 14px;
          border-radius: 100px;
          font-weight: 500;
          transition: all 0.2s;
        }
        .sample-link:hover { background: #e5e7eb; color: #007bff; }
        
        .upload-box {
          display: block;
          border: 2px dashed #e5e7eb;
          border-radius: 16px;
          padding: 30px 20px;
          cursor: pointer;
          transition: all 0.2s;
          background: #f9fafb;
          margin-bottom: 25px;
        }
        .upload-box:hover { border-color: #007bff; background: #f0f9ff; }
        .upload-box.has-file { border-style: solid; border-color: #007bff; background: #eef2ff; padding: 20px; }
        
        .upload-placeholder { display: flex; flex-direction: column; align-items: center; gap: 8px; }
        .upload-icon { font-size: 2rem; margin-bottom: 5px; opacity: 0.7; }
        .upload-main-text { font-weight: 600; color: #374151; }
        .upload-sub-text { font-size: 0.8rem; color: #9ca3af; }

        .file-info { display: flex; align-items: center; gap: 15px; text-align: left; }
        .file-icon { font-size: 1.5rem; }
        .file-text { flex: 1; overflow: hidden; }
        .file-name { display: block; font-weight: 600; color: #1f2937; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .file-size { font-size: 0.8rem; color: #6b7280; }
        .change-badge { font-size: 0.75rem; background: white; padding: 4px 8px; border-radius: 12px; color: #007bff; font-weight: 600; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }

        .action-btn { width: 100%; padding: 16px; background: #007bff; color: white; border: none; border-radius: 14px; font-weight: 700; font-size: 1rem; cursor: pointer; transition: 0.2s; box-shadow: 0 4px 12px rgba(0, 123, 255, 0.25); display: flex; align-items: center; justify-content: center; gap: 10px; }
        .action-btn:hover:not(:disabled) { background: #0069d9; transform: translateY(-2px); box-shadow: 0 6px 15px rgba(0, 105, 217, 0.3); }
        .action-btn:disabled { background: #cbd5e1; cursor: not-allowed; box-shadow: none; transform: none; }
        
        .spinner { width: 18px; height: 18px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        .guide-section { max-width: 800px; width: 100%; text-align: center; }
        .guide-section h3 { font-size: 1.5rem; font-weight: 700; color: #1f2937; margin-bottom: 15px; }
        .guide-section p { color: #6b7280; margin-bottom: 30px; font-size: 1rem; }
        
        .accordion-header { display: flex; align-items: center; justify-content: center; gap: 10px; cursor: pointer; padding: 10px; border-radius: 12px; transition: background-color 0.2s; user-select: none; }
        .accordion-header:hover { background-color: #f3f4f6; }
        .accordion-header h3 { margin: 0; }
        .accordion-arrow { font-size: 1.2rem; color: #6b7280; transition: transform 0.3s ease; }
        .accordion-arrow.open { transform: rotate(180deg); }
        .accordion-content { animation: slideDown 0.3s ease-out; }
        @keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }

        .guide-images { display: flex; flex-direction: column; gap: 30px; align-items: center; }
        .guide-images img { 
          width: 50%; 
          height: auto; 
          border-radius: 20px; 
          box-shadow: 0 10px 30px rgba(0,0,0,0.08); 
          border: 1px solid rgba(0,0,0,0.05);
          transition: transform 0.3s ease;
          cursor: pointer;
        }
        .guide-images img:hover {
          transform: scale(1.05);
        }

        .lightbox {
          position: fixed; top: 0; left: 0; width: 100%; height: 100%;
          background: rgba(0,0,0,0.85); z-index: 2000;
          display: flex; align-items: center; justify-content: center;
          animation: fadeIn 0.2s ease-out;
          padding: 20px;
        }
        .lightbox-content { position: relative; max-width: 95%; max-height: 95%; display: flex; justify-content: center; }
        .lightbox-content img { max-width: 100%; max-height: 90vh; border-radius: 8px; box-shadow: 0 20px 50px rgba(0,0,0,0.5); object-fit: contain; }
        .close-lightbox {
          position: absolute; top: -40px; right: 0;
          background: none; border: none; color: white; font-size: 2rem; cursor: pointer; padding: 0; line-height: 1;
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

        /* 데스크탑 기본 스타일 */
        .guide-images .upload-sample-img { width: 35%; }

        /* 모바일 스타일 */
        @media (max-width: 640px) {
          .card-header h2 { font-size: 1.3rem; }
          .desc { font-size: 0.9rem; }
          .guide-section h3 { font-size: 1.2rem; }
          .guide-section p { font-size: 0.9rem; }

          .guide-images .upload-sample-img { width: 90%; }

          .report-gallery {
            flex-direction: row;
            overflow-x: auto;
            justify-content: flex-start;
            width: 100vw;
            margin-left: -20px;
            padding: 10px 20px 30px;
            scroll-snap-type: x mandatory;
            gap: 15px;
          }
          .report-gallery img {
            width: 85%;
            flex-shrink: 0;
            scroll-snap-align: center;
          }
        }

        /* 모바일 가로모드 (Landscape) 최적화 */
        @media (max-height: 600px) and (orientation: landscape) {
          .header-section { position: fixed !important; top: 0; left: 0; right: 0; height: 40px; padding: 0 15px; z-index: 999; display: flex; align-items: center; background: rgba(255,255,255,0.95); backdrop-filter: blur(5px); box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
          .header-section h1 { font-size: 1rem; margin: 0 0 0 10px; line-height: 1; color: #1f2937; font-weight: 700; }
          .menu-btn { width: 32px; height: 32px; font-size: 1.2rem; top: 4px; padding: 0; cursor: pointer; }

          .main-content { padding: 50px 20px 20px !important; gap: 20px !important; }
          
          .card { padding: 15px !important; max-width: 500px !important; }
          .icon-circle { width: 40px !important; height: 40px !important; font-size: 20px !important; margin: 0 auto 10px !important; }
          .card-header h2 { font-size: 1.1rem !important; margin-bottom: 5px !important; }
          .desc { font-size: 0.8rem !important; margin-bottom: 10px !important; }
          .sample-link { margin-bottom: 15px !important; font-size: 0.75rem !important; padding: 4px 10px !important; }
          
          .upload-box { padding: 15px !important; margin-bottom: 15px !important; }
          .upload-icon { font-size: 1.5rem !important; margin-bottom: 2px !important; }
          .upload-main-text { font-size: 0.9rem !important; }
          .upload-sub-text { font-size: 0.7rem !important; }
          
          .action-btn { padding: 10px !important; font-size: 0.9rem !important; }
          
          .guide-section h3 { font-size: 1.1rem !important; margin-bottom: 10px !important; }
          .guide-section p { font-size: 0.85rem !important; margin-bottom: 15px !important; }
          .guide-images img { width: 25% !important; }
          
          .report-gallery { padding: 10px 0 !important; }
          .report-gallery img { width: 30% !important; }
        }
      `}</style>
    </div>
  );
}