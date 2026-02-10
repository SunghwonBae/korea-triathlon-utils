import prisma from '../../../lib/prisma';
import jwt from 'jsonwebtoken';

export default async function handler(req, res) {
  try {
    // 1. GET 요청: 목록 및 상세 조회
    if (req.method === 'GET') {
      // (1) 상세 조회 (기존 동일)
      if (req.query.id) {
        const post = await prisma.post.findUnique({
          where: { id: Number(req.query.id) },
        });
        return res.json(post);
      }

      // (2) 목록 조회 (★ 로직 수정됨)
      const targetPage = req.query.targetPage || 'common';
      const page = Number(req.query.page) || 1;
      const limit = 10; // 페이지당 표시할 총 게시물 수

      // [단계 1] 공지사항 먼저 조회 (개수 파악을 위해 항상 필요)
      const notices = await prisma.post.findMany({
        where: {
          OR: [
            { noticeType: 0 }, // 전체 공지
            { noticeType: 1, targetPage: targetPage } // 페이지 공지
          ]
        },
        orderBy: { noticeType: 'asc' }, // 전체공지(0) -> 페이지공지(1)
        include: { _count: { select: { comments: true } } }
      });
      
      const noticeCount = notices.length;

      // [단계 2] 일반 게시글 가져올 개수(take)와 건너뛸 개수(skip) 계산
      let skip = 0;
      let take = limit;

      if (page === 1) {
        // 1페이지: 공지사항 개수만큼 빼고 조회 (최소 0개)
        // 예: 공지 3개 -> 일반글 7개 (총 10개)
        // 예: 공지 12개 -> 일반글 0개 (총 12개 - 공지는 잘리지 않고 다 보여줌)
        take = Math.max(0, limit - noticeCount);
        skip = 0;
      } else {
        // 2페이지 이상: 
        // 1페이지에서 보여줬어야 할 일반글 개수 (limit - noticeCount) 만큼 건너뜀
        const normalPostsOnPage1 = Math.max(0, limit - noticeCount);
        
        // 수식: (1페이지에서 보여준 일반글) + (이전 페이지들 * limit)
        skip = normalPostsOnPage1 + (page - 2) * limit;
        take = limit;
      }

      // [단계 3] 일반 게시글 조회
      const posts = await prisma.post.findMany({
        where: {
          targetPage: targetPage,
          noticeType: 2 // 일반 글만
        },
        take: take,
        skip: skip,
        orderBy: { id: 'desc' },
        include: { _count: { select: { comments: true } } }
      });

      // [단계 4] 총 페이지 수 계산 (공지사항 영향 반영)
      const totalNormalPosts = await prisma.post.count({
        where: { targetPage: targetPage, noticeType: 2 }
      });

      // 1페이지에 들어갈 수 있는 일반글 수
      const firstPageCapacity = Math.max(0, limit - noticeCount);
      
      // 1페이지를 제외한 나머지 일반글 수
      const remainingPosts = Math.max(0, totalNormalPosts - firstPageCapacity);
      
      // 총 페이지 = 1페이지 + 나머지 글을 limit로 나눈 페이지 수
      // (글이 하나도 없으면 0페이지가 아니라 1페이지가 되어야 하므로 로직 보정)
      let totalPages = 1;
      if (remainingPosts > 0) {
        totalPages = 1 + Math.ceil(remainingPosts / limit);
      }
      if (noticeCount === 0 && totalNormalPosts === 0) totalPages = 0; // 글이 아예 없으면 0


      // [단계 5] 데이터 포맷팅
      const formatPost = (p) => ({
        ...p,
        date: p.createdAt.toISOString().split('T')[0],
        commentCount: p._count.comments
      });

      return res.json({
        // 1페이지일 때만 공지사항을 배열에 담아서 보냄
        notices: (page === 1 ? notices.map(formatPost) : []),
        posts: posts.map(formatPost),
        totalPosts: totalNormalPosts + noticeCount,
        currentPage: page,
        totalPages: totalPages
      });
    }

    // --- 로그인 필요 (POST, PUT, DELETE) - 기존과 동일 ---
    const token = req.cookies.auth_token;
    if (!token) return res.status(401).json({ error: '로그인 필요' });
    
    let user;
    try {
      user = jwt.verify(token, process.env.JWT_SECRET);
    } catch(e) {
      return res.status(401).json({ error: '유효하지 않은 토큰' });
    }

    // POST: 글쓰기
    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
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

    // PUT: 글 수정
    if (req.method === 'PUT') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const post = await prisma.post.findUnique({ where: { id: body.id } });
      if (!post) return res.status(404).json({ error: '글 없음' });

      if (post.authorId !== user.naverId && !user.isAdmin) {
          return res.status(403).json({ error: '권한 없음' });
      }

      let noticeType = post.noticeType;
      if (user.isAdmin && body.noticeType !== undefined) {
        noticeType = parseInt(body.noticeType);
      }

      await prisma.post.update({
        where: { id: body.id },
        data: { title: body.title, content: body.content, noticeType: noticeType }
      });
      return res.status(200).json({ success: true });
    }

    // DELETE: 글 삭제
    if (req.method === 'DELETE') {
        const postId = Number(req.query.id);
        const post = await prisma.post.findUnique({ where: { id: postId } });
        if (!post) return res.status(404).json({ error: '글 없음' });
        
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