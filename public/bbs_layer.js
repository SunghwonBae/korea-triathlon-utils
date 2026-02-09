// bbs_layer.js

// 1. 현재 페이지 이름 설정
let bbsTargetPage = window.location.pathname.split('/').pop().replace('.html', '');
if (!bbsTargetPage || bbsTargetPage === '') bbsTargetPage = 'index';

// 2. 쿠키에서 유저 정보(JSON) 읽어오기
function getUserInfo() {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; user_info=`);
    if (parts.length === 2) {
        const decoded = decodeURIComponent(parts.pop().split(';').shift());
        try {
            return JSON.parse(decoded); // { name: "홍길동", image: "https://..." }
        } catch(e) { return null; }
    }
    return null;
}

const currentUser = getUserInfo(); // 객체로 받음

// 로그인 UI HTML 생성
let authHtml = '';
if (currentUser && currentUser.name) {
    // 프사가 있으면 보여주고, 없으면 기본 아이콘
    const imgTag = currentUser.image 
        ? `<img src="${currentUser.image}" style="width:24px; height:24px; border-radius:50%; object-fit:cover; border:1px solid #ddd;">` 
        : `<span style="font-size:1.2rem;">👤</span>`;

    authHtml = `
        <div style="display:flex; align-items:center; gap:8px;">
            ${imgTag}
            <span style="font-weight:bold; color:#333; font-size:0.9rem;">${currentUser.name}님</span>
            <button onclick="bbsLogout()" class="bbs-btn-basic" style="background:#555; font-size:0.75rem; padding:4px 8px;">로그아웃</button>
        </div>
    `;
} else {
    // 로그인 버튼 (기존 유지)
    authHtml = `
        <a href="/api/auth/login" onclick="bbsSaveReturnUrl()" class="bbs-btn-login">
            <span style="background:white; color:#03C75A; border-radius:50%; width:16px; height:16px; display:inline-flex; align-items:center; justify-content:center; margin-right:5px; font-weight:bold;">N</span>
            로그인
        </a>
    `;
}

// 5. 레이어 UI (닫기 버튼 개선됨)
const bbsHTML = `
<style>
    /* 기존 스타일 유지 */
    #bbs-btn { position: fixed; bottom: 30px; right: 30px; width: 60px; height: 60px; background: #03C75A; color: white; border-radius: 50%; font-size: 28px; border: none; cursor: pointer; z-index: 999; box-shadow: 0 4px 10px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; transition: transform 0.2s; }
    #bbs-btn:hover { transform: scale(1.1); }
    #bbs-overlay-bg { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.5); z-index: 10000; display: none; }
    
    /* 레이어 스타일 */
    #bbs-layer { position: fixed; top: 0; right: -420px; width: 400px; max-width: 100vw; height: 100vh; background: #fff; z-index: 10001; transition: right 0.3s cubic-bezier(0.4, 0, 0.2, 1); box-shadow: -4px 0 15px rgba(0,0,0,0.1); display: flex; flex-direction: column; font-family: sans-serif; }
    #bbs-layer.open { right: 0; }
    
    /* 상단 헤더 (닫기 버튼 강화) */
    .bbs-header { padding: 15px 20px; background: #f8f9fa; border-bottom: 1px solid #ddd; display: flex; justify-content: space-between; align-items: center; }
    .bbs-header h3 { margin: 0; font-size: 1.1rem; color: #333; font-weight: bold; }
    .bbs-close-btn { background: none; border: 1px solid #ddd; border-radius: 4px; padding: 5px 10px; font-size: 14px; cursor: pointer; color: #555; font-weight: bold; }
    .bbs-close-btn:hover { background: #eee; color: #333; border-color: #bbb; }

    .bbs-content-wrap { flex: 1; overflow-y: auto; padding: 20px; }
    
    .bbs-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; margin-top: 10px; }
    .bbs-table th, .bbs-table td { padding: 10px 5px; border-bottom: 1px solid #eee; text-align: left; }
    .bbs-table a { color: #333; text-decoration: none; cursor: pointer; }
    .bbs-table a:hover { text-decoration: underline; color: #03C75A; }
    
    .bbs-btn-basic { padding: 8px 12px; border: none; border-radius: 4px; cursor: pointer; background: #333; color: white; }
    .bbs-btn-login { background: #03C75A; color: white; text-decoration: none; padding: 8px 12px; border-radius: 4px; font-size: 0.9rem; display: inline-flex; align-items: center; }
    
    .bbs-input, .bbs-textarea { width: 100%; padding: 10px; margin-bottom: 10px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; }
    .bbs-textarea { height: 150px; resize: none; }
    .bbs-comment-item { border-bottom: 1px solid #f0f0f0; padding: 10px 0; font-size: 0.9rem; }
    .bbs-meta { font-size: 0.8rem; color: #888; margin-bottom: 15px; border-bottom: 1px solid #eee; padding-bottom: 10px;}
</style>

<button id="bbs-btn" onclick="bbsToggleLayer()">💬</button>
<div id="bbs-overlay-bg" onclick="bbsToggleLayer()"></div>

<div id="bbs-layer">
    <div class="bbs-header">
        <h3 id="bbs-top-title">💬 의견 나누기</h3>
        <button class="bbs-close-btn" onclick="bbsToggleLayer()">닫기 ✖</button>
    </div>
    
    <div class="bbs-content-wrap" id="bbs-view-list">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 15px;">
            ${authHtml}
            <button class="bbs-btn-basic" onclick="bbsChangeView('write')">✏️ 글쓰기</button>
        </div>
        <table class="bbs-table">
            <colgroup><col width="*"/><col width="80"/></colgroup>
            <thead><tr><th>제목</th><th>작성자</th></tr></thead>
            <tbody id="bbs-list-tbody"></tbody>
        </table>
    </div>

    <div class="bbs-content-wrap" id="bbs-view-write" style="display:none;">
        <div style="margin-bottom:15px;">
            <button class="bbs-btn-basic" style="background:#fff; color:#555; border:1px solid #ddd;" onclick="bbsChangeView('list')">◀ 목록으로</button>
        </div>
        <input type="text" id="bbs-write-title" class="bbs-input" placeholder="제목을 입력하세요">
        <textarea id="bbs-write-content" class="bbs-textarea" placeholder="내용을 자유롭게 적어주세요"></textarea>
        <button class="bbs-btn-basic" style="width:100%; background:#03C75A; font-weight:bold;" onclick="bbsSavePost()">등록하기</button>
    </div>

    <div class="bbs-content-wrap" id="bbs-view-detail" style="display:none;">
        <button class="bbs-btn-basic" style="background:#fff; color:#555; border:1px solid #ddd; margin-bottom:15px;" onclick="bbsChangeView('list')">◀ 목록으로</button>
        <h3 id="bbs-detail-title" style="margin-top:0; font-size:1.2rem;"></h3>
        <div class="bbs-meta">작성자: <span id="bbs-detail-author" style="color:#333; font-weight:bold;"></span></div>
        <div id="bbs-detail-content" style="white-space: pre-wrap; font-size:0.95rem; line-height:1.6; min-height:100px;"></div>
        
        <h4 style="margin-top:30px; border-top:2px solid #eee; padding-top:15px;">댓글</h4>
        <div id="bbs-comment-list"></div>
        <div style="display:flex; gap:5px; margin-top:10px;">
            <input type="text" id="bbs-cmt-input" class="bbs-input" style="margin:0;" placeholder="댓글을 입력하세요">
            <button class="bbs-btn-basic" onclick="bbsSaveComment()">등록</button>
        </div>
    </div>
</div>
`;
document.body.insertAdjacentHTML('beforeend', bbsHTML);

// 6. 변수 및 초기화
let bbsCurrentPostId = null;

// 메뉴 겹침 방지
const checkMenuOverlay = document.getElementById('menuOverlay');
if (checkMenuOverlay) {
    const observer = new MutationObserver(() => {
        if (window.getComputedStyle(checkMenuOverlay).display === 'block') {
            document.getElementById('bbs-layer').classList.remove('open');
            document.getElementById('bbs-overlay-bg').classList.remove('show');
        }
    });
    observer.observe(checkMenuOverlay, { attributes: true, attributeFilter: ['style', 'class'] });
}

// 7. 함수 정의

// 현재 주소를 쿠키에 저장 (로그인 클릭 시 실행)
function bbsSaveReturnUrl() {
    document.cookie = `login_return_url=${window.location.pathname}; path=/; max-age=3600`;
}

// 8. 로그아웃 함수 (쿠키 이름 변경 반영)
function bbsLogout() {
    if(confirm('로그아웃 하시겠습니까?')) {
        document.cookie = 'auth_token=; path=/; max-age=0';
        document.cookie = 'user_info=; path=/; max-age=0'; // user_name 대신 user_info 삭제
        window.location.reload();
    }
}

function bbsToggleLayer() {
    const layer = document.getElementById('bbs-layer');
    const overlay = document.getElementById('bbs-overlay-bg');
    
    if (layer.classList.contains('open')) {
        layer.classList.remove('open');
        overlay.style.display = 'none';
    } else {
        layer.classList.add('open');
        overlay.style.display = 'block';
        bbsChangeView('list');
    }
}

function bbsChangeView(viewName) {
    document.getElementById('bbs-view-list').style.display = viewName === 'list' ? 'block' : 'none';
    document.getElementById('bbs-view-write').style.display = viewName === 'write' ? 'block' : 'none';
    document.getElementById('bbs-view-detail').style.display = viewName === 'detail' ? 'block' : 'none';
    if (viewName === 'list') bbsLoadPosts();
}

async function bbsLoadPosts() {
    const res = await fetch(`/api/bbs/posts?targetPage=${bbsTargetPage}`);
    const posts = await res.json();
    const tbody = document.getElementById('bbs-list-tbody');
    
    if (posts.length === 0) {
        tbody.innerHTML = '<tr><td colspan="2" style="text-align:center; color:#888; padding:20px;">첫 번째 글을 남겨보세요!</td></tr>';
        return;
    }

    tbody.innerHTML = posts.map(p => {
        // 작성자 이미지 HTML 생성 (없으면 기본 아이콘)
        const profileImg = p.authorImage 
            ? `<img src="${p.authorImage}" style="width:20px; height:20px; border-radius:50%; margin-right:6px; vertical-align:middle; border:1px solid #eee; object-fit:cover;">` 
            : `<span style="display:inline-block; width:20px; text-align:center; margin-right:4px; vertical-align:middle; font-size:1.1rem;">👤</span>`;

        return `
        <tr>
            <td style="padding:10px 5px;">
                <a onclick="bbsLoadDetail(${p.id})" style="display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                    ${p.title}
                </a>
            </td>
            <td style="font-size:0.8rem; color:#555; vertical-align:middle; padding:10px 5px;">
                <div style="display:flex; align-items:center;">
                    ${profileImg}
                    <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:70px;">${p.author}</span>
                </div>
            </td>
        </tr>
    `}).join('');
}

async function bbsSavePost() {
    const title = document.getElementById('bbs-write-title').value;
    const content = document.getElementById('bbs-write-content').value;
    if(!title || !content) return alert('제목과 내용을 입력하세요.');

    const res = await fetch('/api/bbs/posts', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ targetPage: bbsTargetPage, title, content })
    });

    if (res.ok) {
        document.getElementById('bbs-write-title').value = '';
        document.getElementById('bbs-write-content').value = '';
        bbsChangeView('list');
    } else {
        alert('로그인이 필요합니다.');
        bbsSaveReturnUrl(); // 로그인 유도 시에도 현재 주소 저장
        location.href = '/api/auth/login';
    }
}

async function bbsLoadDetail(id) {
    bbsCurrentPostId = id;
    const res = await fetch(`/api/bbs/posts?id=${id}`);
    const post = await res.json();
    
    document.getElementById('bbs-detail-title').innerText = post.title;
    document.getElementById('bbs-detail-author').innerText = post.author;
    document.getElementById('bbs-detail-content').innerText = post.content;
    
    bbsLoadComments();
    bbsChangeView('detail');
}

async function bbsLoadComments() {
    if (!bbsCurrentPostId) return;
    const res = await fetch(`/api/bbs/comments?postId=${bbsCurrentPostId}`);
    const cmts = await res.json();
    
    document.getElementById('bbs-comment-list').innerHTML = cmts.map(c => {
        // 댓글 작성자 프사 처리
        const profileImg = c.authorImage 
            ? `<img src="${c.authorImage}" style="width:24px; height:24px; border-radius:50%; margin-right:8px; vertical-align:middle;">`
            : `<span style="display:inline-block; width:24px; text-align:center; margin-right:5px;">👤</span>`;

        return `
        <div class="bbs-comment-item">
            <div style="display:flex; align-items:center; margin-bottom:4px;">
                ${profileImg}
                <strong style="font-size:0.9rem; color:#333;">${c.author}</strong>
            </div>
            <div style="padding-left:34px; color:#555;">${c.content}</div>
        </div>
        `;
    }).join('');
}

async function bbsSaveComment() {
    const content = document.getElementById('bbs-cmt-input').value;
    if(!content) return;
    
    const res = await fetch(`/api/bbs/comments?postId=${bbsCurrentPostId}`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ content })
    });

    if (res.ok) {
        document.getElementById('bbs-cmt-input').value = '';
        bbsLoadComments();
    } else {
        alert('로그인이 필요합니다.');
        bbsSaveReturnUrl();
        location.href = '/api/auth/login';
    }
}