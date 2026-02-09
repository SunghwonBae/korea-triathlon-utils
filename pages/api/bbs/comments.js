import prisma from '../../../lib/prisma';
import jwt from 'jsonwebtoken';

export default async function handler(req, res) {
  const { postId } = req.query;

  try {
    // GET: 댓글 조회
    if (req.method === 'GET') {
      const comments = await prisma.comment.findMany({
        where: { postId: Number(postId) },
        orderBy: { id: 'asc' },
      });
      return res.json(comments);
    }

    // POST: 댓글 작성
    if (req.method === 'POST') {
      const token = req.cookies.auth_token;
      if (!token) return res.status(401).json({ error: '로그인 필요' });

      // 토큰에서 사용자 정보 꺼내기
      const user = jwt.verify(token, process.env.JWT_SECRET);
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

      await prisma.comment.create({
        data: {
          content: body.content,
          author: user.name,
          authorImage: user.profileImage, // [추가] 작성자 프사 저장
          postId: Number(postId),
        },
      });
      return res.status(200).json({ success: true });
    }
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}