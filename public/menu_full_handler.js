// menu_full_handler.js: 메뉴 로드 및 제어 기능을 모두 포함

// =========================================================
// 1. 메뉴 HTML 로드 함수
// =========================================================

// 예시: 초기화가 완료되었음을 알리는 변수
let isMenuReady = false;

async function loadAndInitializeMenu() {
    try {
        const response = await fetch('menu_structure.html');
        if (!response.ok) throw new Error(`메뉴 로드 실패`);
        const menuHtml = await response.text(); 
        
        // 1. 메뉴 삽입 (이제 global-loading 엘리먼트가 확실히 존재함)
        document.body.insertAdjacentHTML('beforeend', menuHtml);
        
        // 2. 메뉴 기능 및 로그인 상태 초기화
        initializeMenuController();
        initializeMenuAccordion(); // 아코디언 기능 초기화 추가
        highlightCurrentMenu();    // 현재 페이지 하이라이트 및 폴더 펼치기
        
        isMenuReady = true;


        
    } catch (error) {
        console.error("초기화 중 오류:", error);
    }
}

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

// // 데이터를 담을 전역 객체
// window.RUNNING_DATA = {
//     vdotTable: null
// };

// async function loadVdotData() {
//     try {
//         const response = await fetch('/api/vdot');
//         window.RUNNING_DATA.vdotTable = await response.json();
//         console.log('VDOT 데이터 로드 완료');
        
//     } catch (err) {
//         console.error('VDOT 로드 실패:', err);
//     }
// }

// // 페이지 로드 시 실행
// loadVdotData();
