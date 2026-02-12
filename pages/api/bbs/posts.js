// pages/api/bbs/posts.js

import prisma from '../../../lib/prisma';
import jwt from 'jsonwebtoken';

export default async function handler(req, res) {
  try {
    // 1. GET 요청
    if (req.method === 'GET') {
      
      // [카테고리 목록 조회]
      if (req.query.type === 'categories') {
        const categories = await prisma.post.findMany({
          distinct: ['targetPage'],
          select: { targetPage: true },
          where: { targetPage: { not: 'common' } }
        });
        return res.json(categories.map(c => c.targetPage));
      }

      // ★ [수정됨] 상세 조회 (날짜 포맷팅 추가)
      if (req.query.id) {
        const post = await prisma.post.findUnique({
          where: { id: Number(req.query.id) },
        });

        if (!post) return res.status(404).json({ error: '글 없음' });

        // 상세 조회 시에도 날짜 포맷을 만들어서 보내줍니다.
        const dateObj = new Date(post.createdAt);
        const yyyy = dateObj.getFullYear();
        const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
        const dd = String(dateObj.getDate()).padStart(2, '0');
        const hour = String(dateObj.getHours()).padStart(2, '0');
        const min = String(dateObj.getMinutes()).padStart(2, '0');
        const dateStr = `${yyyy}-${mm}-${dd} ${hour}:${min}`;

        // DB 객체에 date, author 필드를 명시적으로 합쳐서 리턴
        return res.json({ 
            ...post, 
            author: post.authorName || '익명', // 이름 마스킹 없음
            date: dateStr 
        });
      }

      // [목록 조회]
      let targetPage = req.query.targetPage || 'common';
      const page = Number(req.query.page) || 1;
      const limit = 10;
      const skip = (page - 1) * limit;

      let whereClause = {};
      let noticeWhere = {};
      
      if (targetPage === 'ALL') {
          // 관리자(전체) 모드
          whereClause = { noticeType: { in: [1, 2] } }; 
          noticeWhere = { noticeType: 0 }; 
      } else {
          // 일반 모드
          whereClause = { targetPage: targetPage, noticeType: 2 };
          noticeWhere = {
            OR: [
              { noticeType: 0 },
              { noticeType: 1, targetPage: targetPage }
            ]
          };
      }

      // 1. 공지사항 조회
      const notices = await prisma.post.findMany({
        where: noticeWhere,
        orderBy: { id: 'desc' },
        include: { _count: { select: { comments: true } } }
      });
      
      // 2. 일반 게시글 조회
      const totalPosts = await prisma.post.count({ where: whereClause });
      const posts = await prisma.post.findMany({
        where: whereClause,
        orderBy: { id: 'desc' },
        skip: skip,
        take: limit,
        include: { _count: { select: { comments: true } } }
      });

      const totalPages = Math.ceil(totalPosts / limit);

      // 데이터 가공 함수
      const processPosts = (list) => list.map(post => {
        const displayName = post.authorName || '익명'; // 마스킹 없음
        
        const dateObj = new Date(post.createdAt);
        const yyyy = dateObj.getFullYear();
        const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
        const dd = String(dateObj.getDate()).padStart(2, '0');
        const hour = String(dateObj.getHours()).padStart(2, '0');
        const min = String(dateObj.getMinutes()).padStart(2, '0');
        const dateStr = `${yyyy}-${mm}-${dd} ${hour}:${min}`;

        return {
            id: post.id,
            title: post.title,
            author: displayName,
            authorId: post.authorId,
            authorImage: post.authorImage,
            date: dateStr,
            commentCount: post._count.comments,
            noticeType: post.noticeType,
            targetPage: post.targetPage
        };
      });

      return res.json({
        posts: processPosts(posts),
        notices: processPosts(notices),
        totalPages: totalPages,
        currentPage: page
      });
    }

    // --- (POST, PUT, DELETE 기존 유지) ---
    const token = req.cookies.auth_token;
    if (!token) return res.status(401).json({ error: '로그인 필요' });
    
    let user;
    try {
        user = jwt.verify(token, process.env.JWT_SECRET);
    } catch(e) {
        return res.status(401).json({ error: '토큰 만료' });
    }

    if (req.method === 'POST') {
        const body = req.body;
        let nType = 2;
        if (user.isAdmin && body.noticeType !== undefined) nType = parseInt(body.noticeType);

        await prisma.post.create({
            data: {
                title: body.title,
                content: body.content,
                targetPage: body.targetPage,
                authorId: user.naverId,
                authorName: user.name,
                authorImage: user.profileImage,
                noticeType: nType
            }
        });
        return res.status(200).json({ success: true });
    }

    if (req.method === 'PUT') {
        const body = req.body;
        const post = await prisma.post.findUnique({ where: { id: body.id } });
        if (!post) return res.status(404).json({ error: '글 없음' });
        if (post.authorId !== user.naverId && !user.isAdmin) return res.status(403).json({ error: '권한 없음' });

        let nType = post.noticeType;
        if (user.isAdmin && body.noticeType !== undefined) nType = parseInt(body.noticeType);

        await prisma.post.update({
            where: { id: body.id },
            data: { title: body.title, content: body.content, noticeType: nType }
        });
        return res.status(200).json({ success: true });
    }

    if (req.method === 'DELETE') {
        const postId = Number(req.query.id);
        const post = await prisma.post.findUnique({ where: { id: postId } });
        if (!post) return res.status(404).json({ error: '글 없음' });
        if (post.authorId !== user.naverId && !user.isAdmin) return res.status(403).json({ error: '권한 없음' });

        await prisma.post.delete({ where: { id: postId } });
        return res.status(200).json({ success: true });
    }

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '서버 오류' });
  }
}