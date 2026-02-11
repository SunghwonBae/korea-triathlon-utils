import prisma from '../../../lib/prisma';
import jwt from 'jsonwebtoken';
import { serialize } from 'cookie';

export default async function handler(req, res) {
  const { code, state } = req.query;
  const client_id = process.env.NAVER_CLIENT_ID;
  const client_secret = process.env.NAVER_CLIENT_SECRET;
  
  try {
    // 1. 네이버 토큰 발급
    const tokenRes = await fetch(`https://nid.naver.com/oauth2.0/token?grant_type=authorization_code&client_id=${client_id}&client_secret=${client_secret}&code=${code}&state=${state}`).then(r => r.json());
    
    // 2. 네이버 프로필 조회
    const profileRes = await fetch('https://openapi.naver.com/v1/nid/me', {
      headers: { Authorization: `Bearer ${tokenRes.access_token}` }
    }).then(r => r.json());

    const naverUser = profileRes.response;
    const uniqueId = naverUser.id; 
    const userName = naverUser.nickname || naverUser.name || '익명';
    const userImage = naverUser.profile_image || '';

    // 관리자 확인
    const adminList = (process.env.ADMIN_NAVER_ID || '').split(',');
    const isAdmin = adminList.includes(uniqueId);

    // 3. DB 저장 (Upsert)
    await prisma.user.upsert({
      where: { naverId: uniqueId },
      update: {
        lastLogin: new Date(),
        name: userName,
        profileImage: userImage,
        mobile: naverUser.mobile || '',
        gender: naverUser.gender || '',
        birthyear: naverUser.birthyear || ''
      },
      create: {
        naverId: uniqueId,
        name: userName,
        profileImage: userImage,
        mobile: naverUser.mobile || '',
        gender: naverUser.gender || '',
        birthyear: naverUser.birthyear || '',
        lastLogin: new Date(),
        createdAt: new Date()
      },
    });

    // 4. 쿠키 생성
    const userInfo = JSON.stringify({ 
        name: userName, 
        image: userImage, 
        id: uniqueId,
        isAdmin: isAdmin 
    });

    const tokenPayload = { 
        name: userName, 
        naverId: uniqueId, 
        isAdmin: isAdmin 
    };
    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '1d' });

    const authCookie = serialize('auth_token', token, { path: '/', httpOnly: true, maxAge: 86400 });
    const userCookie = serialize('user_info', userInfo, { path: '/', httpOnly: false, maxAge: 86400 });

    res.setHeader('Set-Cookie', [authCookie, userCookie]);

    // ★ [핵심 변경] 리다이렉트 대신 팝업 종료 스크립트 전송
    // 부모 창(opener)에게 "로그인 성공했어!"라고 알리고 창을 닫습니다.
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(`
      <script>
        if (window.opener) {
            // 부모 창에게 메시지 전송
            window.opener.postMessage({ type: 'NAVER_LOGIN_SUCCESS' }, '*');
        }
        window.close();
      </script>
    `);
    
  } catch (error) {
    console.error(error);
    res.status(500).send(`로그인 오류: ${error.message}`);
  }
}