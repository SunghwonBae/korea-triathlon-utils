import prisma from '../../../lib/prisma';
import jwt from 'jsonwebtoken';

export default async function handler(req, res) {
  try {
    // 1. GET 요청: 목록 및 상세 조회 (로그인 불필요)
    if (req.method === 'GET') {
      // (1) 상세 조회
      if (req.query.id) {
        const post = await prisma.post.findUnique({
          where: { id: Number(req.query.id) },
        });
        return res.json(post);
      }

      // (2) 목록 조회
      const targetPage = req.query.targetPage || 'common';
      const posts = await prisma.post.findMany({
        where: { targetPage: targetPage },
        take: 50,
        orderBy: { id: 'desc' },
        select: { 
          id: true, 
          title: true, 
          author: true, 
          authorId: true, 
          authorImage: true, 
          createdAt: true 
        }
      });
      
      const formattedPosts = posts.map(p => ({
        ...p,
        date: p.createdAt.toISOString().split('T')[0]
      }));

      return res.json(formattedPosts);
    }

    // --- 여기부터는 로그인 필요 (POST, PUT, DELETE) ---
    const token = req.cookies.auth_token;
    if (!token) return res.status(401).json({ error: '로그인 필요' });

    let user;
    try {
      user = jwt.verify(token, process.env.JWT_SECRET);
    } catch(e) {
      return res.status(401).json({ error: '유효하지 않은 토큰' });
    }

    // 2. POST 요청: 글쓰기
    if (req.method === 'POST') {
      // Body 파싱을 여기서 수행 (안전)
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

      await prisma.post.create({
        data: {
          targetPage: body.targetPage || 'common',
          title: body.title,
          content: body.content,
          author: user.name,
          authorId: user.naverId, // 본인확인용 ID 저장
          authorImage: user.profileImage,
        },
      });
      return res.status(200).json({ success: true });
    }

    // 3. PUT 요청: 글 수정
    if (req.method === 'PUT') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      
      // 글 존재 확인
      const post = await prisma.post.findUnique({ where: { id: body.id } });
      if (!post) return res.status(404).json({ error: '글을 찾을 수 없습니다.' });

      // 본인 확인
      if (post.authorId !== user.naverId) return res.status(403).json({ error: '권한이 없습니다.' });

      await prisma.post.update({
        where: { id: body.id },
        data: { title: body.title, content: body.content }
      });
      return res.status(200).json({ success: true });
    }

    // 4. DELETE 요청: 글 삭제
    if (req.method === 'DELETE') {
      // DELETE는 Body가 없으므로 query에서 ID 가져옴
      const postId = Number(req.query.id);

      // 글 존재 확인
      const post = await prisma.post.findUnique({ where: { id: postId } });
      if (!post) return res.status(404).json({ error: '이미 삭제된 글입니다.' });
      
      // 본인 확인
      if (post.authorId !== user.naverId) return res.status(403).json({ error: '권한이 없습니다.' });

      await prisma.post.delete({ where: { id: postId } });
      return res.status(200).json({ success: true });
    }

  } catch (e) {
    console.error("API Error:", e);
    return res.status(500).json({ error: e.message });
  }
}