// public/bbs_layer.js

// 0. SunEditor 리소스 동적 로드
(function loadSunEditor() {
    if (document.getElementById('suneditor-css')) return;
    const link = document.createElement('link');
    link.id = 'suneditor-css';
    link.rel = 'stylesheet';
    link.href = 'https://cdn.jsdelivr.net/npm/suneditor@latest/dist/css/suneditor.min.css';
    document.head.appendChild(link);
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/suneditor@latest/dist/suneditor.min.js';
    document.body.appendChild(script);
})();

// 1. 설정 및 모드 감지
const isManagerMode = window.location.pathname.includes('admin');

let bbsTargetPage = window.location.pathname.split('/').pop().replace('.html', '');
if (!bbsTargetPage || bbsTargetPage === '') bbsTargetPage = 'index';
if (isManagerMode) bbsTargetPage = 'ALL';

const pageTitle = document.title || '메인';
let editorInstance = null;

window.addEventListener('message', function(e) {
    if (e.data && e.data.type === 'NAVER_LOGIN_SUCCESS') {
        const separator = window.location.search ? '&' : '?';
        const newUrl = window.location.pathname + window.location.search + separator + "bbs_open=true";
        window.location.href = newUrl;
    }
});

function getUserInfo() {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; user_info=`);
    if (parts.length === 2) {
        const decoded = decodeURIComponent(parts.pop().split(';').shift());
        try { return JSON.parse(decoded); } catch(e) { return null; }
    }
    return null;
}

function formatCommentDate(dateString) {
    if(!dateString) return '';
    const date = new Date(dateString);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const h = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${d} ${h}:${min}`;
}

// 3. UI 생성
const currentUser = getUserInfo();
let authHtml = '';

