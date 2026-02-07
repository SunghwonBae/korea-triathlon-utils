import prisma from '../../../lib/prisma'; // 방금 만든 파일 불러오기
import jwt from 'jsonwebtoken';

export default async function handler(req, res) {
  try {
    // GET 요청
    if (req.method === 'GET') {
      // 1. 상세 조회
      if (req.query.id) {
        const post = await prisma.post.findUnique({
          where: { id: Number(req.query.id) },
        });
        return res.json(post);
      }

      // 2. 목록 조회
      const posts = await prisma.post.findMany({
        take: 50,
        orderBy: { id: 'desc' },
        select: {
          id: true,
          title: true,
          author: true,
          createdAt: true, // 프론트에서 날짜 포맷팅 필요할 수 있음
        }
      });
      
      // 날짜 포맷팅해서 보내기 (YYYY-MM-DD)
      const formattedPosts = posts.map(p => ({
        ...p,
        date: p.createdAt.toISOString().split('T')[0]
      }));

      return res.json(formattedPosts);
    }

    // POST 요청 (글쓰기)
    if (req.method === 'POST') {
      const token = req.cookies.auth_token;
      if (!token) return res.status(401).json({ error: '로그인 필요' });

      const user = jwt.verify(token, process.env.JWT_SECRET);
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

      await prisma.post.create({
        data: {
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