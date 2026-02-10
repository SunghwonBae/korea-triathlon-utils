// bbs_layer.js

// 1. 설정
let bbsTargetPage = window.location.pathname.split('/').pop().replace('.html', '');
if (!bbsTargetPage || bbsTargetPage === '') bbsTargetPage = 'index';

// [기능1] 현재 페이지 타이틀 가져오기
const pageTitle = document.title || '메인';

// 2. 유틸리티
function getUserInfo() {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; user_info=`);
    if (parts.length === 2) {
        const decoded = decodeURIComponent(parts.pop().split(';').shift());
        try { return JSON.parse(decoded); } catch(e) { return null; }
    }
    return null;
}

// 3. UI 생성
const currentUser = getUserInfo();
let authHtml = '';

if (currentUser && currentUser.name) {
    const imgTag = currentUser.image 
        ? `<img src="${currentUser.image}" class="bbs-profile-img-large">` 
        : `<div class="bbs-profile-img-placeholder">👤</div>`;
    
    // 관리자 뱃지
    const adminBadge = currentUser.isAdmin ? '<span style="font-size:0.8rem; background:#333; color:white; padding:2px 5px; border-radius:3px; margin-left:5px;">관리자</span>' : '';

    authHtml = `
        <div class="bbs-profile-card">
            ${imgTag}
            <div class="bbs-profile-info">
                <div class="bbs-user-name">${currentUser.name}님 ${adminBadge}</div>
                <button onclick="bbsLogout()" class="bbs-btn-logout">로그아웃</button>
            </div>
        </div>
    `;
} else {
    authHtml = `
        <a href="/api/auth/login" onclick="bbsSaveReturnUrl()" class="naver-login-btn">
            <span class="n-icon">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M11.5 10.2V18H18V0H11.5V7.8L6.5 0H0V18H6.5V10.2L11.5 18V10.2Z" fill="white"/></svg>
            </span>
            <span>네이버 아이디로 로그인</span>
        </a>
    `;
}

// [기능7] 관리자용 공지 옵션 HTML 생성
let noticeOptionsHtml = '';
if (currentUser && currentUser.isAdmin) {
    noticeOptionsHtml = `
        <div style="margin-bottom:10px; display:flex; gap:15px; font-size:0.9rem; font-weight:bold;">
            <label><input type="radio" name="noticeType" value="2" checked> 일반글</label>
            <label style="color:#03C75A;"><input type="radio" name="noticeType" value="1"> [공지]</label>
            <label style="color:#d9534f;"><input type="radio" name="noticeType" value="0"> [전체공지]</label>
        </div>
    `;
}

const bbsHTML = `
<style>
    #bbs-layer * { box-sizing: border-box; }
    #bbs-btn { position: fixed; bottom: 30px; right: 30px; width: 60px; height: 60px; background: #03C75A; color: white; border-radius: 50%; font-size: 28px; border: none; cursor: pointer; z-index: 9999; box-shadow: 0 4px 10px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; transition: transform 0.2s; }
    #bbs-btn:hover { transform: scale(1.1); }
    #bbs-overlay-bg { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.5); z-index: 10000; display: none; }
    #bbs-layer { position: fixed; top: 0; right: -520px; width: 500px; height: 100vh; background: #fff; z-index: 10001; transition: right 0.3s cubic-bezier(0.4, 0, 0.2, 1); box-shadow: -4px 0 15px rgba(0,0,0,0.1); display: flex; flex-direction: column; font-family: -apple-system, sans-serif;}
    #bbs-layer.open { right: 0; }
    @media (max-width: 768px) { #bbs-layer { width: 100%; right: -100%; max-width: 100%; } }
    
    .bbs-header { padding: 15px 20px; background: #fff; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; flex-shrink: 0; }
    .bbs-header h3 { margin: 0; font-size: 1.1rem; color: #111; font-weight: bold; }
    .bbs-close-btn { background: none; border: none; font-size: 20px; cursor: pointer; color: #333; padding: 5px; }
    .bbs-content-wrap { flex: 1; overflow-y: auto; padding: 20px; width: 100%; display: flex; flex-direction: column; }
    .bbs-footer-action { padding: 15px 20px; border-top: 1px solid #eee; background: #fff; flex-shrink: 0; }

    /* 로그인/프로필 CSS (기존 유지) */
    .naver-login-btn { display: flex; align-items: center; justify-content: center; width: 100%; height: 50px; background-color: #03C75A; color: white; text-decoration: none; border-radius: 4px; font-weight: bold; font-size: 15px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .n-icon { margin-right: 12px; display: flex; align-items: center; }
    .bbs-profile-card { display: flex; align-items: center; padding: 15px; background: #f9fafb; border-radius: 8px; border: 1px solid #eee; margin-bottom: 20px; }
    .bbs-profile-img-large { width: 45px; height: 45px; border-radius: 50%; object-fit: cover; border: 1px solid #ddd; margin-right: 12px; }
    .bbs-profile-img-placeholder { width: 45px; height: 45px; border-radius: 50%; background: #eee; display: flex; align-items: center; justify-content: center; font-size: 24px; margin-right: 12px; }
    .bbs-profile-info { display: flex; flex-direction: column; flex: 1; }
    .bbs-user-name { font-weight: bold; font-size: 1rem; color: #333; margin-bottom: 4px; }
    .bbs-btn-logout { background: #fff; border: 1px solid #ccc; padding: 4px 10px; font-size: 12px; color: #666; border-radius: 4px; cursor: pointer; align-self: flex-start; }

    /* 테이블 스타일 */
    .bbs-table { width: 100%; border-collapse: collapse; font-size: 0.95rem; table-layout: fixed; }
    .bbs-table th, .bbs-table td { padding: 12px 5px; border-bottom: 1px solid #f1f1f1; text-align: left; }
    .bbs-table th { color: #888; font-weight: normal; font-size: 0.85rem; border-bottom: 1px solid #ddd; }
    
    /* [기능3] 말줄임표 처리 */
    .bbs-list-title { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; cursor: pointer; font-weight: 500; color: #333; margin-bottom: 4px;}
    .bbs-comment-count { color: #03C75A; font-weight: bold; font-size: 0.8rem; margin-left: 5px; }
    
    /* [기능5] 공지사항 뱃지 */
    .notice-badge-global { color: #d9534f; font-weight: bold; margin-right: 5px; font-size: 0.9rem; }
    .notice-badge-local { color: #03C75A; font-weight: bold; margin-right: 5px; font-size: 0.9rem; }
    
    .bbs-list-meta { display: flex; align-items: center; font-size: 0.8rem; color: #888; }
    .bbs-list-img-small { width: 18px; height: 18px; border-radius: 50%; margin-right: 5px; vertical-align: middle; border: 1px solid #eee; object-fit: cover; }

    .bbs-btn-primary { width: 100%; padding: 14px; background: #333; color: white; border: none; border-radius: 6px; font-weight: bold; font-size: 1rem; cursor: pointer; }
    .bbs-btn-basic { padding: 6px 10px; border: 1px solid #ddd; border-radius: 4px; cursor: pointer; background: #fff; color: #555; font-size: 0.8rem; }
    .bbs-btn-del { color: #d9534f; border-color: #f5c6cb; }
    .bbs-input, .bbs-textarea { width: 100%; padding: 12px; margin-bottom: 15px; border: 1px solid #ddd; border-radius: 6px; font-size: 0.95rem; }
    .bbs-textarea { height: 200px; resize: none; line-height: 1.5; }
    .bbs-comment-item { border-bottom: 1px solid #f5f5f5; padding: 12px 0; font-size: 0.9rem; word-break: break-all; }
    
    /* [기능8] 페이지네이션 스타일 */
    .bbs-pagination { display: flex; justify-content: center; gap: 5px; margin-top: 20px; }
    .bbs-page-btn { padding: 5px 10px; border: 1px solid #ddd; background: white; cursor: pointer; border-radius: 4px; font-size: 0.9rem; color: #555; }
    .bbs-page-btn.active { background: #333; color: white; border-color: #333; font-weight: bold; }
    .bbs-page-btn:hover:not(.active) { background: #f1f1f1; }

</style>

<button id="bbs-btn" onclick="bbsToggleLayer()">💬</button>
<div id="bbs-overlay-bg" onclick="bbsToggleLayer()"></div>

<div id="bbs-layer">
    <div class="bbs-header">
        <h3 id="bbs-top-title">자유게시판 - (${pageTitle})</h3>
        <button class="bbs-close-btn" onclick="bbsToggleLayer()">✕</button>
    </div>
    
    <div class="bbs-content-wrap" id="bbs-view-list">
        ${authHtml}
        
        <table class="bbs-table">
            <colgroup><col width="*"/><col width="90"/></colgroup>
            <thead><tr><th>글제목</th><th>작성자</th></tr></thead>
            <tbody id="bbs-list-tbody"></tbody>
        </table>
        <div id="bbs-pagination" class="bbs-pagination"></div>
    </div>

    <div class="bbs-footer-action" id="bbs-footer-list">
        <button class="bbs-btn-primary" onclick="bbsChangeView('write')">🖊️ 새 글 쓰기</button>
    </div>

    <div class="bbs-content-wrap" id="bbs-view-write" style="display:none;">
        ${noticeOptionsHtml}
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

// 상태 변수
let bbsCurrentPostId = null;
let isEditMode = false;
let editPostId = null;
let currentPage = 1; // [기능8] 현재 페이지

// 메뉴 겹침 방지 (기존 유지)
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

// 함수 정의
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
    document.getElementById('bbs-view-list').style.display = viewName === 'list' ? 'flex' : 'none';
    document.getElementById('bbs-view-write').style.display = viewName === 'write' ? 'block' : 'none';
    document.getElementById('bbs-view-detail').style.display = viewName === 'detail' ? 'block' : 'none';

    document.getElementById('bbs-footer-list').style.display = viewName === 'list' ? 'block' : 'none';
    document.getElementById('bbs-footer-write').style.display = viewName === 'write' ? 'block' : 'none';
    document.getElementById('bbs-footer-detail').style.display = viewName === 'detail' ? 'block' : 'none';

    if (viewName === 'list') {
        bbsLoadPosts(currentPage); // 현재 페이지 로드
        isEditMode = false;
        editPostId = null;
    } else if (viewName === 'write') {
        // 라디오 버튼 초기화 (기본값: 일반글)
        const radios = document.getElementsByName('noticeType');
        if(radios.length > 0) {
            for(let r of radios) if(r.value === "2") r.checked = true;
        }

        if (postData) {
            isEditMode = true;
            editPostId = postData.id;
            document.getElementById('bbs-write-title').value = postData.title;
            document.getElementById('bbs-write-content').value = postData.content;
            document.getElementById('bbs-btn-save').innerText = "수정 완료";
            
            // 수정 시 공지 타입 반영
            if(radios.length > 0 && postData.noticeType !== undefined) {
                 for(let r of radios) if(parseInt(r.value) === postData.noticeType) r.checked = true;
            }

        } else {
            isEditMode = false;
            editPostId = null;
            document.getElementById('bbs-write-title').value = '';
            document.getElementById('bbs-write-content').value = '';
            document.getElementById('bbs-btn-save').innerText = "등록하기";
        }
    }
}

// [핵심] 목록 로드 (공지 + 일반 + 페이지네이션)
async function bbsLoadPosts(page = 1) {
    currentPage = page;
    const res = await fetch(`/api/bbs/posts?targetPage=${bbsTargetPage}&page=${page}`);
    const data = await res.json();
    
    // data 구조: { notices: [], posts: [], totalPosts: 100, totalPages: 10 }
    
    const tbody = document.getElementById('bbs-list-tbody');
    let html = '';

    // 1. 공지사항 렌더링 (전체공지 -> 페이지공지 순)
    if (data.notices && data.notices.length > 0) {
        html += data.notices.map(p => renderPostRow(p, true)).join('');
    }

    // 2. 일반 게시글 렌더링
    if (data.posts.length === 0 && (!data.notices || data.notices.length === 0)) {
        html = '<tr><td colspan="2" style="text-align:center; color:#888; padding:40px 0;">첫 번째 글의 주인공이 되어보세요!</td></tr>';
    } else {
        html += data.posts.map(p => renderPostRow(p, false)).join('');
    }

    tbody.innerHTML = html;

    // 3. 페이지네이션 렌더링
    renderPagination(data.totalPages, page);
}

// 게시글 행 그리기 함수 (중복 제거)
function renderPostRow(p, isNotice) {
    let titlePrefix = '';
    let rowStyle = '';

    // [기능5] 공지 뱃지 처리
    if (isNotice) {
        if (p.noticeType === 0) {
            titlePrefix = `<span class="notice-badge-global">[전체공지]</span>`;
            rowStyle = 'background-color:#fff8f8;'; // 전체공지 강조 배경
        } else if (p.noticeType === 1) {
            titlePrefix = `<span class="notice-badge-local">[공지]</span>`;
            rowStyle = 'background-color:#f9fff9;'; // 페이지공지 강조 배경
        }
    }

    // [기능3] 댓글 수 표시 ([n])
    const cmtCount = p.commentCount > 0 ? `<span class="bbs-comment-count">[${p.commentCount}]</span>` : '';
    
    const profileImg = p.authorImage 
            ? `<img src="${p.authorImage}" class="bbs-list-img-small">` 
            : `<span class="bbs-list-img-small" style="display:inline-flex; align-items:center; justify-content:center; background:#eee;">👤</span>`;

    return `
    <tr style="${rowStyle}">
        <td>
            <a onclick="bbsLoadDetail(${p.id})" class="bbs-list-title">
                ${titlePrefix} ${p.title} ${cmtCount}
            </a>
        </td>
        <td>
            <div class="bbs-list-meta">
                ${profileImg}
                <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:60px;">${p.author}</span>
            </div>
        </td>
    </tr>
    `;
}

// [기능8] 페이지네이션 버튼 그리기
function renderPagination(total, current) {
    const container = document.getElementById('bbs-pagination');
    if (total <= 1) {
        container.innerHTML = '';
        return;
    }

    let html = '';
    
    // 1부터 total까지 숫자 버튼 생성 (너무 많으면 생략 로직 필요하지만 일단 심플하게)
    const start = Math.max(1, current - 2);
    const end = Math.min(total, current + 2);

    if (start > 1) html += `<button class="bbs-page-btn" onclick="bbsLoadPosts(1)">1</button>`;
    if (start > 2) html += `<span style="padding:5px;">...</span>`;

    for (let i = start; i <= end; i++) {
        const activeClass = i === current ? 'active' : '';
        html += `<button class="bbs-page-btn ${activeClass}" onclick="bbsLoadPosts(${i})">${i}</button>`;
    }

    if (end < total - 1) html += `<span style="padding:5px;">...</span>`;
    if (end < total) html += `<button class="bbs-page-btn" onclick="bbsLoadPosts(${total})">${total}</button>`;

    container.innerHTML = html;
}

async function bbsSavePost() {
    const title = document.getElementById('bbs-write-title').value;
    const content = document.getElementById('bbs-write-content').value;
    if(!title || !content) return alert('내용을 입력하세요.');

    // 공지 타입 확인 (라디오 버튼)
    let noticeType = 2; // 기본: 일반
    const radios = document.getElementsByName('noticeType');
    if (radios.length > 0) {
        for(let r of radios) { if(r.checked) noticeType = r.value; }
    }

    const method = isEditMode ? 'PUT' : 'POST';
    const body = { title, content, targetPage: bbsTargetPage, noticeType: noticeType };
    if (isEditMode) body.id = editPostId;

    const res = await fetch('/api/bbs/posts', {
        method: method,
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(body)
    });

    if (res.ok) {
        bbsChangeView('list');
    } else {
        alert('오류가 발생했습니다.');
    }
}

// ... (bbsLoadDetail, bbsEditPost, bbsDeletePost, bbsLoadComments, bbsEditComment 등 기존 로직 유지)
async function bbsLoadDetail(id) {
    bbsCurrentPostId = id;
    const res = await fetch(`/api/bbs/posts?id=${id}`);
    const post = await res.json();
    
    const currentUser = getUserInfo();
    let btnHtml = '';
    
    if (currentUser && (currentUser.id === post.authorId || currentUser.isAdmin)) {
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
    
    // 제목
    document.getElementById('bbs-detail-title').innerText = post.title;
    
    // 작성자 및 공지 표시
    let badge = '';
    if(post.noticeType === 0) badge = '<span class="notice-badge-global">[전체공지]</span>';
    else if(post.noticeType === 1) badge = '<span class="notice-badge-local">[공지]</span>';

    document.getElementById('bbs-detail-author').innerHTML = `
        <div style="display:flex; align-items:center; width:100%;">
            ${profileImg}
            <div style="display:flex; flex-direction:column;">
                <span style="font-weight:bold; color:#333; font-size:0.95rem;">${post.author}</span>
                <span style="font-size:0.75rem; color:#999;">${post.date || ''} ${badge}</span>
            </div>
            ${btnHtml}
        </div>
    `;
    document.getElementById('bbs-detail-content').innerText = post.content;
    
    bbsLoadComments();
    bbsChangeView('detail');
}

// 이하 함수들은 기존 코드와 동일하여 생략하거나 그대로 두시면 됩니다.
// (bbsEditPost, bbsDeletePost, bbsLoadComments, bbsEditComment, bbsSaveEditedComment, bbsDeleteComment, bbsSaveComment 등)

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
        if (currentUser && (currentUser.id === c.authorId || currentUser.isAdmin)) {
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