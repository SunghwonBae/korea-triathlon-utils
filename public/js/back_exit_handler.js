(function() {
    // 1. PWA(Standalone) 모드인지 확인
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    if (!isStandalone) return;

    let lastBackPressTime = 0;
    let isHistoryInjected = false;

    // 2. 히스토리 주입 함수 (핵심: 사용자가 한 번이라도 화면을 건드려야 작동함)
    function injectHistory() {
        if (!isHistoryInjected) {
            history.pushState({ page: "exit_trap" }, null, location.href);
            isHistoryInjected = true;
            console.log("Exit trap injected after user interaction.");
        }
    }

    // 화면 어디든 터치하거나 클릭하면 히스토리를 쌓음
    window.addEventListener('touchstart', injectHistory, { once: true });
    window.addEventListener('click', injectHistory, { once: true });

    // 3. 뒤로가기 이벤트 감지
    window.addEventListener('popstate', function(event) {
        const now = new Date().getTime();

        if (now - lastBackPressTime < 2000) {
            // [종료] 2초 내 재클릭 시 -20으로 강제 탈출
            history.go(-20);
        } else {
            // [경고] 첫 번째 뒤로가기 시 다시 방어막 생성
            lastBackPressTime = now;
            history.pushState({ page: "exit_trap" }, null, location.href);
            showExitToast();
        }
    });

    function showExitToast() {
        const existing = document.getElementById('exit-toast');
        if (existing) existing.remove();

        const t = document.createElement('div');
        t.id = 'exit-toast';
        t.innerText = "'뒤로' 버튼을 한번 더 누르면 종료됩니다.";
        Object.assign(t.style, {
            position:'fixed', bottom:'60px', left:'50%', transform:'translateX(-50%)',
            background:'rgba(0,0,0,0.85)', color:'#fff', padding:'12px 24px',
            borderRadius:'30px', zIndex:10000, fontSize:'0.9rem', pointerEvents:'none',
            boxShadow: '0 4px 15px rgba(0,0,0,0.4)', transition: 'opacity 0.3s', opacity: '0'
        });
        document.body.appendChild(t);
        requestAnimationFrame(() => { t.style.opacity = '1'; });
        setTimeout(() => {
            t.style.opacity = '0';
            setTimeout(() => t.remove(), 300);
        }, 2000);
    }
})();