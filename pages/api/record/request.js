import prisma from '../../../lib/prisma';
import jwt from 'jsonwebtoken';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  // 1. 네이버 로그인 검증 (쿠키의 auth_token 확인)
  const token = req.cookies.auth_token;
  if (!token) return res.status(401).json({ message: '로그인이 필요합니다.' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const requester = decoded.name || decoded.naverId;

    const { original, modified } = req.body;

    // 2. 수정 요청 데이터 DB 저장
    // original: 식별용, modified: 수정된 필드만 추출
    await prisma.recordRequest.create({
      data: {
        raceName: original.rn,
        year: original.y,
        bib: original.b,
        name: original.n,
        updatedFields: JSON.stringify(modified), // 수정된 내용만 JSON 문자열로 저장
        requester: requester,
        status: 'PENDING'
      }
    });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
}