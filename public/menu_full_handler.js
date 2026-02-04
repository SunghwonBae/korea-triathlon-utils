// menu_full_handler.js: 메뉴 로드 및 제어 기능을 모두 포함

// =========================================================
// 1. 메뉴 HTML 로드 함수
// =========================================================

// 예시: 초기화가 완료되었음을 알리는 변수
let isMenuReady = false;

// 로딩 제어 함수
function showLoading() { 
    const loader = document.getElementById('global-loading');
    if (loader) {
        loader.style.display = 'flex';
    } else if (!isMenuReady) {
        // 아직 메뉴가 로드 전이라면, 조금 뒤에 다시 시도하거나 
        // 그냥 에러 없이 조용히 넘어감
        console.log("메뉴 로드 대기 중...");
    }
}
function hideLoading() { 
        const loader = document.getElementById('global-loading');
    if (loader) {
        loader.style.display = 'none';
    } else if (!isMenuReady) {
        // 아직 메뉴가 로드 전이라면, 조금 뒤에 다시 시도하거나 
        // 그냥 에러 없이 조용히 넘어감
        console.log("메뉴 로드 대기 중...");
    }

}



// 모달 제어 함수
function openLoginModal() {
    document.getElementById('loginModal').style.display = 'flex';
}

function closeLoginModal() {
    document.getElementById('loginModal').style.display = 'none';
}

// 모달 외부 클릭 시 닫기
window.onclick = function(event) {
    const modal = document.getElementById('loginModal');
    if (event.target == modal) {
        modal.style.display = 'none';
    }
}

// =========================================================
// 2. 메뉴 이벤트 제어 함수
// =========================================================
function initializeMenuController() {
    // 이제 요소들이 DOM에 존재하므로 바로 찾을 수 있습니다.
    const menuToggle = document.getElementById('menuToggle');
    const menuClose = document.getElementById('menuClose');
    const slideMenu = document.getElementById('slideMenu');
    const menuOverlay = document.getElementById('menuOverlay');

    // 메뉴 상태 토글 로직 (이전과 동일)
    const toggleMenu = (open) => {
        if (slideMenu && menuOverlay) {
            if (open) {
                slideMenu.classList.add('is-active');
                menuOverlay.classList.add('is-active'); 
                document.body.style.overflow = 'hidden';
            } else {
                slideMenu.classList.remove('is-active');
                menuOverlay.classList.remove('is-active');
                document.body.style.overflow = '';
            }
        }
    };

    // 이벤트 리스너 등록
    if (menuToggle) {
        menuToggle.addEventListener('click', () => toggleMenu(true));
    }
    if (menuClose) {
        menuClose.addEventListener('click', () => toggleMenu(false));
    }
    if (menuOverlay) {
        menuOverlay.addEventListener('click', () => toggleMenu(false));
    }
}

// =========================================================
// 3. 실행 트리거
// =========================================================
// DOM 콘텐츠가 준비되면 (다른 요소 로드가 끝난 후) 로드 및 초기화 시작
document.addEventListener('DOMContentLoaded', loadAndInitializeMenu);

// =========================================================
// 4. 메뉴 아코디언(폴더) 제어 함수
// =========================================================
function initializeMenuAccordion() {
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
}

// =========================================================
// 5. 현재 페이지 하이라이트 및 상위 메뉴 펼치기
// =========================================================
function highlightCurrentMenu() {
    const path = window.location.pathname;
    const page = path.split("/").pop(); // 예: ironman_calculator.html

    const links = document.querySelectorAll('.slide-menu .menu-link');
    
    links.forEach(link => {
        const href = link.getAttribute('href');
        if (!href) return;

        // 현재 페이지와 링크가 일치하는지 확인 (루트 경로 포함)
        if (href === path || (page && href === page) || (href === '/' && (path === '/' || page === 'index.html'))) {
            // 스타일 적용 (cyclinganalyzer.js와 동일)
            link.style.fontWeight = 'bold';
            link.style.color = '#0A317E';
            link.style.borderLeft = '5px solid #0A317E';
            link.style.backgroundColor = '#eef2ff';

            // 상위 메뉴(폴더)가 있다면 펼치기
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

// menu_full_handler.js 하단에 추가 혹은 loadAndInitializeMenu 수정
async function loadAndInitializeMenu() {
    try {
        const response = await fetch('menu_structure.html');
        if (!response.ok) throw new Error(`메뉴 로드 실패`);
        const menuHtml = await response.text(); 
        document.body.insertAdjacentHTML('beforeend', menuHtml);
        
        // --- 푸터 자동 주입 코드 시작 ---
        const footerHtml = `
        <footer class="main-footer">
          <div class="donation-section">
            <div class="donation-card">
              <p class="donation-text">⚡ 더 나은 서비스를 위해 파워젤 한개 후원하기</p>
              <div class="donation-btn-group">
                <a href="Supertoss://send?amount=0&bank=%EC%B9%B4%EC%B9%B4%EC%98%A4%EB%B1%85%ED%81%AC&accountNo=3333137635297&origin=qr" class="btn-toss">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" fill="#0047FF"/>
                        <path d="M12.44 15.62c2.05 0 3.73-1.63 3.73-3.62 0-2-1.68-3.62-3.73-3.62s-3.73 1.63-3.73 3.62c0 2 1.68 3.62 3.73 3.62z" fill="#fff" fill-opacity=".2"/>
                        <path d="M15.54 11.23c-.34-1.29-1.52-2.25-2.92-2.25-1.67 0-3.02 1.35-3.02 3.02 0 1.67 1.35 3.02 3.02 3.02.76 0 1.45-.28 1.97-.74l2.05 2.05c-.93.93-2.21 1.5-3.63 1.5-2.83 0-5.13-2.3-5.13-5.13S10.18 7.57 13.01 7.57c1.86 0 3.48.99 4.38 2.47l-1.85 1.19z" fill="#fff"/>
                    </svg>
                    Toss 후원
                </a>
                <a href="https://qr.kakaopay.com/Ej8KxM6os" target="_blank" class="btn-kakao">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="#3C1E1E"><path d="M12 3c-5.523 0-10 3.582-10 8c0 2.957 1.962 5.539 4.864 7.02l-1.232 4.521c-.102.373.329.67.639.464l5.353-3.54c.125.013.251.025.376.025 5.523 0 10-3.582 10-8s-4.477-8-10-8z"/></svg>
                  카카오페이
                </a>
              </div>
            </div>
          </div>
            <p class="copyright">
            2026 Korea Triathlon Utils.<br class="mobile-br"/> 
            🄯 Copyleft. Powered by <a href='https://cafe.naver.com/swimbikerun' target="_blank">부천트라이</a> 배성훤.
            </p>
            <p class="special-link">
            특별링크!! 내란대장경 : <a href="https://mhrk.campaignus.me/rebellion" target="_blank">https://mhrk.campaignus.me/rebellion</a>
            </p>
        </footer>`;
        document.body.insertAdjacentHTML('beforeend', footerHtml);
        // --- 푸터 자동 주입 코드 끝 ---

        initializeMenuController();
        initializeMenuAccordion();
        highlightCurrentMenu();
        isMenuReady = true;
    } catch (error) {
        console.error("초기화 중 오류:", error);
    }
}
