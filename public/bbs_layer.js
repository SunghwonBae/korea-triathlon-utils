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

// 3. 로그인 상태 체크 및 UI 생성
const currentUser = getUserInfo();
let authHtml = '';

if (currentUser && currentUser.name) {
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
    authHtml = `
        <a href="/api/auth/login" onclick="bbsSaveReturnUrl()" class="bbs-btn-login">
            <span style="background:white; color:#03C75A; border-radius:50%; width:16px; height:16px; display:inline-flex; align-items:center; justify-content:center; margin-right:5px; font-weight:bold;">N</span>
            로그인
        </a>
    `;
}

// 4. 레이어 UI (CSS 수정됨)
const bbsHTML = `
<style>
    /* [핵심] 가로 스크롤 방지: 모든 요소의 크기 계산에 패딩 포함 */
    #bbs-layer * { box-sizing: border-box; }

    /* 플로팅 버튼 */
    #bbs-btn { position: fixed; bottom: 30px; right: 30px; width: 60px; height: 60px; background: #03C75A; color: white; border-radius: 50%; font-size: 28px; border: none; cursor: pointer; z-index: 9999; box-shadow: 0 4px 10px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; transition: transform 0.2s; }
    #bbs-btn:hover { transform: scale(1.1); }
    
    /* 배경 오버레이 */
    #bbs-overlay-bg { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.5); z-index: 10000; display: none; }
    
    /* [수정] 게시판 레이어 (PC 기본) */
    #bbs-layer { 
        position: fixed; 
        top: 0; 
        right: -520px; /* 너비보다 조금 더 숨김 */
        width: 500px;  /* 요청하신 500px */
        height: 100vh; 
        background: #fff; 
        z-index: 10001; 
        transition: right 0.3s cubic-bezier(0.4, 0, 0.2, 1); 
        box-shadow: -4px 0 15px rgba(0,0,0,0.1); 
        display: flex; 
        flex-direction: column; 
        font-family: sans-serif; 
    }
    
    /* 레이어 열림 상태 */
    #bbs-layer.open { right: 0; }

    /* [수정] 모바일 반응형 (768px 이하) */
    @media (max-width: 768px) {
        #bbs-layer {
            width: 100%;       /* 모바일은 꽉 채우기 */
            right: -100%;      /* 화면 밖으로 완전히 숨김 */
            max-width: 100%;
        }
    }
    
    /* 헤더 */
    .bbs-header { padding: 15px 20px; background: #f8f9fa; border-bottom: 1px solid #ddd; display: flex; justify-content: space-between; align-items: center; flex-shrink: 0; }
    .bbs-header h3 { margin: 0; font-size: 1.1rem; color: #333; font-weight: bold; }
    .bbs-close-btn { background: none; border: 1px solid #ddd; border-radius: 4px; padding: 5px 10px; font-size: 14px; cursor: pointer; color: #555; font-weight: bold; }
    
    /* 내용 영역 (스크롤 가능) */
    .bbs-content-wrap { flex: 1; overflow-y: auto; padding: 20px; width: 100%; }
    
    /* 테이블 */
    .bbs-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; margin-top: 10px; table-layout: fixed; /* 텍스트 넘침 방지 */ }
    .bbs-table th, .bbs-table td { padding: 10px 5px; border-bottom: 1px solid #eee; text-align: left; }
    .bbs-table a { color: #333; text-decoration: none; cursor: pointer; }
    .bbs-table a:hover { text-decoration: underline; color: #03C75A; }
    
    /* 버튼 및 입력창 */
    .bbs-btn-basic { padding: 8px 12px; border: none; border-radius: 4px; cursor: pointer; background: #333; color: white; white-space: nowrap; }
    .bbs-btn-login { background: #03C75A; color: white; text-decoration: none; padding: 8px 12px; border-radius: 4px; font-size: 0.9rem; display: inline-flex; align-items: center; }
    
    .bbs-input, .bbs-textarea { width: 100%; padding: 10px; margin-bottom: 10px; border: 1px solid #ddd; border-radius: 4px; }
    .bbs-textarea { height: 150px; resize: none; }
    
    /* 댓글 */
    .bbs-comment-item { border-bottom: 1px solid #f0f0f0; padding: 10px 0; font-size: 0.9rem; word-break: break-all; /* 긴 단어 줄바꿈 */ }
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
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 15px; flex-wrap: wrap; gap: 10px;">
            ${authHtml}
            <button class="bbs-btn-basic" onclick="bbsChangeView('write')">✏️ 글쓰기</button>
        </div>
        <table class="bbs-table">
            <colgroup><col width="*"/><col width="90"/></colgroup>
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
        <button class="bbs-btn-basic" id="bbs-btn-save" style="width:100%; background:#03C75A; font-weight:bold;" onclick="bbsSavePost()">등록하기</button>
    </div>

    <div class="bbs-content-wrap" id="bbs-view-detail" style="display:none;">
        <button class="bbs-btn-basic" style="background:#fff; color:#555; border:1px solid #ddd; margin-bottom:15px;" onclick="bbsChangeView('list')">◀ 목록으로</button>
        <h3 id="bbs-detail-title" style="margin-top:0; font-size:1.2rem; word-break: keep-all;"></h3>
        <div class="bbs-meta" id="bbs-detail-author-wrap" style="display:flex; align-items:center; min-height:40px;">
            <span id="bbs-detail-author" style="width:100%;"></span>
        </div>
        <div id="bbs-detail-content" style="white-space: pre-wrap; font-size:0.95rem; line-height:1.6; min-height:100px; word-break: break-word;"></div>
        
        <h4 style="margin-top:30px; border-top:2px solid #eee; padding-top:15px;">댓글</h4>
        <div id="bbs-comment-list"></div>
        <div style="display:flex; gap:5px; margin-top:10px;">
            <input type="text" id="bbs-cmt-input" class="bbs-input" style="margin:0;" placeholder="댓글 입력">
            <button class="bbs-btn-basic" onclick="bbsSaveComment()">등록</button>
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
        setTimeout(() => { overlay.style.display = 'none'; }, 300); // 애니메이션 후 숨김
    } else {
        overlay.style.display = 'block';
        // 약간의 딜레이를 줘야 transition이 먹힘 (display:none -> block 직후에는 transition 안됨)
        setTimeout(() => layer.classList.add('open'), 10);
        bbsChangeView('list');
    }
}

function bbsChangeView(viewName, postData = null) {
    document.getElementById('bbs-view-list').style.display = viewName === 'list' ? 'block' : 'none';
    document.getElementById('bbs-view-write').style.display = viewName === 'write' ? 'block' : 'none';
    document.getElementById('bbs-view-detail').style.display = viewName === 'detail' ? 'block' : 'none';

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
        tbody.innerHTML = '<tr><td colspan="2" style="text-align:center; color:#888; padding:20px;">첫 번째 글을 남겨보세요!</td></tr>';
        return;
    }

    tbody.innerHTML = posts.map(p => {
        const profileImg = p.authorImage 
            ? `<img src="${p.authorImage}" style="width:20px; height:20px; border-radius:50%; margin-right:6px; vertical-align:middle; border:1px solid #eee; object-fit:cover;">` 
            : `<span style="display:inline-block; width:20px; text-align:center; margin-right:4px; vertical-align:middle; font-size:1.1rem;">👤</span>`;

        return `
        <tr>
            <td style="padding:10px 5px;">
                <a onclick="bbsLoadDetail(${p.id})" style="display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; cursor:pointer;">
                    ${p.title}
                </a>
            </td>
            <td style="font-size:0.8rem; color:#555; vertical-align:middle; padding:10px 5px;">
                <div style="display:flex; align-items:center;">
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
        alert('처리 중 오류가 발생했습니다. (로그인 확인)');
    }
}

