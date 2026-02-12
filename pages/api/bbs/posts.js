// pages/api/bbs/posts.js

import prisma from '../../../lib/prisma';
import jwt from 'jsonwebtoken';

export default async function handler(req, res) {
  try {
    // 1. GET 요청
    if (req.method === 'GET') {
      
      // [카테고리 목록 조회] 관리자 페이지용
      if (req.query.type === 'categories') {
        const categories = await prisma.post.findMany({
          distinct: ['targetPage'],
          select: { targetPage: true },
          where: { targetPage: { not: 'common' } }
        });
        return res.json(categories.map(c => c.targetPage));
      }

      // [상세 조회]
      if (req.query.id) {
        const post = await prisma.post.findUnique({
          where: { id: Number(req.query.id) },
        });
        return res.json(post);
      }

      // [목록 조회]
      let targetPage = req.query.targetPage || 'common';
      const page = Number(req.query.page) || 1;
      const limit = 10;
      const skip = (page - 1) * limit;

      let whereClause = {};
      let noticeWhere = {};
      
      if (targetPage === 'ALL') {
          // ★ [수정됨] 전체 모드 (관리자용)
          // 리스트: '페이지 공지(1)'와 '일반글(2)'을 모두 포함하여 조회
          whereClause = { 
              noticeType: { in: [1, 2] } 
          }; 
          
          // 상단 고정: '전체 공지(0)'만 고정 (너무 많이 고정되는 것 방지)
          noticeWhere = { noticeType: 0 }; 

      } else {
          // ★ 일반 모드 (특정 페이지)
          // 리스트: 해당 페이지의 '일반글(2)'만 조회
          whereClause = { 
              targetPage: targetPage,
              noticeType: 2 
          };

          // 상단 고정: '전체 공지(0)' + '이 페이지 공지(1)'
          noticeWhere = {
            OR: [
              { noticeType: 0 },
              { noticeType: 1, targetPage: targetPage }
            ]
          };
      }

      // 1. 공지사항 조회 (Pinned)
      const notices = await prisma.post.findMany({
        where: noticeWhere,
        orderBy: { id: 'desc' }, // 공지 내에서도 최신순
        include: { _count: { select: { comments: true } } }
      });
      
      // 2. 일반 게시글 조회 (List)
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
        let displayName = post.authorName || '익명';
        if (displayName.length > 2) {
            displayName = displayName[0] + '*'.repeat(displayName.length - 2) + displayName[displayName.length - 1];
        } else if (displayName.length === 2) {
            displayName = displayName[0] + '*';
        }
        
        const dateObj = new Date(post.createdAt);
        const dateStr = `${dateObj.getFullYear()}-${String(dateObj.getMonth()+1).padStart(2,'0')}-${String(dateObj.getDate()).padStart(2,'0')}`;

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

    // --- (이하 POST, PUT, DELETE는 기존 로직 유지) ---
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