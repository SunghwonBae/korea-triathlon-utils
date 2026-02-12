// c:\korea-triathlon-utils\pages\api\admin\menu.js
import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';

export default function handler(req, res) {
  try {
    // 1. 권한 체크 (로그인 여부 및 관리자 여부)
    const token = req.cookies.auth_token;
    if (!token) {
      return res.status(401).json({ error: '로그인이 필요합니다.' });
    }

    let user;
    try {
      user = jwt.verify(token, process.env.JWT_SECRET);
    } catch (e) {
      return res.status(401).json({ error: '유효하지 않은 토큰입니다.' });
    }

    if (!user.isAdmin) {
      return res.status(403).json({ error: '관리자 권한이 없습니다.' });
    }

    // 2. public 폴더 스캔
    const publicDir = path.join(process.cwd(), 'public/admin');
    const files = fs.readdirSync(publicDir);

    // 3. 'admin'이 포함된 .html 파일 필터링 (자기 자신 제외)
    const adminFiles = files.filter(file => 
      file.includes('admin') && 
      file.endsWith('.html') && 
      file !== 'admin_manager.html'
    );

    res.status(200).json({ files: adminFiles });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '파일 목록을 불러오는 중 오류가 발생했습니다.' });
  }
}
