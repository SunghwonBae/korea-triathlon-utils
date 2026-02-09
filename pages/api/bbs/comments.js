import prisma from '../../../lib/prisma';
import jwt from 'jsonwebtoken';

export default async function handler(req, res) {
  const { postId } = req.query;

  try {
    // 1. GET 요청 (댓글 목록 조회) - 로그인 불필요
    if (req.method === 'GET') {
      const comments = await prisma.comment.findMany({
        where: { postId: Number(postId) },
        orderBy: { id: 'asc' },
      });
      return res.json(comments);
    }

    // --- 여기부터는 로그인 필요 (POST, PUT, DELETE) ---
    const token = req.cookies.auth_token;
    if (!token) return res.status(401).json({ error: '로그인 필요' });

    // 토큰 검증
    let user;
    try {
      user = jwt.verify(token, process.env.JWT_SECRET);
    } catch (e) {
      return res.status(401).json({ error: '유효하지 않은 토큰' });
    }

    // 2. POST 요청 (댓글 작성)
    if (req.method === 'POST') {
      // Body 파싱은 POST일 때만 수행 (DELETE에서 에러 방지)
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

      await prisma.comment.create({
        data: {
          content: body.content,
          author: user.name,
          authorId: user.naverId,
          authorImage: user.profileImage,
          postId: Number(postId),
        },
      });
      return res.status(200).json({ success: true });
    }

    // 3. PUT 요청 (댓글 수정)
    if (req.method === 'PUT') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      
      // 댓글 존재 확인
      const comment = await prisma.comment.findUnique({ where: { id: body.id } });
      if (!comment) return res.status(404).json({ error: '댓글을 찾을 수 없습니다.' });

      // 권한 확인
      if (comment.authorId !== user.naverId) return res.status(403).json({ error: '권한 없음' });

      await prisma.comment.update({
        where: { id: body.id },
        data: { content: body.content }
      });
      return res.status(200).json({ success: true });
    }

    // 4. DELETE 요청 (댓글 삭제)
    if (req.method === 'DELETE') {
      // DELETE는 Body가 없으므로 req.query에서 id를 가져옴
      const commentId = Number(req.query.id);

      // 댓글이 진짜 있는지 먼저 확인 (없으면 에러 나니까)
      const comment = await prisma.comment.findUnique({ where: { id: commentId } });
      if (!comment) return res.status(404).json({ error: '이미 삭제된 댓글입니다.' });

      // 본인 확인
      if (comment.authorId !== user.naverId) return res.status(403).json({ error: '권한 없음' });

      await prisma.comment.delete({ where: { id: commentId } });
      return res.status(200).json({ success: true });
    }

  } catch (e) {
    console.error("API Error:", e);
    return res.status(500).json({ error: e.message });
  }
}