import prisma from '../../../lib/prisma';
import jwt from 'jsonwebtoken';

export default async function handler(req, res) {
  try {
    // GET: 목록 조회 (공지사항 + 페이지네이션)
    if (req.method === 'GET') {
      // 1. 상세 조회
      if (req.query.id) {
        const post = await prisma.post.findUnique({
          where: { id: Number(req.query.id) },
        });
        return res.json(post);
      }

      const targetPage = req.query.targetPage || 'common';
      const page = Number(req.query.page) || 1;
      const limit = 10;
      const skip = (page - 1) * limit;

      // 2. 공지사항 가져오기 (1페이지일 때만)
      let notices = [];
      if (page === 1) {
        notices = await prisma.post.findMany({
          where: {
            OR: [
              { noticeType: 0 }, // 전체 공지
              { noticeType: 1, targetPage: targetPage } // 현재 페이지 공지
            ]
          },
          orderBy: { noticeType: 'asc' }, // 전체공지(0) -> 페이지공지(1) 순
          include: { _count: { select: { comments: true } } } // 댓글 수 포함
        });
      }

      // 3. 일반 게시글 가져오기 (페이지네이션 적용)
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

      // 4. 일반 글 전체 개수 (페이지네이션 계산용)
      const totalPosts = await prisma.post.count({
        where: { targetPage: targetPage, noticeType: 2 }
      });

      // 데이터 포맷팅 함수
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

    // POST/PUT 공통: 권한 확인 및 noticeType 처리
    const token = req.cookies.auth_token;
    if (!token) return res.status(401).json({ error: '로그인 필요' });
    
    const user = jwt.verify(token, process.env.JWT_SECRET);
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

    // 관리자가 아니면 noticeType 강제로 2(일반) 설정
    let noticeType = 2;
    if (user.isAdmin) {
      noticeType = body.noticeType !== undefined ? parseInt(body.noticeType) : 2;
    }

    // POST: 글쓰기
    if (req.method === 'POST') {
      await prisma.post.create({
        data: {
          targetPage: body.targetPage || 'common',
          title: body.title,
          content: body.content,
          author: user.name,
          authorId: user.naverId,
          authorImage: user.profileImage,
          noticeType: noticeType, // ★ 공지 타입 저장
        },
      });
      return res.status(200).json({ success: true });
    }

    // PUT: 글 수정
    if (req.method === 'PUT') {
      const post = await prisma.post.findUnique({ where: { id: body.id } });
      // [수정됨] 본인이 아니고 && 관리자도 아니면 권한 없음
      if (post.authorId !== user.naverId && !user.isAdmin) {
        return res.status(403).json({ error: '권한 없음' });
      }

      await prisma.post.update({
        where: { id: body.id },
        data: { 
            title: body.title, 
            content: body.content,
            noticeType: noticeType // ★ 수정 시에도 공지 타입 반영
        }
      });
      return res.status(200).json({ success: true });
    }

    // DELETE: 삭제 (기존 동일)
    if (req.method === 'DELETE') {
        const postId = Number(req.query.id);
        const post = await prisma.post.findUnique({ where: { id: postId } });
        // [수정됨] 본인이 아니고 && 관리자도 아니면 권한 없음
        if (post.authorId !== user.naverId && !user.isAdmin) {
            return res.status(403).json({ error: '권한 없음' });
        }
        await prisma.post.delete({ where: { id: postId } });
        return res.status(200).json({ success: true });
    }

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}