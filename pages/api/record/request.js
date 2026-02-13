import prisma from '../../../lib/prisma';
import jwt from 'jsonwebtoken';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const token = req.cookies.auth_token;
  if (!token) return res.status(401).json({ message: '로그인이 필요합니다.' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const requester = decoded.name || decoded.naverId;

    const { original, modified } = req.body;

    // [수정] original이 비어있으면 신규 등록으로 간주
    const isNew = !original || Object.keys(original).length === 0;

    await prisma.recordRequest.create({
      data: {
        // 신규이면 modified(입력값)을 사용, 수정이면 original(기존값)을 사용해 식별
        raceName: isNew ? modified.rn : original.rn,
        year: isNew ? (modified.rd || modified.y || modified.year) : (original.rd || original.y || original.year),
        bib: isNew ? modified.b : original.b,
        name: isNew ? modified.n : original.n,
        
        // modified 객체 자체를 저장 (신규 플래그 _isNew 포함됨)
        updatedFields: JSON.stringify(modified),
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