import axios from 'axios';
import * as cheerio from 'cheerio';
import https from 'https';

export default async function handler(req, res) {
  // 1. 회사 보안 인증서 검사 무시 설정
  const agent = new https.Agent({  
    rejectUnauthorized: false
  });

  // 2. URL에서 파라미터 직접 추출 (trailingSlash 대응)
  const protocol = req.headers['x-forwarded-proto'] || 'http';
  const fullUrl = new URL(req.url, `${protocol}://${req.headers.host}`);
  
  const tourcd = req.query.tourcd || fullUrl.searchParams.get('tourcd');
  const sYear = req.query.sYear || fullUrl.searchParams.get('sYear');
  const raceName = req.query.raceName || fullUrl.searchParams.get('raceName');

  console.log('==============================================');
  console.log(`[디버그] 요청 주소: ${req.url}`);
  console.log(`[디버그] 추출값 -> tourcd: ${tourcd}, sYear: ${sYear}`);

  if (!tourcd || !sYear) {
    return res.status(400).json({ 
      error: '필수 파라미터(tourcd, sYear)가 없습니다.',
      debug: { tourcd, sYear, rawUrl: req.url }
    });
  }

  try {
    let allResults = [];
    const maxPage = 20; 

    for (let page = 1; page <= maxPage; page++) {
      const targetUrl = `https://www.triathlon.or.kr/results/results/record/?mode=record&tourcd=${tourcd}&page=${page}&sYear=${sYear}`;
      
      const response = await axios.get(targetUrl, { 
        httpsAgent: agent,
        timeout: 15000,
        headers: { 
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' 
        }
      });

      const $ = cheerio.load(response.data);
      
      // 주신 HTML 구조 분석 결과: 데이터는 table 안의 tr에 담겨 있음
      const rows = $('table tr'); 
      let pageFoundCount = 0;

      rows.each((_, el) => {
        const cols = $(el).find('td');
        
        // 주신 소스 기준 데이터가 있는 행은 td가 10개임
        if (cols.length === 10) {
          const rowData = {
            rank: $(cols[0]).text().trim(), // 순위
            n: $(cols[1]).text().trim(),    // 이름
            b: $(cols[2]).text().trim(),    // 배번
            c: $(cols[3]).text().trim(),    // 소속
            s: $(cols[4]).text().trim(),    // 수영
            t1: $(cols[5]).text().trim(),   // T1
            b1: $(cols[6]).text().trim(),   // 사이클
            t2: $(cols[7]).text().trim(),   // T2
            r: $(cols[8]).text().trim(),    // 달리기
            t: $(cols[9]).text().trim(),    // 종합기록 (Tot)
            g: "동호인" // 상세 페이지엔 성별 정보가 없으므로 기본값
          };

          // 순위가 숫자인 데이터만 수집 (헤더 제외)
          if (rowData.rank && !isNaN(rowData.rank)) {
            allResults.push(rowData);
            pageFoundCount++;
          }
        }
      });

      console.log(`[진행] ${page}페이지: ${pageFoundCount}건 수집 완료`);

      // 해당 페이지에 데이터가 없으면 다음 페이지로 갈 필요 없음
      if (pageFoundCount === 0) break;
    }

    console.log(`[성공] 총 ${allResults.length}건 데이터 수집 완료`);
    console.log('==============================================');

    // 1. 파일명 생성 규칙 적용 (대회명_대회코드_년도.json)
    // raceName에 한글이 포함되므로 안전하게 인코딩 처리합니다.
    const safeRaceName = raceName ? raceName.replace(/\s+/g, '') : '대회기록';
    const fileName = encodeURIComponent(`${safeRaceName}_${tourcd}_${sYear}.json`);

    // 2. 브라우저에 다운로드 명령 전달 (헤더 설정)
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);

    // 3. 최종 데이터 전송
    return res.status(200).send(JSON.stringify(allResults, null, 2));

  } catch (error) {
    console.error('[에러]', error.message);
    return res.status(500).json({ error: error.message });
  }
}