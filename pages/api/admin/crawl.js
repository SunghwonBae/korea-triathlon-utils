import axios from 'axios';
import * as cheerio from 'cheerio';
import https from 'https';

export default async function handler(req, res) {
  // 결과물을 담을 Map (Key: 배번, Value: 선수정보 객체)
  const resultsMap = new Map();
  
  const agent = new https.Agent({ rejectUnauthorized: false });
  const protocol = req.headers['x-forwarded-proto'] || 'http';
  const fullUrl = new URL(req.url, `${protocol}://${req.headers.host}`);
  const tourcd = req.query.tourcd || fullUrl.searchParams.get('tourcd');
  const sYear = req.query.sYear || fullUrl.searchParams.get('sYear');
  const raceName = req.query.raceName || fullUrl.searchParams.get('raceName');

  if (!tourcd || !sYear) {
    return res.status(400).json({ error: '필수 파라미터가 없습니다.' });
  }

  try {
    // 1. sPart 리스트 추출 (중복 제거)
    const baseUrl = `https://www.triathlon.or.kr/results/results/record/?mode=record&tourcd=${tourcd}&sYear=${sYear}`;
    const mainResponse = await axios.get(baseUrl, { httpsAgent: agent });
    const $main = cheerio.load(mainResponse.data);
    const sPartMap = new Map();

    $main('.tabs.select ul li a').each((_, el) => {
        const href = $main(el).attr('href');
        const name = $main(el).html().replace(/<br\s*\/?>/gi, ' ').replace(/\s+/g, ' ').trim();
        const match = href.match(/sPart=([0-9]+)/);
        if (match && match[1]) sPartMap.set(match[1], name);
    });

    // 2. 각 sPart 별 데이터 수집
    for (const [sPartId, sPartName] of sPartMap) {
        
        // ==========================================
        // [추가된 로직] 엘리트, 고등부, 중등부 그룹 크롤링 제외
        // ==========================================
        if (sPartName.includes('엘리트') || sPartName.includes('고등부') || sPartName.includes('중등부')) {
            console.log(`[스킵] ${sPartName} 카테고리는 배번 중복 방지를 위해 수집에서 제외합니다.`);
            continue;
        }

        console.log(`[시작] ${sPartName} 수집 중...`);
        
        for (let page = 1; page <= 15; page++) {
            const targetUrl = `https://www.triathlon.or.kr/results/results/record/?mode=record&tourcd=${tourcd}&page=${page}&sYear=${sYear}&sPart=${sPartId}`;
            const response = await axios.get(targetUrl, { httpsAgent: agent, timeout: 10000 });
            const $ = cheerio.load(response.data);
            
            const rows = $('table tr');
            let foundInPage = 0;

            rows.each((_, el) => {
                const cols = $(el).find('td');
                if (cols.length === 10) {
                    const bib = $(cols[2]).text().trim(); // 배번
                    const rank = $(cols[0]).text().trim();

                    // 유효한 데이터(기록이 있는 행)인지 먼저 확인
                    if (rank && !isNaN(rank) && bib) {
                        
                        // 중복 저장 여부와 무관하게 페이지 내에 유효한 데이터가 있음을 기록 (페이징 조기 종료 방지)
                        foundInPage++;
                        
                        // 아직 수집되지 않은 배번일 때만 Map에 추가
                        if (!resultsMap.has(bib)) {
                            resultsMap.set(bib, {
                                category: sPartName,
                                rank: rank,
                                n: $(cols[1]).text().trim(),
                                b: bib,
                                c: $(cols[3]).text().trim(),
                                s: $(cols[4]).text().trim(),
                                t1: $(cols[5]).text().trim(),
                                b1: $(cols[6]).text().trim(),
                                t2: $(cols[7]).text().trim(),
                                r: $(cols[8]).text().trim(),
                                t: $(cols[9]).text().trim(),
                                sPartId: sPartId
                            });
                        }
                    }
                }
            });

            if (foundInPage === 0) break; 
        }
    }

    // Map의 Value들만 뽑아서 배열로 변환
    const finalData = Array.from(resultsMap.values());
    console.log(`[완료] 총 ${finalData.length}명의 고유 선수 기록 수집 완료`);

    const safeRaceName = raceName ? raceName.replace(/\s+/g, '') : '대회기록';
    const fileName = encodeURIComponent(`${safeRaceName}_${tourcd}_${sYear}.json`);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);

    return res.status(200).send(JSON.stringify(finalData, null, 2));

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
}