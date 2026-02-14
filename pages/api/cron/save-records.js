// pages/api/cron/save-records.js
import { PrismaClient } from '@prisma/client';
import { Octokit } from "@octokit/rest"; // npm install @octokit/rest 필요

const prisma = new PrismaClient();

export default async function handler(req, res) {

  // --- [디버깅용 로그 추가] ---
  console.log("=== CRON AUTH DEBUG ===");
  console.log("1. Header Auth:", req.headers.authorization); // Vercel이 보낸 값
  console.log("2. Env Secret:", process.env.CRON_SECRET);      // 내 서버에 설정된 값
  console.log("3. Manual Key:", req.query.key);                // 수동 실행 키
  console.log("=======================");
  // -------------------------
// 1. Vercel Cron 자동 실행 (CRON_SECRET)
  //const isVercelCron = req.headers.get('authorization') === `Bearer ${process.env.CRON_SECRET}`; // Next.js 13 이상에서는 req.headers.get() 사용
  const isVercelCron = req.headers.authorization === `Bearer ${process.env.CRON_SECRET}`;
  
  // 2. 관리자 수동 실행 (MANUAL_CRON_KEY) -> 님이 정한 비번
  const isManualRun = req.query.key === process.env.MANUAL_CRON_KEY;

  // 둘 다 아니면 차단
  if (!isVercelCron && !isManualRun) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // 1. PENDING 상태의 수정 요청 가져오기
    const pendingRequests = await prisma.recordRequest.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'asc' }
    });

    if (pendingRequests.length === 0) {
      return res.status(200).json({ message: '반영할 내역 없음' });
    }

    // 2. GitHub에서 최신 all_records_v2.json 가져오기
    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
    const owner = "SunghwonBae"; // [수정필요]
    const repo = "korea-triathlon-utils";   // [수정필요]
    const path = "public/data/all_records_v2.json"; // 파일 경로 확인

    const { data: fileData } = await octokit.repos.getContent({ owner, repo, path });
    
    // Base64 디코딩
    const originalContent = Buffer.from(fileData.content, "base64").toString("utf-8");
    let records = JSON.parse(originalContent);

    // 3. 메모리상에서 데이터 업데이트
    const processedIds = [];
    
    pendingRequests.forEach(req => {
      const changes = JSON.parse(req.updatedFields);
      
      // [수정] 신규 등록 처리
      if (changes._isNew) {
        delete changes._isNew; // 플래그 제거
        records.unshift(changes); // 배열 맨 앞에 추가 (신규 등록은 최신 순으로 정렬)
        processedIds.push(req.id);
      } else {
        // [기존] 수정 처리
        const targetIndex = records.findIndex(r => 
          r.rn === req.raceName && 
          r.y === req.year && 
          r.b === req.bib && 
          r.n === req.name
        );

        if (targetIndex !== -1) {
          records[targetIndex] = { ...records[targetIndex], ...changes };
          processedIds.push(req.id);
        }
      }
    });

    // 4. GitHub에 업데이트된 파일 커밋 (Push)
    const newContentBase64 = Buffer.from(JSON.stringify(records, null, 2)).toString("base64");
    
    await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path,
      message: `[Cron] Update records: ${processedIds.length} changes processed`,
      content: newContentBase64,
      sha: fileData.sha, // 파일 덮어쓰기를 위해 필수
      branch: 'main' // 브랜치명 확인
    });

    // 5. DB 상태 업데이트 (PENDING -> COMPLETED)
    await prisma.recordRequest.updateMany({
      where: { id: { in: processedIds } },
      data: { 
        status: 'COMPLETED',
        processedAt: new Date()
      }
    });

    res.status(200).json({ success: true, processed: processedIds.length });

  } catch (error) {
    console.error("Cron Error:", error);
    res.status(500).json({ error: error.message });
  }
}