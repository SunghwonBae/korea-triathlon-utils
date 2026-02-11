export default function handler(req, res) {
  const client_id = process.env.NAVER_CLIENT_ID;
  
  // [수정] 없는 변수 대신, BASE_URL을 사용하여 정확한 콜백 주소 생성
  const callback_path = '/api/auth/callback';
  const redirect_uri = (process.env.BASE_URL || '') + callback_path;
  
  const state = Math.random().toString(36).substring(7);

  // 네이버 로그인 인증 URL 조립
  const api_url = 'https://nid.naver.com/oauth2.0/authorize?response_type=code'
      + '&client_id=' + client_id
      + '&redirect_uri=' + encodeURI(redirect_uri)
      + '&state=' + state;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>네이버 로그인</title>
      <style>
        body { margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; height: 100vh; background-color: #fff; font-family: sans-serif; }
        .container { text-align: center; }
        .spinner { width: 50px; height: 50px; border: 5px solid #f3f3f3; border-top: 5px solid #03C75A; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 20px auto; }
        .message { color: #333; font-size: 16px; font-weight: bold; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="spinner"></div>
        <div class="message">네이버 로그인 페이지로 이동 중...</div>
      </div>
      <script>
        setTimeout(function() {
            window.location.href = "${api_url}";
        }, 100);
      </script>
    </body>
    </html>
  `);
}