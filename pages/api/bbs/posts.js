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
      const page = Number(req.query.page) || 1;
      const limit = 10;
      const skip = (page - 1) * limit;

      // 공지사항 (1페이지일 때만)
      let notices = [];
      if (page === 1) {
        notices = await prisma.post.findMany({
          where: {
            OR: [
              { noticeType: 0 }, // 전체 공지
              { noticeType: 1, targetPage: targetPage } // 페이지 공지
            ]
          },
          orderBy: { noticeType: 'asc' },
          include: { _count: { select: { comments: true } } }
        });
      }

      // 일반 게시글
      const posts = await prisma.post.findMany({
        where: {
          targetPage: targetPage,
          noticeType: 2 // 일반 글만
        },
        take: limit,
        skip: skip,
        orderBy: { id: 'desc' },
        include: { _count: { select: { comments: true } } }
      });

      const totalPosts = await prisma.post.count({
        where: { targetPage: targetPage, noticeType: 2 }
      });

      const formatPost = (p) => ({
        ...p,
        date: p.createdAt.toISOString().split('T')[0],
        commentCount: p._count.comments
      });

      return res.json({
        notices: notices.map(formatPost),
        posts: posts.map(formatPost),
        totalPosts,
        currentPage: page,
        totalPages: Math.ceil(totalPosts / limit)
      });
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
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      
      // 관리자 공지 타입 결정
      let noticeType = 2;
      if (user.isAdmin) {
        noticeType = body.noticeType !== undefined ? parseInt(body.noticeType) : 2;
      }

      await prisma.post.create({
        data: {
          targetPage: body.targetPage || 'common',
          title: body.title,
          content: body.content,
          author: user.name,
          authorId: user.naverId,
          authorImage: user.profileImage,
          noticeType: noticeType,
        },
      });
      return res.status(200).json({ success: true });
    }

    // 3. PUT 요청: 글 수정
    if (req.method === 'PUT') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      
      const post = await prisma.post.findUnique({ where: { id: body.id } });
      if (!post) return res.status(404).json({ error: '글을 찾을 수 없습니다.' });

      // 권한 체크: 본인이거나 관리자(isAdmin)면 통과
      if (post.authorId !== user.naverId && !user.isAdmin) {
          return res.status(403).json({ error: '권한 없음' });
      }

      // 관리자 공지 타입 결정 (수정 시에도)
      let noticeType = post.noticeType; // 기본은 기존 값 유지
      if (user.isAdmin && body.noticeType !== undefined) {
        noticeType = parseInt(body.noticeType);
      }

      await prisma.post.update({
        where: { id: body.id },
        data: { 
            title: body.title, 
            content: body.content,
            noticeType: noticeType
        }
      });
      return res.status(200).json({ success: true });
    }

    // 4. DELETE 요청: 글 삭제
    if (req.method === 'DELETE') {
        // ★ 중요: DELETE는 Body 파싱을 하지 않습니다. (500 에러 해결)
        const postId = Number(req.query.id);
        const post = await prisma.post.findUnique({ where: { id: postId } });
        
        if (!post) return res.status(404).json({ error: '이미 삭제된 글입니다.' });
        
        // 권한 체크: 본인이거나 관리자(isAdmin)면 통과
        if (post.authorId !== user.naverId && !user.isAdmin) {
            return res.status(403).json({ error: '권한 없음' });
        }

        await prisma.post.delete({ where: { id: postId } });
        return res.status(200).json({ success: true });
    }

  } catch (e) {
    console.error("API Error:", e);
    return res.status(500).json({ error: e.message });
  }
}