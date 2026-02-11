// public/ui_utils.js

(function() {
    // 1. CSS 스타일 정의 (Tailwind 의존성 제거, 순수 CSS)
    const styles = `
        /* Toast 스타일 */
        #global-toast-container {
            position: fixed;
            bottom: 40px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 11000; /* bbs_layer보다 높게 */
            pointer-events: none;
        }
        .global-toast {
            background: rgba(30, 41, 59, 0.95);
            color: white;
            padding: 12px 24px;
            border-radius: 50px;
            font-size: 14px;
            font-weight: bold;
            box-shadow: 0 10px 25px rgba(0,0,0,0.2);
            margin-top: 10px;
            opacity: 0;
            transform: translateY(20px);
            transition: all 0.3s ease;
            backdrop-filter: blur(4px);
            white-space: nowrap;
            text-align: center;
        }
        .global-toast.show {
            opacity: 1;
            transform: translateY(0);
        }

        /* Confirm 모달 스타일 */
        #global-confirm-overlay {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            z-index: 12000; /* 최상위 */
            justify-content: center;
            align-items: center;
            backdrop-filter: blur(2px);
        }
        #global-confirm-box {
            background: white;
            padding: 30px 25px;
            border-radius: 16px;
            width: 90%;
            max-width: 320px;
            text-align: center;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
            animation: confirmPop 0.2s ease-out;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }
        @keyframes confirmPop {
            from { opacity: 0; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
        }
        .confirm-icon {
            font-size: 40px;
            color: #ef4444;
            margin-bottom: 15px;
            display: block;
        }
        .confirm-msg {
            margin: 0 0 25px 0;
            font-size: 16px;
            color: #333;
            font-weight: bold;
            line-height: 1.5;
            word-break: keep-all;
        }
        .confirm-actions {
            display: flex;
            gap: 10px;
        }
        .confirm-btn {
            flex: 1;
            padding: 12px 0;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            font-weight: bold;
            transition: background 0.2s;
        }
        .confirm-cancel {
            background: #f1f5f9;
            color: #64748b;
        }
        .confirm-cancel:hover { background: #e2e8f0; }
        .confirm-ok {
            background: #ef4444;
            color: white;
        }
        .confirm-ok:hover { background: #dc2626; }
    `;

    // 2. HTML 구조 정의
    const htmlStructure = `
        <div id="global-toast-container"></div>
        <div id="global-confirm-overlay">
            <div id="global-confirm-box">
                <span class="confirm-icon">!</span>
                <h4 class="confirm-msg" id="global-confirm-msg">메시지</h4>
                <div class="confirm-actions">
                    <button class="confirm-btn confirm-cancel" id="global-confirm-cancel">취소</button>
                    <button class="confirm-btn confirm-ok" id="global-confirm-ok">확인</button>
                </div>
            </div>
        </div>
    `;

    // 3. 초기화 함수 (DOM에 스타일과 HTML 주입)
    function initUI() {
        // 스타일 주입
        const styleTag = document.createElement('style');
        styleTag.innerHTML = styles;
        document.head.appendChild(styleTag);

        // HTML 주입
        document.body.insertAdjacentHTML('beforeend', htmlStructure);
    }

    // DOM 로드 시 실행 (이미 로드되었다면 즉시 실행)
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initUI);
    } else {
        initUI();
    }

    // ==========================================
    // 4. 전역 함수 노출 (window 객체에 등록)
    // ==========================================

    // [Toast 함수]
    window.showToast = function(msg) {
        const container = document.getElementById('global-toast-container');
        if (!container) return;

        const el = document.createElement('div');
        el.className = 'global-toast';
        el.innerText = msg;
        container.appendChild(el);

        // 애니메이션
        requestAnimationFrame(() => el.classList.add('show'));

        // 3초 후 삭제
        setTimeout(() => {
            el.classList.remove('show');
            setTimeout(() => el.remove(), 300);
        }, 3000);
    };

    // [Confirm 함수]
    let confirmCallback = null;

    window.showConfirm = function(msg, callback) {
        const overlay = document.getElementById('global-confirm-overlay');
        const msgEl = document.getElementById('global-confirm-msg');
        
        if (!overlay || !msgEl) return;

        msgEl.innerText = msg;
        confirmCallback = callback;
        overlay.style.display = 'flex';
        
        // 포커스 이동 (접근성)
        document.getElementById('global-confirm-ok').focus();
    };

    // 내부 이벤트 리스너 연결 (이벤트 위임 사용 안하고 직접 연결)
    // DOM이 주입된 후에 바인딩해야 하므로 setTimeout 사용하거나 이벤트 위임 사용
    document.addEventListener('click', function(e) {
        if (e.target && e.target.id === 'global-confirm-cancel') {
            document.getElementById('global-confirm-overlay').style.display = 'none';
            confirmCallback = null;
        }
        if (e.target && e.target.id === 'global-confirm-ok') {
            if (confirmCallback) confirmCallback();
            document.getElementById('global-confirm-overlay').style.display = 'none';
            confirmCallback = null;
        }
        // 배경 클릭 시 닫기 (선택 사항)
        if (e.target && e.target.id === 'global-confirm-overlay') {
             document.getElementById('global-confirm-overlay').style.display = 'none';
             confirmCallback = null;
        }
    });

})();