// bbs_layer.js

// 1. 현재 페이지 이름 추출
let bbsTargetPage = window.location.pathname.split('/').pop().replace('.html', '');
if (!bbsTargetPage || bbsTargetPage === '') bbsTargetPage = 'index';

// 2. 쿠키 유틸리티
function getUserInfo() {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; user_info=`);
    if (parts.length === 2) {
        const decoded = decodeURIComponent(parts.pop().split(';').shift());
        try { return JSON.parse(decoded); } catch(e) { return null; }
    }
    return null;
}

// 3. 로그인 상태 체크 및 UI 생성 (네이버 가이드라인 준수)
const currentUser = getUserInfo();
let authHtml = '';

if (currentUser && currentUser.name) {
    // [로그인 상태] 프로필 카드 디자인
    const imgTag = currentUser.image 
        ? `<img src="${currentUser.image}" class="bbs-profile-img-large">` 
        : `<div class="bbs-profile-img-placeholder">👤</div>`;

    authHtml = `
        <div class="bbs-profile-card">
            ${imgTag}
            <div class="bbs-profile-info">
                <div class="bbs-user-name">${currentUser.name}님</div>
                <button onclick="bbsLogout()" class="bbs-btn-logout">로그아웃</button>
            </div>
        </div>
    `;
} else {
    // [비로그인 상태] 네이버 공식 가이드라인 버튼 (SVG 로고 사용)
    authHtml = `
        <a href="/api/auth/login" onclick="bbsSaveReturnUrl()" class="naver-login-btn">
            <span class="n-icon">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M11.5 10.2V18H18V0H11.5V7.8L6.5 0H0V18H6.5V10.2L11.5 18V10.2Z" fill="white"/>
                </svg>
            </span>
            <span>네이버 로그인</span>
        </a>
    `;
}

// 4. 레이어 UI (CSS 구조 개편)
const bbsHTML = `
<style>
    /* 초기화 및 공통 */
    #bbs-layer * { box-sizing: border-box; }
    
    /* 플로팅 버튼 (z-index: 9999) */
    #bbs-btn { 
        position: fixed; bottom: 30px; right: 30px; width: 60px; height: 60px; 
        background: #03C75A; color: white; border-radius: 50%; font-size: 28px; border: none; cursor: pointer; 
        z-index: 9999; box-shadow: 0 4px 10px rgba(0,0,0,0.3); 
        display: flex; align-items: center; justify-content: center; transition: transform 0.2s; 
    }
    #bbs-btn:hover { transform: scale(1.1); }
    
    /* 배경 오버레이 (z-index: 10000) */
    #bbs-overlay-bg { 
        position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.5); 
        z-index: 10000; display: none; 
    }
    
    /* 게시판 레이어 (z-index: 10001) */
    #bbs-layer { 
        position: fixed; top: 0; right: -520px; width: 500px; height: 100vh; background: #fff; 
        z-index: 10001; transition: right 0.3s cubic-bezier(0.4, 0, 0.2, 1); 
        box-shadow: -4px 0 15px rgba(0,0,0,0.1); 
        display: flex; flex-direction: column; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    #bbs-layer.open { right: 0; }
    @media (max-width: 768px) {
        #bbs-layer { width: 100%; right: -100%; max-width: 100%; }
    }
    
    /* [Header] 고정 영역 */
    .bbs-header { padding: 15px 20px; background: #fff; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; flex-shrink: 0; }
    .bbs-header h3 { margin: 0; font-size: 1.1rem; color: #111; font-weight: bold; }
    .bbs-close-btn { background: none; border: none; font-size: 20px; cursor: pointer; color: #333; padding: 5px; }
    
    /* [Content] 스크롤 영역 */
    .bbs-content-wrap { flex: 1; overflow-y: auto; padding: 20px; width: 100%; display: flex; flex-direction: column; }
    
    /* [Footer] 하단 고정 액션바 (글쓰기 버튼 등) */
    .bbs-footer-action {
        padding: 15px 20px; border-top: 1px solid #eee; background: #fff;
        flex-shrink: 0; /* 크기 줄어들지 않음 */
    }

    /* --- 네이버 로그인 버튼 스타일 (가이드 준수) --- */
    .naver-login-btn {
        display: flex; align-items: center; justify-content: center;
        width: 100%; height: 50px;
        background-color: #03C75A; color: white;
        text-decoration: none; border-radius: 4px;
        font-weight: bold; font-size: 15px;
        margin-bottom: 20px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .naver-login-btn:hover { background-color: #02b351; }
    .n-icon { margin-right: 12px; display: flex; align-items: center; }

    /* --- 로그인 프로필 카드 스타일 --- */
    .bbs-profile-card {
        display: flex; align-items: center; padding: 15px; 
        background: #f9fafb; border-radius: 8px; border: 1px solid #eee;
        margin-bottom: 20px;
    }
    .bbs-profile-img-large { width: 45px; height: 45px; border-radius: 50%; object-fit: cover; border: 1px solid #ddd; margin-right: 12px; }
    .bbs-profile-img-placeholder { width: 45px; height: 45px; border-radius: 50%; background: #eee; display: flex; align-items: center; justify-content: center; font-size: 24px; margin-right: 12px; }
    .bbs-profile-info { display: flex; flex-direction: column; flex: 1; }
    .bbs-user-name { font-weight: bold; font-size: 1rem; color: #333; margin-bottom: 4px; }
    .bbs-btn-logout { background: #fff; border: 1px solid #ccc; padding: 4px 10px; font-size: 12px; color: #666; border-radius: 4px; cursor: pointer; align-self: flex-start; }
    .bbs-btn-logout:hover { background: #f1f1f1; }

    /* --- 게시판 테이블 스타일 --- */
    .bbs-table { width: 100%; border-collapse: collapse; font-size: 0.95rem; table-layout: fixed; }
    .bbs-table th, .bbs-table td { padding: 12px 5px; border-bottom: 1px solid #f1f1f1; text-align: left; }
    .bbs-table th { color: #888; font-weight: normal; font-size: 0.85rem; border-bottom: 1px solid #ddd; }
    .bbs-table tr:hover td { background-color: #fafafa; }
    .bbs-list-title { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; cursor: pointer; font-weight: 500; color: #333; margin-bottom: 4px;}
    .bbs-list-meta { display: flex; align-items: center; font-size: 0.8rem; color: #888; }
    .bbs-list-img-small { width: 18px; height: 18px; border-radius: 50%; margin-right: 5px; vertical-align: middle; border: 1px solid #eee; object-fit: cover; }

    /* --- 버튼 및 입력창 --- */
    .bbs-btn-primary { width: 100%; padding: 14px; background: #333; color: white; border: none; border-radius: 6px; font-weight: bold; font-size: 1rem; cursor: pointer; }
    .bbs-btn-primary:hover { background: #111; }
    
    .bbs-btn-basic { padding: 6px 10px; border: 1px solid #ddd; border-radius: 4px; cursor: pointer; background: #fff; color: #555; font-size: 0.8rem; }
    .bbs-btn-basic:hover { background: #f9f9f9; color: #333; }
    .bbs-btn-del { color: #d9534f; border-color: #f5c6cb; }
    .bbs-btn-del:hover { background: #f8d7da; }

    .bbs-input, .bbs-textarea { width: 100%; padding: 12px; margin-bottom: 15px; border: 1px solid #ddd; border-radius: 6px; font-size: 0.95rem; }
    .bbs-textarea { height: 200px; resize: none; line-height: 1.5; }

    /* --- 댓글 스타일 --- */
    .bbs-comment-item { border-bottom: 1px solid #f5f5f5; padding: 12px 0; font-size: 0.9rem; word-break: break-all; }
</style>

<button id="bbs-btn" onclick="bbsToggleLayer()">💬</button>
<div id="bbs-overlay-bg" onclick="bbsToggleLayer()"></div>

<div id="bbs-layer">
    <div class="bbs-header">
        <h3 id="bbs-top-title">자유게시판</h3>
        <button class="bbs-close-btn" onclick="bbsToggleLayer()">✕</button>
    </div>
    
    <div class="bbs-content-wrap" id="bbs-view-list">
        ${authHtml}
        
        <table class="bbs-table">
            <colgroup><col width="*"/><col width="90"/></colgroup>
            <thead><tr><th>주제</th><th>작성자</th></tr></thead>
            <tbody id="bbs-list-tbody"></tbody>
        </table>
    </div>

    <div class="bbs-footer-action" id="bbs-footer-list">
        <button class="bbs-btn-primary" onclick="bbsChangeView('write')">🖊️ 새 글 쓰기</button>
    </div>

    <div class="bbs-content-wrap" id="bbs-view-write" style="display:none;">
        <input type="text" id="bbs-write-title" class="bbs-input" placeholder="제목">
        <textarea id="bbs-write-content" class="bbs-textarea" placeholder="건전한 커뮤니티를 위해 매너를 지켜주세요."></textarea>
    </div>
    <div class="bbs-footer-action" id="bbs-footer-write" style="display:none;">
        <div style="display:flex; gap: 10px;">
            <button class="bbs-btn-basic" style="flex:1; height:45px;" onclick="bbsChangeView('list')">취소</button>
            <button class="bbs-btn-primary" id="bbs-btn-save" style="flex:2; height:45px;" onclick="bbsSavePost()">등록</button>
        </div>
    </div>

    <div class="bbs-content-wrap" id="bbs-view-detail" style="display:none;">
        <h3 id="bbs-detail-title" style="margin: 0 0 15px 0; font-size:1.3rem; word-break: keep-all; line-height:1.4;"></h3>
        
        <div class="bbs-meta" id="bbs-detail-author-wrap" style="display:flex; align-items:center; min-height:40px; margin-bottom: 20px; padding-bottom:15px; border-bottom:1px solid #eee;">
            <span id="bbs-detail-author" style="width:100%;"></span>
        </div>

        <div id="bbs-detail-content" style="white-space: pre-wrap; font-size:1rem; line-height:1.7; min-height:100px; word-break: break-word; color:#333;"></div>
        
        <h4 style="margin-top:40px; border-top:1px solid #eee; padding-top:20px; font-size:1rem;">댓글</h4>
        <div id="bbs-comment-list" style="margin-bottom: 20px;"></div>
    </div>
    <div class="bbs-footer-action" id="bbs-footer-detail" style="display:none;">
        <div style="display:flex; gap:8px;">
            <button class="bbs-btn-basic" onclick="bbsChangeView('list')" style="width: 40px;">◀</button>
            <input type="text" id="bbs-cmt-input" class="bbs-input" style="margin:0; flex:1;" placeholder="댓글 입력">
            <button class="bbs-btn-primary" style="width: 60px; padding:0;" onclick="bbsSaveComment()">등록</button>
        </div>
    </div>
</div>
`;
document.body.insertAdjacentHTML('beforeend', bbsHTML);

// 5. 상태 변수
let bbsCurrentPostId = null;
let isEditMode = false;
let editPostId = null;

// 메뉴 겹침 방지
const checkMenuOverlay = document.getElementById('menuOverlay');
if (checkMenuOverlay) {
    const observer = new MutationObserver(() => {
        if (window.getComputedStyle(checkMenuOverlay).display === 'block') {
            document.getElementById('bbs-layer').classList.remove('open');
            document.getElementById('bbs-overlay-bg').style.display = 'none';
        }
    });
    observer.observe(checkMenuOverlay, { attributes: true, attributeFilter: ['style', 'class'] });
}

// 6. 함수 정의
function bbsSaveReturnUrl() {
    document.cookie = `login_return_url=${window.location.pathname}; path=/; max-age=3600`;
}

function bbsLogout() {
    if(confirm('로그아웃 하시겠습니까?')) {
        document.cookie = 'auth_token=; path=/; max-age=0';
        document.cookie = 'user_info=; path=/; max-age=0';
        window.location.reload();
    }
}

function bbsToggleLayer() {
    const layer = document.getElementById('bbs-layer');
    const overlay = document.getElementById('bbs-overlay-bg');
    
    if (layer.classList.contains('open')) {
        layer.classList.remove('open');
        setTimeout(() => { overlay.style.display = 'none'; }, 300);
    } else {
        overlay.style.display = 'block';
        setTimeout(() => layer.classList.add('open'), 10);
        bbsChangeView('list');
    }
}

function bbsChangeView(viewName, postData = null) {
    // 뷰 영역 제어
    document.getElementById('bbs-view-list').style.display = viewName === 'list' ? 'flex' : 'none'; // flex로 변경
    document.getElementById('bbs-view-write').style.display = viewName === 'write' ? 'block' : 'none';
    document.getElementById('bbs-view-detail').style.display = viewName === 'detail' ? 'block' : 'none';

    // 푸터 영역 제어 (하단 고정 버튼들)
    document.getElementById('bbs-footer-list').style.display = viewName === 'list' ? 'block' : 'none';
    document.getElementById('bbs-footer-write').style.display = viewName === 'write' ? 'block' : 'none';
    document.getElementById('bbs-footer-detail').style.display = viewName === 'detail' ? 'block' : 'none';

    if (viewName === 'list') {
        bbsLoadPosts();
        isEditMode = false;
        editPostId = null;
    } else if (viewName === 'write') {
        if (postData) {
            isEditMode = true;
            editPostId = postData.id;
            document.getElementById('bbs-write-title').value = postData.title;
            document.getElementById('bbs-write-content').value = postData.content;
            document.getElementById('bbs-btn-save').innerText = "수정 완료";
        } else {
            isEditMode = false;
            editPostId = null;
            document.getElementById('bbs-write-title').value = '';
            document.getElementById('bbs-write-content').value = '';
            document.getElementById('bbs-btn-save').innerText = "등록하기";
        }
    }
}

async function bbsLoadPosts() {
    const res = await fetch(`/api/bbs/posts?targetPage=${bbsTargetPage}`);
    const posts = await res.json();
    const tbody = document.getElementById('bbs-list-tbody');
    
    if (posts.length === 0) {
        tbody.innerHTML = '<tr><td colspan="2" style="text-align:center; color:#888; padding:40px 0;">첫 번째 글의 주인공이 되어보세요!</td></tr>';
        return;
    }

    tbody.innerHTML = posts.map(p => {
        const profileImg = p.authorImage 
            ? `<img src="${p.authorImage}" class="bbs-list-img-small">` 
            : `<span class="bbs-list-img-small" style="display:inline-flex; align-items:center; justify-content:center; background:#eee;">👤</span>`;

        return `
        <tr>
            <td>
                <a onclick="bbsLoadDetail(${p.id})" class="bbs-list-title">${p.title}</a>
            </td>
            <td>
                <div class="bbs-list-meta">
                    ${profileImg}
                    <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:60px;">${p.author}</span>
                </div>
            </td>
        </tr>
    `}).join('');
}

async function bbsSavePost() {
    const title = document.getElementById('bbs-write-title').value;
    const content = document.getElementById('bbs-write-content').value;
    if(!title || !content) return alert('내용을 입력하세요.');

    const method = isEditMode ? 'PUT' : 'POST';
    const body = { title, content, targetPage: bbsTargetPage };
    if (isEditMode) body.id = editPostId;

    const res = await fetch('/api/bbs/posts', {
        method: method,
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(body)
    });

    if (res.ok) {
        bbsChangeView('list');
    } else {
        alert('로그인 세션이 만료되었거나 오류가 발생했습니다.');
    }
}

async function bbsLoadDetail(id) {
    bbsCurrentPostId = id;
    const res = await fetch(`/api/bbs/posts?id=${id}`);
    const post = await res.json();
    
    const currentUser = getUserInfo();
    let btnHtml = '';
    
    if (currentUser && currentUser.id === post.authorId) {
        btnHtml = `
            <span style="margin-left:auto;">
                <button onclick='bbsEditPost(${JSON.stringify(post).replace(/'/g, "&#39;")})' class="bbs-btn-basic">수정</button>
                <button onclick="bbsDeletePost(${post.id})" class="bbs-btn-basic bbs-btn-del">삭제</button>
            </span>
        `;
    }

    const profileImg = post.authorImage 
        ? `<img src="${post.authorImage}" style="width:36px; height:36px; border-radius:50%; margin-right:10px; border:1px solid #ddd; object-fit:cover;">` 
        : `<span style="font-size:2rem; margin-right:10px;">👤</span>`;

    document.getElementById('bbs-detail-title').innerText = post.title;
    document.getElementById('bbs-detail-author').innerHTML = `
        <div style="display:flex; align-items:center; width:100%;">
            ${profileImg}
            <div style="display:flex; flex-direction:column;">
                <span style="font-weight:bold; color:#333; font-size:0.95rem;">${post.author}</span>
                <span style="font-size:0.75rem; color:#999;">${post.date || ''}</span>
            </div>
            ${btnHtml}
        </div>
    `;

    document.getElementById('bbs-detail-content').innerText = post.content;
    
    bbsLoadComments();
    bbsChangeView('detail');
}

function bbsEditPost(post) {
    bbsChangeView('write', post);
}

async function bbsDeletePost(id) {
    if(!confirm('정말 삭제하시겠습니까?')) return;
    const res = await fetch(`/api/bbs/posts?id=${id}`, { method: 'DELETE' });
    if(res.ok) {
        alert('삭제되었습니다.');
        bbsChangeView('list');
    } else {
        alert('권한이 없습니다.');
    }
}

async function bbsLoadComments() {
    if (!bbsCurrentPostId) return;
    const res = await fetch(`/api/bbs/comments?postId=${bbsCurrentPostId}`);
    const cmts = await res.json();
    
    const currentUser = getUserInfo();

    document.getElementById('bbs-comment-list').innerHTML = cmts.map(c => {
        const profileImg = c.authorImage 
            ? `<img src="${c.authorImage}" style="width:28px; height:28px; border-radius:50%; margin-right:8px; vertical-align:middle; border:1px solid #eee;">`
            : `<span style="display:inline-block; width:28px; text-align:center;">👤</span>`;
        
        let actionBtns = '';
        if (currentUser && currentUser.id === c.authorId) {
            actionBtns = `
                <span id="bbs-cmt-actions-${c.id}" style="font-size:0.8rem; margin-left:10px;">
                    <a onclick="bbsEditComment(${c.id})" style="color:#888; cursor:pointer;">수정</a> | 
                    <a onclick="bbsDeleteComment(${c.id})" style="color:#d9534f; cursor:pointer;">삭제</a>
                </span>
            `;
        }

        return `
        <div class="bbs-comment-item">
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                <div style="display:flex; align-items:center;">
                    ${profileImg}
                    <strong style="font-size:0.9rem;">${c.author}</strong>
                </div>
                ${actionBtns}
            </div>
            <div id="bbs-cmt-text-${c.id}" style="padding-left:38px; margin-top:4px; color:#555; white-space: pre-wrap; font-size:0.95rem;">${c.content}</div>
        </div>
        `;
    }).join('');
}

function bbsEditComment(id) {
    const contentEl = document.getElementById(`bbs-cmt-text-${id}`);
    const actionsEl = document.getElementById(`bbs-cmt-actions-${id}`);
    const originalText = contentEl.innerText;

    contentEl.innerHTML = `<input type="text" id="bbs-cmt-input-${id}" class="bbs-input" style="margin-bottom:0; padding:8px;" value="">`;
    document.getElementById(`bbs-cmt-input-${id}`).value = originalText;

    actionsEl.innerHTML = `
        <a onclick="bbsSaveEditedComment(${id})" style="color:#03C75A; cursor:pointer; font-weight:bold; margin-right:5px;">저장</a>
        <a onclick="bbsLoadComments()" style="color:#888; cursor:pointer;">취소</a>
    `;
    document.getElementById(`bbs-cmt-input-${id}`).focus();
}

async function bbsSaveEditedComment(id) {
    const inputEl = document.getElementById(`bbs-cmt-input-${id}`);
    const newContent = inputEl.value;
    if (!newContent.trim()) return alert('내용을 입력하세요.');

    const res = await fetch('/api/bbs/comments', {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ id, content: newContent })
    });

    if (res.ok) {
        bbsLoadComments();
    } else {
        alert('오류가 발생했습니다.');
        bbsLoadComments();
    }
}

async function bbsDeleteComment(id) {
    if(!confirm('댓글을 삭제할까요?')) return;
    await fetch(`/api/bbs/comments?id=${id}`, { method: 'DELETE' });
    bbsLoadComments();
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