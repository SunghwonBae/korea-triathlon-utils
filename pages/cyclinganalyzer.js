import { useState, useEffect } from 'react';
import Head from 'next/head';
import Script from 'next/script';

export default function CyclingAnalyzer() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);
  const [menuHtml, setMenuHtml] = useState(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 메뉴 HTML 로드
  useEffect(() => {
    if (!mounted) return;
    fetch('/menu_structure.html')
      .then(res => res.text())
      .then(html => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const navContent = doc.getElementById('slideMenu')?.innerHTML;
        setMenuHtml(navContent || '');
      })
      .catch(err => console.error("Menu load failed", err));
  }, [mounted]);

  // 메뉴 이벤트 및 로직 처리
  useEffect(() => {
    if (!mounted) return;

    const menuBtn = document.getElementById('menuToggle');
    const menuClose = document.getElementById('menuClose'); // menuHtml 로드 후 존재
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
    if (menuClose) menuClose.addEventListener('click', closeMenu);
    menuOverlay?.addEventListener('click', closeMenu);

    // 아코디언 및 하이라이팅 (HTML이 로드된 경우에만 수행)
    if (menuHtml) {
        // 1. 아코디언
        const headers = document.querySelectorAll('.folder-header');
        headers.forEach(header => {
            header.addEventListener('click', () => {
                const parent = header.parentElement;
                const submenu = parent.querySelector('.submenu-list');
                const arrow = header.querySelector('.arrow');
                const isOpen = submenu.style.display === 'block';
                if (isOpen) {
                    submenu.style.display = 'none';
                    if (arrow) arrow.style.transform = 'rotate(0deg)';
                } else {
                    submenu.style.display = 'block';
                    if (arrow) arrow.style.transform = 'rotate(180deg)';
                }
            });
        });

        // 2. 하이라이팅
        const path = window.location.pathname;
        const links = document.querySelectorAll('.slide-menu .menu-link');
        links.forEach(link => {
            const href = link.getAttribute('href');
            if (!href) return;
            // 현재 페이지 매칭 (/cyclinganalyzer)
            if (href === path || href === '/cyclinganalyzer') {
                link.style.fontWeight = 'bold';
                link.style.color = '#0A317E';
                link.style.borderLeft = '5px solid #0A317E';
                link.style.backgroundColor = '#eef2ff';

                const parentSubmenu = link.closest('.submenu-list');
                if (parentSubmenu) {
                    parentSubmenu.style.display = 'block';
                    const folderHeader = parentSubmenu.parentElement.querySelector('.folder-header');
                    const arrow = folderHeader?.querySelector('.arrow');
                    if (arrow) arrow.style.transform = 'rotate(180deg)';
                }
            }
        });
    }

    return () => {
      menuBtn?.removeEventListener('click', openMenu);
      if (menuClose) menuClose.removeEventListener('click', closeMenu);
      menuOverlay?.removeEventListener('click', closeMenu);
    };
  }, [mounted, menuHtml]);

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
      <nav 
        id="slideMenu" 
        className="slide-menu"
        dangerouslySetInnerHTML={{ __html: menuHtml }}
      />

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
{/* --- 후원 및 푸터 섹션 시작 --- */}
<footer className="main-footer">
  <div className="donation-section">
    <div className="donation-card">
      <p className="donation-text">⚡ 더 나은 서비스를 위해 파워젤 한개 후원하기</p>
      <div className="donation-btn-group">
        <a href="Supertoss://send?amount=0&bank=%EC%B9%B4%EC%B9%B4%EC%98%A4%EB%B1%85%ED%81%AC&accountNo=3333137635297&origin=qr" className="btn-toss" onClick={(e) => handleTossClick(e, '3333137635297')}>
          <img src="Toss_Symbol_Primary.png" width="20" height="20" alt="Toss" className="btn-icon"/>
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
            <div className="qr-modal-content" onClick={(e) => e.stopPropagation()}>
                <h3 style={{ color: '#0064FF' }}>Toss로 후원하기</h3>
                <p>계좌번호가 복사되었습니다!</p>
                <div className="account-badge toss-bg">카카오뱅크 3333137635297</div>
                <img src="toss_qr.jpg" alt="Toss QR" className="qr-image"/>
                <button className="qr-btn-close" onClick={() => closeQrModal('tossModal')}>닫기</button>
            </div>
            </div>

            <div id="kakaoModal" className="qr-modal-overlay" onClick={() => closeQrModal('kakaoModal')}>
            <div className="qr-modal-content" onClick={(e) => e.stopPropagation()}>
                <h3 style={{ color: '#3C1E1E' }}>카카오페이 후원</h3>
                <p>카톡앱으로 QR코드를 스캔하세요.</p>
                <div className="account-badge kakao-bg">카카오페이 송금코드</div>
                <img src="Kakaopay_qr.png" alt="KakaoPay QR" className="qr-image"/>
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
{/* --- 후원 및 푸터 섹션 끝 --- */}
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

        .main-footer {
          text-align: center;
          padding: 60px 20px 40px;
          background-color: #f8f9fc;
          margin-top: 40px;
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
        .donation-section {
          max-width: 420px;
          margin: 0 auto 50px;
        }

        .donation-card {
          background: white;
          padding: 30px 24px;
          border-radius: 24px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.04);
          border: 1px solid #f1f5f9;
        }

        .donation-text {
          color: #1e293b !important;
          font-weight: 600;
          font-size: 0.8rem;
          margin-bottom: 20px !important;
          display: block;
        }

        .donation-btn-group {
          display: flex;
          gap: 12px;
        }

        .btn-toss, .btn-kakao {
          flex: 1;
          height: 52px;
          border-radius: 14px;
          font-weight: 600;
          font-size: 0.8rem;
          text-decoration: none;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.2s;
        }

        .btn-toss {
          background-color: #f2f5f9;
          color: #333d4b !important;
        }

        .btn-kakao {
          background-color: #FFEB00;
          color: #3C1E1E !important;
        }

        .btn-toss:active, .btn-kakao:active {
          transform: scale(0.97);
        }

        .copyright {
          color: #94a3b8;
          font-size: 0.8rem;
          line-height: 1.6;
        }

        .copyright a {
          color: #64748b;
          text-decoration: underline;
        }
        .special-link { font-size: 0.8rem; }
        .special-link a { color: #cbd5e1; text-decoration: underline; }
        @media (max-width: 480px) {
            .btn-toss, .btn-kakao {height:38px;}
        }
      `}</style>
    </div>
  );
}