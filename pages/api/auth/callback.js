import jwt from 'jsonwebtoken';
import { serialize } from 'cookie';

export default async function handler(req, res) {
  const { code, state } = req.query;
  const client_id = process.env.NAVER_CLIENT_ID;
  const client_secret = process.env.NAVER_CLIENT_SECRET;
  
  try {
    const tokenRes = await fetch(`https://nid.naver.com/oauth2.0/token?grant_type=authorization_code&client_id=${client_id}&client_secret=${client_secret}&code=${code}&state=${state}`).then(r => r.json());
    
    const profileRes = await fetch('https://openapi.naver.com/v1/nid/me', {
      headers: { Authorization: `Bearer ${tokenRes.access_token}` }
    }).then(r => r.json());

    const user = { name: profileRes.response.nickname || '익명' };
    const token = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: '1d' });

    res.setHeader('Set-Cookie', serialize('auth_token', token, { path: '/', httpOnly: true, maxAge: 86400 }));
    res.redirect('/bbs/list.html'); // 로그인 후 게시판 목록으로 이동
    
  } catch (error) {
    res.status(500).send('로그인 실패: ' + error.message);
  }
}