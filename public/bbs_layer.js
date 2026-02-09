// bbs_layer.js

// 1. 현재 페이지 이름 추출 (예: 'ironman_calculator')
let bbsTargetPage = window.location.pathname.split('/').pop().replace('.html', '');
if (!bbsTargetPage || bbsTargetPage === '') bbsTargetPage = 'index';

// 2. 레이어 UI (HTML + CSS) 동적 삽입
const bbsHTML = `
<style>
    #bbs-btn { position: fixed; bottom: 30px; right: 30px; width: 60px; height: 60px; background: #03C75A; color: white; border-radius: 50%; font-size: 28px; border: none; cursor: pointer; z-index: 999; box-shadow: 0 4px 10px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; transition: transform 0.2s; }
    #bbs-btn:hover { transform: scale(1.1); }
    #bbs-overlay-bg { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.5); z-index: 1000; display: none; }
    #bbs-layer { position: fixed; top: 0; right: -420px; width: 400px; max-width: 100vw; height: 100vh; background: #fff; z-index: 1001; transition: right 0.3s cubic-bezier(0.4, 0, 0.2, 1); box-shadow: -4px 0 15px rgba(0,0,0,0.1); display: flex; flex-direction: column; font-family: sans-serif; }
    #bbs-layer.open { right: 0; }
    .bbs-header { padding: 15px 20px; background: #f8f9fa; border-bottom: 1px solid #ddd; display: flex; justify-content: space-between; align-items: center; }
    .bbs-header h3 { margin: 0; font-size: 1.1rem; color: #333; }
    .bbs-close-btn { background: none; border: none; font-size: 24px; cursor: pointer; color: #888; }
    .bbs-content-wrap { flex: 1; overflow-y: auto; padding: 20px; }
    
    /* 요소 디자인 */
    .bbs-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
    .bbs-table th, .bbs-table td { padding: 10px 5px; border-bottom: 1px solid #eee; text-align: left; }
    .bbs-table a { color: #333; text-decoration: none; cursor: pointer; }
    .bbs-table a:hover { text-decoration: underline; color: #03C75A; }
    .bbs-btn-basic { padding: 8px 12px; border: none; border-radius: 4px; cursor: pointer; background: #333; color: white; }
    .bbs-btn-login { background: #03C75A; color: white; text-decoration: none; padding: 8px 12px; border-radius: 4px; font-size: 0.9rem; display: inline-block;}
    .bbs-input, .bbs-textarea { width: 100%; padding: 10px; margin-bottom: 10px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; }
    .bbs-textarea { height: 150px; resize: none; }
    .bbs-comment-item { border-bottom: 1px solid #f0f0f0; padding: 10px 0; font-size: 0.9rem; }
    .bbs-meta { font-size: 0.8rem; color: #888; margin-bottom: 15px; border-bottom: 1px solid #eee; padding-bottom: 10px;}
</style>

<button id="bbs-btn" onclick="bbsToggleLayer()">💬</button>
<div id="bbs-overlay-bg" onclick="bbsToggleLayer()"></div>
<div id="bbs-layer">
    <div class="bbs-header">
        <h3 id="bbs-top-title">의견 나누기</h3>
        <button class="bbs-close-btn" onclick="bbsToggleLayer()">✖</button>
    </div>
    
    <div class="bbs-content-wrap" id="bbs-view-list">
        <div style="display:flex; justify-content:space-between; margin-bottom: 15px;">
            <a href="/api/auth/login" class="bbs-btn-login">N 로그인</a>
            <button class="bbs-btn-basic" onclick="bbsChangeView('write')">글쓰기</button>
        </div>
        <table class="bbs-table">
            <thead><tr><th>제목</th><th width="60">작성자</th></tr></thead>
            <tbody id="bbs-list-tbody"></tbody>
        </table>
    </div>

    <div class="bbs-content-wrap" id="bbs-view-write" style="display:none;">
        <button class="bbs-btn-basic" style="background:#888; margin-bottom:15px;" onclick="bbsChangeView('list')">◀ 목록으로</button>
        <input type="text" id="bbs-write-title" class="bbs-input" placeholder="제목을 입력하세요">
        <textarea id="bbs-write-content" class="bbs-textarea" placeholder="내용을 입력하세요"></textarea>
        <button class="bbs-btn-basic" style="width:100%; background:#03C75A;" onclick="bbsSavePost()">등록하기</button>
    </div>

    <div class="bbs-content-wrap" id="bbs-view-detail" style="display:none;">
        <button class="bbs-btn-basic" style="background:#888; margin-bottom:15px;" onclick="bbsChangeView('list')">◀ 목록으로</button>
        <h3 id="bbs-detail-title" style="margin-top:0;"></h3>
        <div class="bbs-meta">작성자: <span id="bbs-detail-author"></span></div>
        <div id="bbs-detail-content" style="white-space: pre-wrap; font-size:0.95rem; line-height:1.5;"></div>
        
        <h4 style="margin-top:30px; border-top:2px solid #eee; padding-top:15px;">💬 댓글</h4>
        <div id="bbs-comment-list"></div>
        <div style="display:flex; gap:5px; margin-top:10px;">
            <input type="text" id="bbs-cmt-input" class="bbs-input" style="margin:0;" placeholder="댓글 입력">
            <button class="bbs-btn-basic" onclick="bbsSaveComment()">등록</button>
        </div>
    </div>
</div>
`;
document.body.insertAdjacentHTML('beforeend', bbsHTML);

// 3. 상태 제어 변수
let bbsCurrentPostId = null;

// 4. 왼쪽 메뉴 열릴 때 BBS 레이어 자동 닫기 (메뉴 충돌 방지)
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

// 5. 기능 함수들
function bbsToggleLayer() {
    const layer = document.getElementById('bbs-layer');
    const overlay = document.getElementById('bbs-overlay-bg');
    const isOpen = layer.classList.contains('open');
    
    if (isOpen) {
        layer.classList.remove('open');
        overlay.classList.remove('show');
    } else {
        layer.classList.add('open');
        overlay.classList.add('show');
        bbsChangeView('list'); // 열 때마다 기본 목록 보여주기
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
    tbody.innerHTML = posts.map(p => `
        <tr>
            <td><a onclick="bbsLoadDetail(${p.id})">${p.title}</a></td>
            <td>${p.author}</td>
        </tr>
    `).join('');
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
    document.getElementById('bbs-comment-list').innerHTML = cmts.map(c => `
        <div class="bbs-comment-item"><strong>${c.author}</strong>: ${c.content}</div>
    `).join('');
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
    }
}