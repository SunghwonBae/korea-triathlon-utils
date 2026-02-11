// pages/api/auth/login.js

export default function handler(req, res) {
  // 1. 네이버 로그인 URL 생성에 필요한 정보
  const client_id = process.env.NAVER_CLIENT_ID;
  const redirect_uri = process.env.NAVER_REDIRECT_URI; // .env에 설정된 콜백 주소
  const state = Math.random().toString(36).substring(7); // CSRF 방지용 랜덤 문자열

  // 네이버 로그인 인증 URL 조립
  const api_url = 'https://nid.naver.com/oauth2.0/authorize?response_type=code'
      + '&client_id=' + client_id
      + '&redirect_uri=' + encodeURI(redirect_uri)
      + '&state=' + state;

  // 2. [핵심] 바로 리다이렉트 하지 않고, 안내 화면(HTML)을 먼저 보여줍니다.
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>네이버 로그인</title>
      <style>
        body {
          margin: 0;
          padding: 0;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          background-color: #ffffff;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        }
        .container {
          text-align: center;
        }
        .spinner {
          width: 50px;
          height: 50px;
          border: 5px solid #f3f3f3;
          border-top: 5px solid #03C75A; /* 네이버 그린 */
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 20px auto;
        }
        .message {
          color: #333;
          font-size: 16px;
          font-weight: 500;
        }
        .sub-message {
          color: #888;
          font-size: 13px;
          margin-top: 8px;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="spinner"></div>
        <div class="message">네이버 로그인 페이지로 이동 중...</div>
        <div class="sub-message">잠시만 기다려주세요.</div>
      </div>

      <script>
        // 화면이 렌더링되자마자 네이버로 이동
        setTimeout(function() {
            window.location.href = "${api_url}";
        }, 100); // 아주 짧은 딜레이를 주어 UI가 보일 틈을 줍니다.
      </script>
    </body>
    </html>
  `);
}