import prisma from '../../../lib/prisma';
import jwt from 'jsonwebtoken';

export default async function handler(req, res) {
  const { postId } = req.query;

  try {
    if (req.method === 'GET') {
      const comments = await prisma.comment.findMany({
        where: { postId: Number(postId) },
        orderBy: { id: 'asc' },
      });
      return res.json(comments);
    }

    const token = req.cookies.auth_token;
    if (!token) return res.status(401).json({ error: '로그인 필요' });
    const user = jwt.verify(token, process.env.JWT_SECRET);
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

    // POST: 댓글 쓰기
    if (req.method === 'POST') {
      await prisma.comment.create({
        data: {
          content: body.content,
          author: user.name,
          authorId: user.naverId, // ★ ID 저장
          authorImage: user.profileImage,
          postId: Number(postId),
        },
      });
      return res.status(200).json({ success: true });
    }

    // PUT: 댓글 수정
    if (req.method === 'PUT') {
      const comment = await prisma.comment.findUnique({ where: { id: body.id } });
      if (comment.authorId !== user.naverId) return res.status(403).json({ error: '권한 없음' });

      await prisma.comment.update({
        where: { id: body.id },
        data: { content: body.content }
      });
      return res.status(200).json({ success: true });
    }

    // DELETE: 댓글 삭제
    if (req.method === 'DELETE') {
      const commentId = Number(req.query.id);
      const comment = await prisma.comment.findUnique({ where: { id: commentId } });
      if (comment.authorId !== user.naverId) return res.status(403).json({ error: '권한 없음' });

      await prisma.comment.delete({ where: { id: commentId } });
      return res.status(200).json({ success: true });
    }

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}