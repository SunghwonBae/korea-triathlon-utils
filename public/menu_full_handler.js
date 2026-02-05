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

// 모바일 기기 체크 공통 함수
const isMobile = () => /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

// 토스 클릭 핸들러
function handleTossClick(event, accountNo) {
  if (!isMobile()) {
    event.preventDefault();
    navigator.clipboard.writeText(accountNo).then(() => {
      document.getElementById('tossModal').style.display = 'flex';
    });
  }
}

// 카카오페이 클릭 핸들러
function handleKakaoClick(event) {
  if (!isMobile()) {
    event.preventDefault();
    document.getElementById('kakaoModal').style.display = 'flex';
  }
}

// 모달 닫기 공통 함수
function closeQrModal(modalId) {
  document.getElementById(modalId).style.display = 'none';
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
                <a href="Supertoss://send?amount=0&bank=%EC%B9%B4%EC%B9%B4%EC%98%A4%EB%B1%85%ED%81%AC&accountNo=3333137635297&origin=qr" class="btn-toss" onclick="handleTossClick(event, '3333137635297')>
                    <img src="Toss_Symbol_Primary.png" width="20" height="20" alt="Toss" class="btn-icon"/>
                    Toss 후원
                </a>
                <a href="https://qr.kakaopay.com/Ej8KxM6os" target="_blank" class="btn-kakao" onclick="handleKakaoClick(event)">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="#3C1E1E" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 3c-5.5 0-10 3.6-10 8 0 3 2 5.5 4.9 7l-1.2 4.5c-.1.4.3.7.6.5l5.4-3.5c.1 0 .3 0 .4 0 5.5 0 10-3.6 10-8s-4.5-8-10-8z"/>
                    </svg>
                    카카오페이
                </a>
              </div>
            </div>
          </div>
          <div id="tossModal" class="qr-modal-overlay" onclick="closeQrModal('tossModal')">
            <div class="qr-modal-content" onclick="event.stopPropagation()">
                <h3 style="color: #0064FF;">Toss로 후원하기</h3>
                <p>계좌번호가 복사되었습니다!</p>
                <div class="account-badge toss-bg">카카오뱅크 3333137635297</div>
                <img src="toss_qr.jpg" alt="Toss QR" class="qr-image">
                <button class="qr-btn-close" onclick="closeQrModal('tossModal')">닫기</button>
            </div>
            </div>

            <div id="kakaoModal" class="qr-modal-overlay" onclick="closeQrModal('kakaoModal')">
            <div class="qr-modal-content" onclick="event.stopPropagation()">
                <h3 style="color: #3C1E1E;">카카오페이 후원</h3>
                <p>카카오톡 앱으로 QR코드를 스캔하세요.</p>
                <div class="account-badge kakao-bg">카카오페이 송금코드</div>
                <img src="Kakaopay_qr.png" alt="KakaoPay QR" class="qr-image">
                <button class="qr-btn-close" onclick="closeQrModal('kakaoModal')">닫기</button>
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