if (currentUser && currentUser.name) {
    const imgTag = currentUser.image 
        ? `<img src="${currentUser.image}" class="bbs-profile-img-large">` 
        : `<div class="bbs-profile-img-placeholder">👤</div>`;
    
    const adminBadge = currentUser.isAdmin ? '<span style="font-size:0.7rem; background:#333; color:white; padding:1px 4px; border-radius:3px; margin-left:5px;">관리자</span>' : '';

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
        <a href="#" onclick="bbsOpenLoginPopup(); return false;" class="naver-login-btn">
            <span class="n-icon">
                <svg width="14" height="14" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M11.5 10.2V18H18V0H11.5V7.8L6.5 0H0V18H6.5V10.2L11.5 18V10.2Z" fill="white"/></svg>
            </span>
            <span>네이버 아이디로 로그인</span>
        </a>
    `;
}

function bbsOpenLoginPopup() {
    const width = 500;
    const height = 650;
    const left = (window.screen.width / 2) - (width / 2);
    const top = (window.screen.height / 2) - (height / 2);
    window.open('/api/auth/login', 'naver_login_popup', `width=${width},height=${height},top=${top},left=${left}`);
}

// ★ [수정됨] 공지 옵션 생성 로직
let noticeOptionsHtml = '';
if (currentUser && currentUser.isAdmin) {
    let options = `
        <label><input type="radio" name="noticeType" value="2" checked> 일반글</label>
        <label style="color:#03C75A;"><input type="radio" name="noticeType" value="1"> [공지]</label>
    `;

    // ★ 관리자 모드일 때만 '전체공지' 옵션을 보여줌
    if (isManagerMode) {
        options += `<label style="color:#d9534f;"><input type="radio" name="noticeType" value="0"> [전체공지]</label>`;
    }

    noticeOptionsHtml = `
        <div style="margin-bottom:10px; display:flex; gap:15px; font-size:0.9rem; font-weight:bold;">
            ${options}
        </div>
    `;
}

let managerSelectHtml = '';
if (isManagerMode) {
    managerSelectHtml = `
        <select id="bbs-manager-select" onchange="bbsChangeCategory(this.value)" 
            style="padding:5px; border-radius:4px; border:1px solid #ddd; font-size:0.9rem; margin-right:10px;">
            <option value="ALL">전체 게시글</option>
        </select>
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
    
    .bbs-header { padding: 12px 20px; background: #fff; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; flex-shrink: 0; }
    .bbs-header h3 { margin: 0; font-size: 1rem; color: #111; font-weight: bold; }
    .bbs-close-btn { background: none; border: none; font-size: 18px; cursor: pointer; color: #333; padding: 5px; }
    .bbs-content-wrap { flex: 1; overflow-y: auto; padding: 10px 20px; width: 100%; display: flex; flex-direction: column; }
    .bbs-footer-action { padding: 10px 20px; border-top: 1px solid #eee; background: #fff; flex-shrink: 0; }
    .naver-login-btn { display: flex; align-items: center; justify-content: center; width: 100%; height: 40px; background-color: #03C75A; color: white; text-decoration: none; border-radius: 4px; font-weight: bold; font-size: 14px; margin-bottom: 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .n-icon { margin-right: 8px; display: flex; align-items: center; }
    .bbs-profile-card { display: flex; align-items: center; padding: 10px; background: #f9fafb; border-radius: 6px; border: 1px solid #eee; margin-bottom: 10px; }
    .bbs-profile-img-large { width: 36px; height: 36px; border-radius: 50%; object-fit: cover; border: 1px solid #ddd; margin-right: 10px; }
    .bbs-profile-img-placeholder { width: 36px; height: 36px; border-radius: 50%; background: #eee; display: flex; align-items: center; justify-content: center; font-size: 20px; margin-right: 10px; }
    .bbs-profile-info { display: flex; flex-direction: column; flex: 1; }
    .bbs-user-name { font-weight: bold; font-size: 0.9rem; color: #333; margin-bottom: 2px; }
    .bbs-btn-logout { background: #fff; border: 1px solid #ccc; padding: 2px 8px; font-size: 11px; color: #666; border-radius: 3px; cursor: pointer; align-self: flex-start; }
    .bbs-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; table-layout: fixed; }
    .bbs-table th, .bbs-table td { padding: 6px 4px; border-bottom: 1px solid #f1f1f1; text-align: left; }
    .bbs-table th { color: #888; font-weight: normal; font-size: 0.8rem; border-bottom: 1px solid #ddd; padding: 8px 4px; }
    .bbs-list-title { display: flex; align-items: center; width: 100%; cursor: pointer; text-decoration: none; color: #333; }
    .bbs-list-title-text { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; min-width: 0; font-weight: 500; margin-bottom: 1px; line-height: 1.2; }
    .bbs-comment-count { color: #03C75A; font-weight: bold; font-size: 0.75rem; margin-left: 5px; flex-shrink: 0; }
    .bbs-list-meta { display: flex; align-items: center; font-size: 0.75rem; color: #999; }
    .bbs-list-img-small { width: 16px; height: 16px; border-radius: 50%; margin-right: 4px; vertical-align: middle; border: 1px solid #eee; object-fit: cover; }
    .bbs-date { font-size: 0.75rem; color: #bbb; }
    .bbs-btn-primary { width: 100%; height: 40px; padding: 0 10px; background: #333; color: white; border: none; border-radius: 6px; font-weight: bold; font-size: 0.95rem; cursor: pointer; display: flex; align-items: center; justify-content: center; }
    .bbs-btn-basic { padding: 5px 8px; border: 1px solid #ddd; border-radius: 4px; cursor: pointer; background: #fff; color: #555; font-size: 0.75rem; }
    .bbs-btn-del { color: #d9534f; border-color: #f5c6cb; }
    .bbs-input { width: 100%; padding: 10px; margin-bottom: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 0.9rem; }
    .bbs-textarea { width: 100%; height: 300px; display:none; }
    .bbs-comment-item { border-bottom: 1px solid #f5f5f5; padding: 10px 0; font-size: 0.9rem; word-break: break-all; }
    .bbs-pagination { display: flex; justify-content: center; gap: 4px; margin-top: 15px; }
    .bbs-page-btn { padding: 4px 8px; border: 1px solid #ddd; background: white; cursor: pointer; border-radius: 3px; font-size: 0.8rem; color: #555; }
    .bbs-page-btn.active { background: #333; color: white; border-color: #333; font-weight: bold; }
    .bbs-page-btn:hover:not(.active) { background: #f1f1f1; }
    .sun-editor { z-index: 10002 !important; border: 1px solid #ddd !important; border-radius: 6px; overflow: hidden;}
    .sun-editor .se-toolbar { outline: none; }
    #bbs-detail-content img { max-width: 100%; height: auto; }
</style>

<button id="bbs-btn" onclick="bbsToggleLayer()" style="display:none;">💬</button>
<div id="bbs-overlay-bg" onclick="bbsToggleLayer()"></div>

<div id="bbs-layer">
    <div class="bbs-header">
        <div style="display:flex; align-items:center;">
            ${managerSelectHtml}
            <h3 id="bbs-top-title">게시판 - (${pageTitle})</h3>
        </div>
        <button class="bbs-close-btn" onclick="bbsToggleLayer()">✕</button>
    </div>
    
    <div class="bbs-content-wrap" id="bbs-view-list">
        ${authHtml}
        
        <table class="bbs-table">
            <colgroup><col width="*"/><col width="75"/><col width="70"/></colgroup>
            <thead><tr><th>글제목</th><th>작성자</th><th>등록일</th></tr></thead>
            <tbody id="bbs-list-tbody"></tbody>
        </table>
        <div id="bbs-pagination" class="bbs-pagination"></div>
    </div>

    <div class="bbs-footer-action" id="bbs-footer-list">
        <button class="bbs-btn-primary" onclick="bbsChangeView('write')">🖊️ 새 글 쓰기</button>
    </div>

    <div class="bbs-content-wrap" id="bbs-view-write" style="display:none; padding:10px 15px;">
        ${noticeOptionsHtml}
        <input type="text" id="bbs-write-title" class="bbs-input" placeholder="제목">
        <textarea id="bbs-write-content" class="bbs-textarea"></textarea>
    </div>
    <div class="bbs-footer-action" id="bbs-footer-write" style="display:none;">
        <div style="display:flex; gap: 10px;">
            <button class="bbs-btn-basic" style="flex:1; height:40px;" onclick="bbsChangeView('list')">취소</button>
            <button class="bbs-btn-primary" id="bbs-btn-save" style="flex:2;" onclick="bbsSavePost()">등록</button>
        </div>
    </div>

    <div class="bbs-content-wrap" id="bbs-view-detail" style="display:none;">
        <h3 id="bbs-detail-title" style="margin: 0 0 10px 0; font-size:1.2rem; word-break: keep-all; line-height:1.4;"></h3>
        <div class="bbs-meta" id="bbs-detail-author-wrap" style="display:flex; align-items:center; min-height:36px; margin-bottom: 15px; padding-bottom:10px; border-bottom:1px solid #eee;">
            <span id="bbs-detail-author" style="width:100%;"></span>
        </div>
        <div id="bbs-detail-content" style="white-space: normal; font-size:0.95rem; line-height:1.6; min-height:100px; word-break: break-word; color:#333;"></div>
        <h4 style="margin-top:30px; border-top:1px solid #eee; padding-top:15px; font-size:0.9rem;">댓글</h4>
        <div id="bbs-comment-list" style="margin-bottom: 20px;"></div>
    </div>
    
    <div class="bbs-footer-action" id="bbs-footer-detail" style="display:none;">
        <div style="display:flex; gap:8px;">
            <button class="bbs-btn-basic" onclick="bbsChangeView('list')" style="min-width: 60px;">글목록</button>
            <input type="text" id="bbs-cmt-input" class="bbs-input" style="margin:0; flex:1; height:40px;" placeholder="댓글 입력">
            <button class="bbs-btn-primary" style="width: 50px; padding:0;" onclick="bbsSaveComment()">등록</button>
        </div>
    </div>
</div>
`;
document.body.insertAdjacentHTML('beforeend', bbsHTML);

let bbsCurrentPostId = null;
let isEditMode = false;
let editPostId = null;
let currentPage = 1;

const checkMenuOverlay = document.getElementById('menuOverlay');
if (checkMenuOverlay) {
    const observer = new MutationObserver(() => {
        if (window.getComputedStyle(checkMenuOverlay).display === 'block') {
            document.getElementById('bbs-layer').classList.remove('open');
            document.getElementById('bbs-overlay-bg').style.display = 'none';
            document.body.style.overflow = '';
        }
    });
    observer.observe(checkMenuOverlay, { attributes: true, attributeFilter: ['style', 'class'] });
}

function bbsSaveReturnUrl() {
    document.cookie = `login_return_url=${window.location.pathname}; path=/; max-age=3600`;
}

function bbsLogout() {
    if (typeof showConfirm === 'function') {
        showConfirm('로그아웃 하시겠습니까?', () => {
            document.cookie = 'auth_token=; path=/; max-age=0';
            document.cookie = 'user_info=; path=/; max-age=0';
            window.location.reload();
        });
    } else if(confirm('로그아웃 하시겠습니까?')) {
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
        document.body.style.overflow = '';
    } else {
        overlay.style.display = 'block';
        setTimeout(() => layer.classList.add('open'), 10);
        bbsChangeView('list');
        document.body.style.overflow = 'hidden';
    }
}

function bbsChangeCategory(val) {
    bbsTargetPage = val;
    bbsLoadPosts(1);
}

async function bbsLoadCategories() {
    if (!isManagerMode) return;
    try {
        const res = await fetch('/api/bbs/posts?type=categories');
        const categories = await res.json();
        const select = document.getElementById('bbs-manager-select');
        if (select) {
            categories.forEach(cat => {
                if (cat === 'ALL') return; // 'ALL' 중복 방지
                const opt = document.createElement('option');
                opt.value = cat;
                opt.innerText = cat;
                select.appendChild(opt);
            });
        }
    } catch(e) { console.error(e); }
}

function bbsChangeView(viewName, postData = null) {
    if (viewName === 'write') {
        const user = getUserInfo();
        if (!user) {
            if (typeof showConfirm === 'function') {
                showConfirm('네이버 아이디로 로그인이 필요합니다.', () => {
                    bbsOpenLoginPopup();
                });
            } else {
                alert('로그인이 필요합니다.');
                bbsOpenLoginPopup();
            }
            return;
        }
    }

    document.getElementById('bbs-view-list').style.display = viewName === 'list' ? 'flex' : 'none';
    document.getElementById('bbs-view-write').style.display = viewName === 'write' ? 'block' : 'none';
    document.getElementById('bbs-view-detail').style.display = viewName === 'detail' ? 'block' : 'none';

    document.getElementById('bbs-footer-list').style.display = viewName === 'list' ? 'block' : 'none';
    document.getElementById('bbs-footer-write').style.display = viewName === 'write' ? 'block' : 'none';
    document.getElementById('bbs-footer-detail').style.display = viewName === 'detail' ? 'block' : 'none';

    if (viewName === 'write') {
        if (!editorInstance && window.SUNEDITOR) {
            editorInstance = SUNEDITOR.create('bbs-write-content', {
                width: '100%',
                height: '350px',
                imageUploadSizeLimit: 1024 * 150, 
                imageResizing: true,        
                imageWidth: '400',
                defaultStyle: "font-family: -apple-system; font-size: 16px;",
                buttonList: [
                    ['undo', 'redo'],
                    ['font', 'fontSize', 'formatBlock'],
                    ['bold', 'underline', 'italic', 'strike', 'subscript', 'superscript'],
                    ['fontColor', 'hiliteColor'],
                    ['outdent', 'indent', 'align', 'horizontalRule', 'list', 'table'],
                    ['link', 'image', 'showBlocks'] 
                ],
                onImageUploadError: function (errorMessage, result) {
                    if(typeof showToast === 'function') showToast('이미지는 150KB 이하만 가능합니다. (자동 400px 축소)');
                    else alert('이미지는 150KB 이하만 가능합니다.');
                    return false;
                }
            });
        }

        const radios = document.getElementsByName('noticeType');
        if(radios.length > 0) {
            for(let r of radios) if(r.value === "2") r.checked = true;
        }

        if (postData) {
            isEditMode = true;
            editPostId = postData.id;
            document.getElementById('bbs-write-title').value = postData.title;
            if(editorInstance) editorInstance.setContents(postData.content);
            else document.getElementById('bbs-write-content').value = postData.content;

            document.getElementById('bbs-btn-save').innerText = "수정 완료";
            
            if(radios.length > 0 && postData.noticeType !== undefined) {
                 for(let r of radios) if(parseInt(r.value) === postData.noticeType) r.checked = true;
            }

        } else {
            isEditMode = false;
            editPostId = null;
            document.getElementById('bbs-write-title').value = '';
            if(editorInstance) editorInstance.setContents('');
            else document.getElementById('bbs-write-content').value = '';

            document.getElementById('bbs-btn-save').innerText = "등록하기";
        }
    } else if (viewName === 'list') {
        bbsLoadPosts(currentPage);
        isEditMode = false;
        editPostId = null;
    }
}

async function bbsLoadPosts(page = 1) {
    currentPage = page;
    const res = await fetch(`/api/bbs/posts?targetPage=${bbsTargetPage}&page=${page}`);
    const data = await res.json();
    
    if (page > 1 && data.posts.length === 0) {
        bbsLoadPosts(page - 1); 
        return;
    }

    const tbody = document.getElementById('bbs-list-tbody');
    let html = '';

    if (data.notices && data.notices.length > 0) {
        html += data.notices.map(p => renderPostRow(p, true)).join('');
    }

    if (data.posts.length === 0 && (!data.notices || data.notices.length === 0)) {
        html = '<tr><td colspan="3" style="text-align:center; color:#888; padding:30px 0;">첫 글의 주인공이 되어보세요!</td></tr>';
    } else {
        html += data.posts.map(p => renderPostRow(p, false)).join('');
    }

    tbody.innerHTML = html;
    renderPagination(data.totalPages, page);
}

function renderPostRow(p, isNotice) {
    let titlePrefix = '';
    let rowStyle = '';

    if (isNotice) {
        if (p.noticeType === 0) {
            titlePrefix = `<span class="notice-badge-global">[전체]</span>`; 
            rowStyle = 'background-color:#fff8f8;';
        } else if (p.noticeType === 1) {
            titlePrefix = `<span class="notice-badge-local">[공지]</span>`;
            rowStyle = 'background-color:#f9fff9;';
        }
    }

    // ★ [수정됨] 관리자 모드 + 전체 보기일 때 로직
    if (isManagerMode && bbsTargetPage === 'ALL' && !isNotice) {
        // 1. 페이지 뱃지
        titlePrefix += `<span style="font-size:0.75rem; color:#888; border:1px solid #ddd; border-radius:3px; padding:0 4px; margin-right:4px;">${p.targetPage}</span>`;
        
        // 2. ★ [공지] 뱃지 추가 (noticeType이 1이면)
        if (p.noticeType === 1) {
            titlePrefix += `<span style="color:#03C75A; font-weight:bold; margin-right:4px; font-size:0.85rem;">[공지]</span>`;
        }
    }

    const cmtCount = p.commentCount > 0 ? `<span class="bbs-comment-count">[${p.commentCount}]</span>` : '';
    
    const imgSrc = p.authorImage || p.profileImage || p.image;
    const profileImg = imgSrc
            ? `<img src="${imgSrc}" class="bbs-list-img-small">` 
            : `<span class="bbs-list-img-small" style="display:inline-flex; align-items:center; justify-content:center; background:#eee;">👤</span>`;

    return `
    <tr style="${rowStyle}">
        <td>
            <a onclick="bbsLoadDetail(${p.id})" class="bbs-list-title">
                <span class="bbs-list-title-text">${titlePrefix} ${p.title}</span>
                ${cmtCount}
            </a>
        </td>
        <td>
            <div class="bbs-list-meta">
                ${profileImg}
                <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:50px;">${p.author}</span>
            </div>
        </td>
        <td>
            <div class="bbs-date">${p.date}</div>
        </td>
    </tr>
    `;
}

function renderPagination(total, current) {
    const container = document.getElementById('bbs-pagination');
    if (total <= 1) {
        container.innerHTML = '';
        return;
    }

    let html = '';
    const start = Math.max(1, current - 2);
    const end = Math.min(total, current + 2);

    if (start > 1) html += `<button class="bbs-page-btn" onclick="bbsLoadPosts(1)">1</button>`;
    if (start > 2) html += `<span style="padding:4px;">...</span>`;

    for (let i = start; i <= end; i++) {
        const activeClass = i === current ? 'active' : '';
        html += `<button class="bbs-page-btn ${activeClass}" onclick="bbsLoadPosts(${i})">${i}</button>`;
    }

    if (end < total - 1) html += `<span style="padding:4px;">...</span>`;
    if (end < total) html += `<button class="bbs-page-btn" onclick="bbsLoadPosts(${total})">${total}</button>`;

    container.innerHTML = html;
}

async function bbsSavePost() {
    const title = document.getElementById('bbs-write-title').value;
    let content = '';
    if(editorInstance) content = editorInstance.getContents();
    else content = document.getElementById('bbs-write-content').value;

    if(!title || !content || content === '<p><br></p>') {
        if(typeof showToast === 'function') showToast('내용을 입력하세요.');
        else alert('내용을 입력하세요.');
        return;
    }

    let noticeType = 2;
    const radios = document.getElementsByName('noticeType');
    if (radios.length > 0) {
        for(let r of radios) { if(r.checked) noticeType = parseInt(r.value); }
    }

    let finalTargetPage = bbsTargetPage;

    if (isManagerMode) {
        const selectEl = document.getElementById('bbs-manager-select');
        if (selectEl) finalTargetPage = selectEl.value;

        if (noticeType === 0) {
            finalTargetPage = 'ALL';
        } else {
            if (finalTargetPage === 'ALL') {
                if(typeof showToast === 'function') showToast("일반글이나 페이지 공지는 '전체 게시글(ALL)' 카테고리에 작성할 수 없습니다. 우측 상단에서 구체적인 페이지를 선택해주세요.");
                else alert("일반글이나 페이지 공지는 '전체 게시글(ALL)' 카테고리에 작성할 수 없습니다.\n우측 상단에서 구체적인 페이지를 선택해주세요.");
                return;
            }
        }
    }

    const method = isEditMode ? 'PUT' : 'POST';
    const body = { title, content, targetPage: finalTargetPage, noticeType: noticeType };
    if (isEditMode) body.id = editPostId;

    const res = await fetch('/api/bbs/posts', {
        method: method,
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(body)
    });

    if (res.ok) {
        if (!isEditMode) currentPage = 1;
        bbsChangeView('list');
        if(typeof showToast === 'function') showToast(isEditMode ? '수정되었습니다.' : '등록되었습니다.');
    } else {
        if(typeof showToast === 'function') showToast('오류가 발생했습니다.');
        else alert('오류가 발생했습니다.');
    }
}

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

    const imgSrc = post.authorImage || post.profileImage || post.image;
    const profileImg = imgSrc
        ? `<img src="${imgSrc}" style="width:36px; height:36px; border-radius:50%; margin-right:10px; border:1px solid #ddd; object-fit:cover;">` 
        : `<span style="font-size:2rem; margin-right:10px;">👤</span>`;
    
    document.getElementById('bbs-detail-title').innerText = post.title;
    
    let badge = '';
    if(post.noticeType === 0) badge = '<span class="notice-badge-global">[전체]</span>';
    else if(post.noticeType === 1) badge = '<span class="notice-badge-local">[공지]</span>';

    document.getElementById('bbs-detail-author').innerHTML = `
        <div style="display:flex; align-items:center; width:100%;">
            ${profileImg}
            <div style="display:flex; flex-direction:column;">
                <span style="font-weight:bold; color:#333; font-size:0.95rem;">${post.author}</span>
                <span style="font-size:0.8rem; color:#888; margin-top:2px;">${post.date || ''} ${badge}</span>
            </div>
            ${btnHtml}
        </div>
    `;
    
    document.getElementById('bbs-detail-content').innerHTML = post.content;
    
    bbsLoadComments();
    bbsChangeView('detail');
}

function bbsEditPost(post) { bbsChangeView('write', post); }

async function bbsDeletePost(id) {
    const doDelete = async () => {
        const res = await fetch(`/api/bbs/posts?id=${id}`, { method: 'DELETE' });
        if(res.ok) { 
            if(typeof showToast === 'function') showToast('삭제되었습니다.');
            else alert('삭제되었습니다.');
            bbsChangeView('list'); 
        }
    };

    if (typeof showConfirm === 'function') {
        showConfirm('정말 삭제하시겠습니까?', doDelete);
    } else if(confirm('정말 삭제하시겠습니까?')) {
        doDelete();
    }
}

async function bbsLoadComments() {
    if (!bbsCurrentPostId) return;
    const res = await fetch(`/api/bbs/comments?postId=${bbsCurrentPostId}`);
    const cmts = await res.json();
    const currentUser = getUserInfo();
    
    document.getElementById('bbs-comment-list').innerHTML = cmts.map(c => {
        const imgSrc = c.authorImage || c.profileImage || c.image;
        
        const profileImg = imgSrc 
            ? `<img src="${imgSrc}" style="width:28px; height:28px; border-radius:50%; margin-right:8px; vertical-align:middle; border:1px solid #eee; object-fit:cover;">` 
            : `<span style="display:inline-block; width:28px; height:28px; line-height:28px; text-align:center; border-radius:50%; background:#eee; margin-right:8px; vertical-align:middle; font-size:16px;">👤</span>`;
            
        let actionBtns = '';
        if (currentUser && (currentUser.id === c.authorId || currentUser.isAdmin)) {
            actionBtns = `<span id="bbs-cmt-actions-${c.id}" style="font-size:0.75rem; margin-left:10px;"><a onclick="bbsEditComment(${c.id})" style="color:#888; cursor:pointer;">수정</a> | <a onclick="bbsDeleteComment(${c.id})" style="color:#d9534f; cursor:pointer;">삭제</a></span>`;
        }

        const dateStr = formatCommentDate(c.createdAt);

        return `
        <div class="bbs-comment-item">
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                <div style="display:flex; align-items:center;">
                    ${profileImg}
                    <strong style="font-size:0.9rem; margin-right:6px;">${c.author}</strong>
                    <span style="font-size:0.7rem; color:#aaa;">${dateStr}</span>
                </div>
                ${actionBtns}
            </div>
            <div id="bbs-cmt-text-${c.id}" style="padding-left:38px; margin-top:2px; color:#555; white-space: pre-wrap; font-size:0.9rem;">${c.content}</div>
        </div>`;
    }).join('');
}

function bbsEditComment(id) {
    const contentEl = document.getElementById(`bbs-cmt-text-${id}`);
    const actionsEl = document.getElementById(`bbs-cmt-actions-${id}`);
    const originalText = contentEl.innerText;
    contentEl.innerHTML = `<input type="text" id="bbs-cmt-input-${id}" class="bbs-input" style="margin-bottom:0; padding:6px; font-size:0.9rem;" value="">`;
    document.getElementById(`bbs-cmt-input-${id}`).value = originalText;
    actionsEl.innerHTML = `<a onclick="bbsSaveEditedComment(${id})" style="color:#03C75A; cursor:pointer; font-weight:bold; margin-right:5px; font-size:0.8rem;">저장</a> <a onclick="bbsLoadComments()" style="color:#888; cursor:pointer; font-size:0.8rem;">취소</a>`;
    document.getElementById(`bbs-cmt-input-${id}`).focus();
}

async function bbsSaveEditedComment(id) {
    const inputEl = document.getElementById(`bbs-cmt-input-${id}`);
    const newContent = inputEl.value;
    if (!newContent.trim()) {
        if(typeof showToast === 'function') showToast('내용을 입력하세요.');
        else alert('내용을 입력하세요.');
        return;
    }
    await fetch('/api/bbs/comments', { method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ id, content: newContent }) });
    bbsLoadComments();
    if(typeof showToast === 'function') showToast('수정되었습니다.');
}

async function bbsDeleteComment(id) { 
    const doDelete = async () => {
        await fetch(`/api/bbs/comments?id=${id}`, { method: 'DELETE' }); 
        bbsLoadComments(); 
        if(typeof showToast === 'function') showToast('삭제되었습니다.');
    };

    if (typeof showConfirm === 'function') {
        showConfirm('댓글을 삭제할까요?', doDelete);
    } else if(confirm('댓글을 삭제할까요?')) {
        doDelete();
    }
}

async function bbsSaveComment() {
    const user = getUserInfo();
    if (!user) {
        if (typeof showConfirm === 'function') {
            showConfirm('네이버 아이디로 로그인이 필요합니다.', () => {
                bbsOpenLoginPopup();
            });
        } else {
            alert('로그인이 필요합니다.');
            bbsOpenLoginPopup();
        }
        return;
    }

    const content = document.getElementById('bbs-cmt-input').value;
    if(!content) {
        if(typeof showToast === 'function') showToast('댓글 내용을 입력하세요.');
        return;
    }
    const res = await fetch(`/api/bbs/comments?postId=${bbsCurrentPostId}`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ content }) });
    if (res.ok) { 
        document.getElementById('bbs-cmt-input').value = ''; 
        bbsLoadComments(); 
    } else { 
        if(typeof showToast === 'function') showToast('오류가 발생했습니다.');
        else alert('오류가 발생했습니다.');
    }
}

const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('bbs_open') === 'true') {
    bbsToggleLayer();
    const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname + window.location.search.replace(/[\?&]bbs_open=true/, '');
    history.replaceState({}, document.title, newUrl);
}
async function bbsOpenStatus() {
    const res = await fetch('/api/bbs/posts?type=bbsStatus');
    const data = await res.json();
    if(!data.open) {
        document.getElementById('bbs-btn').style.display = 'none';
    }else{
        document.getElementById('bbs-btn').style.display = 'flex';
    }
}

bbsOpenStatus();
bbsLoadCategories();
bbsLoadPosts(1);