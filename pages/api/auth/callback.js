import prisma from '../../../lib/prisma';
import jwt from 'jsonwebtoken';
import { serialize } from 'cookie';

export default async function handler(req, res) {
  const { code, state } = req.query;
  const client_id = process.env.NAVER_CLIENT_ID;
  const client_secret = process.env.NAVER_CLIENT_SECRET;
  
  try {
    // 1. 토큰 발급
    const tokenRes = await fetch(`https://nid.naver.com/oauth2.0/token?grant_type=authorization_code&client_id=${client_id}&client_secret=${client_secret}&code=${code}&state=${state}`).then(r => r.json());
    
    // 2. 프로필 조회
    const profileRes = await fetch('https://openapi.naver.com/v1/nid/me', {
      headers: { Authorization: `Bearer ${tokenRes.access_token}` }
    }).then(r => r.json());

    const naverUser = profileRes.response;
    
    // [데이터 매핑] 네이버 제공 데이터 -> 변수
    const uniqueId = naverUser.id; 
    const userName = naverUser.nickname || naverUser.name || '익명';
    const userImage = naverUser.profile_image || '';
    const userBirthyear = naverUser.birthyear || ''; 
    const userGender = naverUser.gender || '';
    const userMobile = naverUser.mobile || ''; // [추가] 010-0000-0000 형태

    // 3. DB 저장 (Upsert)
    // naverId가 있으면 업데이트, 없으면 새로 생성
    await prisma.user.upsert({
      where: { naverId: uniqueId },
      update: {
        lastLogin: new Date(),
        name: userName,
        profileImage: userImage,
        gender: userGender,
        birthyear: userBirthyear,
        mobile: userMobile // [반영] 최신 전화번호로 업데이트
      },
      create: {
        naverId: uniqueId,
        name: userName,
        profileImage: userImage,
        gender: userGender,
        birthyear: userBirthyear,
        mobile: userMobile, // [반영] 가입 시 전화번호 저장
        lastLogin: new Date(),
        createdAt: new Date()
      },
    });

    // 4. 토큰 및 쿠키 생성
    const jwtPayload = { 
        name: userName, 
        naverId: uniqueId,
        profileImage: userImage
        // mobile은 민감정보라 토큰/쿠키에는 담지 않는 것이 보안상 안전합니다.
    };
    const token = jwt.sign(jwtPayload, process.env.JWT_SECRET, { expiresIn: '1d' });

    // (1) 서버 인증용 쿠키 (HttpOnly)
    const authCookie = serialize('auth_token', token, { 
      path: '/', 
      httpOnly: true, 
      maxAge: 86400 
    });
    
    // (2) 화면 표시용 쿠키 (JS 접근 가능)
    const userInfo = JSON.stringify({ 
        name: userName, 
        image: userImage, 
        id: uniqueId 
    });

// ▼ [수정] encodeURIComponent(...)를 제거하고 userInfo 변수만 넣으세요!
    const userCookie = serialize('user_info', userInfo, { 
      path: '/', 
      httpOnly: false, 
      maxAge: 86400 
    });

    res.setHeader('Set-Cookie', [authCookie, userCookie]);

    // 5. 원래 페이지 리다이렉트
    const returnUrl = req.cookies['login_return_url'] || '/';
    res.redirect(returnUrl);
    
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).send(`로그인 처리 중 오류: ${error.message}`);
  }
}