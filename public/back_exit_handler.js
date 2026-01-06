(function() {
    // 모바일 환경인지 체크 (PC 브라우저에서는 실행하지 않음)
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (!isMobile) return;

    let lastBackPressTime = 0;
    
    // 1. 진입 시 현재 상태를 하나 더 쌓아서 '뒤로가기'를 해도 
    // 페이지가 바뀌지 않고 popstate만 발생하게 만듭니다.
    history.pushState({ page: "root" }, null, location.href);

    window.addEventListener('popstate', function(event) {
        const now = new Date().getTime();
        
        if (now - lastBackPressTime < 2000) {
            // 2. 2초 안에 다시 눌렀을 때: 
            // PWA standalone 모드에서는 히스토리를 모두 비우고 종료를 유도합니다.
            history.go(-2); 
        } else {
            // 3. 처음 눌렀을 때: 
            // 다시 pushState를 해서 사용자를 현재 페이지에 묶어둡니다.
            lastBackPressTime = now;
            history.pushState({ page: "root" }, null, location.href);
            
            // 토스트 알림 표시
            showToast("'뒤로' 버튼을 한번 더 누르면 종료됩니다.");
        }
    });

    function showToast(message) {
        const existing = document.getElementById('exit-toast');
        if (existing) existing.remove();

        const t = document.createElement('div');
        t.id = 'exit-toast';
        t.innerText = message;
        Object.assign(t.style, {
            position:'fixed', bottom:'20px', left:'50%', transform:'translateX(-50%)',
            background:'rgba(0,0,0,0.8)', color:'#fff', padding:'12px 24px',
            borderRadius:'25px', zIndex:9999, fontSize:'0.9rem', pointerEvents:'none',
            boxShadow: '0 4px 10px rgba(0,0,0,0.3)', transition: 'opacity 0.3s', opacity: '0'
        });
        document.body.appendChild(t);
        
        requestAnimationFrame(() => { t.style.opacity = '1'; });

        setTimeout(() => {
            t.style.opacity = '0';
            setTimeout(() => t.remove(), 300);
        }, 2000);
    }
})();
