import prisma from '../../../lib/prisma';
import jwt from 'jsonwebtoken';

export default async function handler(req, res) {
  try {
    // GET 요청: 목록 및 상세 조회
    if (req.method === 'GET') {
      // 1. 상세 조회 (기존 동일)
      if (req.query.id) {
        const post = await prisma.post.findUnique({
          where: { id: Number(req.query.id) },
        });
        return res.json(post);
      }

      // 2. 목록 조회 (targetPage 기준 필터링 추가)
      const targetPage = req.query.targetPage || 'common';
      const posts = await prisma.post.findMany({
        where: { targetPage: targetPage }, // 해당 페이지의 글만 가져오기
        take: 50,
        orderBy: { id: 'desc' },
        select: { id: true, title: true, author: true, createdAt: true }
      });
      
      const formattedPosts = posts.map(p => ({
        ...p,
        date: p.createdAt.toISOString().split('T')[0]
      }));

      return res.json(formattedPosts);
    }

    // POST 요청: 글쓰기
    if (req.method === 'POST') {
      const token = req.cookies.auth_token;
      if (!token) return res.status(401).json({ error: '로그인 필요' });

      const user = jwt.verify(token, process.env.JWT_SECRET);
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

      await prisma.post.create({
        data: {
          targetPage: body.targetPage || 'common', // 넘어온 페이지명 저장
          title: body.title,
          content: body.content,
          author: user.name,
        },
      });
      return res.status(200).json({ success: true });
    }
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
}