async function bbsLoadDetail(id) {
    bbsCurrentPostId = id;
    const res = await fetch(`/api/bbs/posts?id=${id}`);
    const post = await res.json();
    
    const currentUser = getUserInfo();
    let btnHtml = '';
    
    // 내 글이면 수정/삭제 버튼 생성
    if (currentUser && currentUser.id === post.authorId) {
        btnHtml = `
            <span style="margin-left:auto;">
                <button onclick='bbsEditPost(${JSON.stringify(post).replace(/'/g, "&#39;")})' class="bbs-btn-basic" style="background:#555; font-size:0.75rem; padding:4px 8px;">수정</button>
                <button onclick="bbsDeletePost(${post.id})" class="bbs-btn-basic" style="background:#d9534f; font-size:0.75rem; padding:4px 8px;">삭제</button>
            </span>
        `;
    }

    // [추가] 프로필 이미지 HTML 생성
    const profileImg = post.authorImage 
        ? `<img src="${post.authorImage}" style="width:32px; height:32px; border-radius:50%; margin-right:10px; border:1px solid #ddd; object-fit:cover;">` 
        : `<span style="font-size:1.8rem; margin-right:8px;">👤</span>`;

    // 제목 넣기
    document.getElementById('bbs-detail-title').innerText = post.title;

    // [수정] 작성자 영역 (이미지 + 이름 + 버튼)
    document.getElementById('bbs-detail-author').innerHTML = `
        <div style="display:flex; align-items:center;">
            ${profileImg}
            <div style="display:flex; flex-direction:column;">
                <span style="font-weight:bold; color:#333; font-size:0.95rem;">${post.author}</span>
                <span style="font-size:0.75rem; color:#888;">${post.date || ''}</span>
            </div>
            ${btnHtml}
        </div>
    `;

    // 내용 넣기
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
            ? `<img src="${c.authorImage}" style="width:24px; height:24px; border-radius:50%; margin-right:8px; vertical-align:middle;">`
            : `<span style="display:inline-block; width:24px; text-align:center;">👤</span>`;
        
        let actionBtns = '';
        if (currentUser && currentUser.id === c.authorId) {
            actionBtns = `
                <span id="bbs-cmt-actions-${c.id}" style="font-size:0.8rem; margin-left:10px;">
                    <a onclick="bbsEditComment(${c.id})" style="color:#555; cursor:pointer;">수정</a> | 
                    <a onclick="bbsDeleteComment(${c.id})" style="color:#d9534f; cursor:pointer;">삭제</a>
                </span>
            `;
        }

        return `
        <div class="bbs-comment-item">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <div style="display:flex; align-items:center;">
                    ${profileImg}
                    <strong>${c.author}</strong>
                </div>
                ${actionBtns}
            </div>
            <div id="bbs-cmt-text-${c.id}" style="padding-left:34px; margin-top:5px; color:#555; white-space: pre-wrap;">${c.content}</div>
        </div>
        `;
    }).join('');
}

function bbsEditComment(id) {
    const contentEl = document.getElementById(`bbs-cmt-text-${id}`);
    const actionsEl = document.getElementById(`bbs-cmt-actions-${id}`);
    const originalText = contentEl.innerText;

    contentEl.innerHTML = `<input type="text" id="bbs-cmt-input-${id}" class="bbs-input" style="margin-bottom:0; padding:5px; font-size:0.9rem;">`;
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
        alert('수정 권한이 없거나 오류가 발생했습니다.');
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