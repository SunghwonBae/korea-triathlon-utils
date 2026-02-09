import prisma from '../../../lib/prisma';
import jwt from 'jsonwebtoken';

export default async function handler(req, res) {
  try {
    // GET: 목록 및 상세 조회
    if (req.method === 'GET') {
      if (req.query.id) {
        const post = await prisma.post.findUnique({
          where: { id: Number(req.query.id) },
        });
        return res.json(post);
      }
      const targetPage = req.query.targetPage || 'common';
      const posts = await prisma.post.findMany({
        where: { targetPage: targetPage },
        take: 50,
        orderBy: { id: 'desc' },
        // select에 authorId 추가
        select: { id: true, title: true, author: true, authorId: true, authorImage: true, createdAt: true }
      });
      return res.json(posts.map(p => ({
        ...p,
        date: p.createdAt.toISOString().split('T')[0]
      })));
    }

    // 토큰 확인 (POST, PUT, DELETE 공통)
    const token = req.cookies.auth_token;
    if (!token) return res.status(401).json({ error: '로그인 필요' });
    const user = jwt.verify(token, process.env.JWT_SECRET);
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

    // POST: 글쓰기
    if (req.method === 'POST') {
      await prisma.post.create({
        data: {
          targetPage: body.targetPage || 'common',
          title: body.title,
          content: body.content,
          author: user.name,
          authorId: user.naverId, // ★ ID 저장
          authorImage: user.profileImage,
        },
      });
      return res.status(200).json({ success: true });
    }

    // PUT: 글 수정
    if (req.method === 'PUT') {
      // 본인 확인: DB에 있는 글의 authorId와 현재 로그인한 user.naverId 비교
      const post = await prisma.post.findUnique({ where: { id: body.id } });
      if (post.authorId !== user.naverId) return res.status(403).json({ error: '권한이 없습니다.' });

      await prisma.post.update({
        where: { id: body.id },
        data: { title: body.title, content: body.content }
      });
      return res.status(200).json({ success: true });
    }

    // DELETE: 글 삭제
    if (req.method === 'DELETE') {
      const postId = Number(req.query.id);
      const post = await prisma.post.findUnique({ where: { id: postId } });
      
      // 관리자이거나 본인이면 삭제 허용 (여기선 본인만 체크)
      if (post.authorId !== user.naverId) return res.status(403).json({ error: '권한이 없습니다.' });

      await prisma.post.delete({ where: { id: postId } });
      return res.status(200).json({ success: true });
    }

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}