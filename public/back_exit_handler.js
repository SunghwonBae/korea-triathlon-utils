/**
 * PWA 전용 뒤로가기 종료 핸들러 (최종 수정본)
 * - 불필요한 기기 체크(isMobile) 삭제
 * - 오직 PWA(Standalone) 모드에서만 작동
 * - -20을 사용하여 확실하게 앱 종료
 */
(function() {
    // 1. 현재 앱이 '홈 화면에 추가'되어 실행되었는지만 확인합니다.
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;

    // PWA 모드가 아니라면(일반 웹 브라우저라면) 뒤로가기를 방해하지 않고 종료합니다.
    if (!isStandalone) return;

    let lastBackPressTime = 0;
    
    // 2. 방어막 형성: 뒤로가기 시 페이지 이동 대신 popstate 이벤트를 발생시킴
    history.pushState({ page: "exit_trap" }, null, location.href);

    window.addEventListener('popstate', function(event) {
        const now = new Date().getTime();
        
        if (now - lastBackPressTime < 2000) {
            // 3. [종료 실행] -20으로 히스토리 스택을 완전히 뚫고 나감
            history.go(-20); 
        } else {
            // 4. [첫 번째 클릭]: 사용자를 현재 페이지에 다시 고정
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
            position:'fixed', bottom:'50px', left:'50%', transform:'translateX(-50%)',
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
