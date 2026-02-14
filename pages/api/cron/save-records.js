// pages/api/cron/save-records.js
import { PrismaClient } from '@prisma/client';
import { Octokit } from "@octokit/rest"; // npm install @octokit/rest 필요

const prisma = new PrismaClient();

export default async function handler(req, res) {

  // --- [디버깅용 로그 추가] ---
  console.log("=== [1] CRON AUTH DEBUG ===");
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

    console.log(`=== [2] DB DEBUG ===`);
    console.log(`- Pending Requests Count: ${pendingRequests.length}`);

    if (pendingRequests.length === 0) {
      return res.status(200).json({ message: '반영할 내역 없음' });
    }

    // 2. GitHub에서 최신 all_records_v2.json 가져오기
    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
    const owner = "SunghwonBae"; // [수정필요]
    const repo = "korea-triathlon-utils";   // [수정필요]
    const path = "public/data/all_records_v2.json"; // 파일 경로 확인

    console.log(`=== [3] GITHUB FETCH DEBUG ===`);
    console.log(`- Fetching path: ${path} (Large File: 7.51MB)`);
    
    // [수정] 대용량 파일을 위해 'raw' 포맷으로 직접 요청합니다.
    const { data: originalContent } = await octokit.repos.getContent({
      owner,
      repo,
      path,
      headers: {
        accept: "application/vnd.github.v3.raw", // 1MB 제한 없이 원본 데이터를 가져옵니다.
      },
    });

    // 주의: raw 헤더를 쓰면 response.data가 곧 파일 내용(string)이 됩니다.
    console.log(`- Raw Content Length: ${originalContent.length}`);

    let records;
    try {
      // 이제 originalContent는 base64가 아닌 일반 문자열입니다.
      records = JSON.parse(originalContent);
      console.log(`- Successfully parsed ${records.length} records.`);
    } catch (parseError) {
      console.error("- JSON Parse Error:", parseError.message);
      // 만약 데이터가 너무 커서 잘렸거나 형식이 틀린 경우 확인용
      console.error("- Content Start:", originalContent.substring(0, 100));
      throw new Error("GitHub 대용량 JSON 파싱 실패");
    }


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

    // 4. GitHub에 업데이트된 JSON 파일 업로드
    // 저장할 때는 다시 JSON 문자열로 만들어서 올립니다.
    if (processedIds.length > 0) {
      const newContent = JSON.stringify(records, null, 2);
      const newContentBase64 = Buffer.from(newContent).toString("base64");
      
      // 저장 시에는 기존처럼 fileData.sha가 필요할 수 있습니다.
      // raw로 가져오면 sha를 알 수 없으므로, sha만 따로 가져오는 호출이 필요할 수 있습니다.
      const { data: meta } = await octokit.repos.getContent({ owner, repo, path });
      
      await octokit.repos.createOrUpdateFileContents({
        owner, repo, path,
        message: `[Cron] Update records: ${processedIds.length} changes processed`,
        content: newContentBase64,
        sha: meta.sha, // 메타데이터에서 가져온 sha 사용
        branch: 'main'
      });

      // 5. DB 상태 업데이트 (PENDING -> COMPLETED)
      await prisma.recordRequest.updateMany({
        where: { id: { in: processedIds } },
        data: { 
          status: 'COMPLETED',
          processedAt: new Date()
        }
      });
    }

    res.status(200).json({ success: true, processed: processedIds.length });

  } catch (error) {
    console.error("Cron Error:", error);
    res.status(500).json({ error: error.message });
  }
}