import prisma from '../../../lib/prisma';
import jwt from 'jsonwebtoken';

export default async function handler(req, res) {
  try {
    // GET 요청: 목록 조회
    if (req.method === 'GET') {
      // 1. 상세 조회
      if (req.query.id) {
        const post = await prisma.post.findUnique({
          where: { id: Number(req.query.id) },
        });
        return res.json(post);
      }

      // 2. 목록 조회 (수정됨)
      const targetPage = req.query.targetPage || 'common';
      const posts = await prisma.post.findMany({
        where: { targetPage: targetPage },
        take: 50,
        orderBy: { id: 'desc' },
        select: { 
          id: true, 
          title: true, 
          author: true, 
          authorImage: true, // [추가] 이제 사진 정보도 가져옵니다!
          createdAt: true 
        }
      });
      
      const formattedPosts = posts.map(p => ({
        ...p,
        date: p.createdAt.toISOString().split('T')[0]
      }));

      return res.json(formattedPosts);
    }

    // POST 요청: 글쓰기 (수정됨)
    if (req.method === 'POST') {
      const token = req.cookies.auth_token;
      if (!token) return res.status(401).json({ error: '로그인 필요' });

      const user = jwt.verify(token, process.env.JWT_SECRET);
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

      await prisma.post.create({
        data: {
          targetPage: body.targetPage || 'common',
          title: body.title,
          content: body.content,
          author: user.name,
          authorImage: user.profileImage, // [추가] 글쓴이의 프사를 DB에 저장
        },
      });
      return res.status(200).json({ success: true });
    }
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
}