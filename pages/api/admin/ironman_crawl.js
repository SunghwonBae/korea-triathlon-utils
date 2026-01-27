import axios from 'axios';
import * as cheerio from 'cheerio';
import https from 'https';

export default async function handler(req, res) {
  const config = {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7'
    },
    httpsAgent: new https.Agent({ rejectUnauthorized: false }),
    timeout: 30000 
  };

  try {
    const targetUrl = 'https://www.coachcox.co.uk/imstats/im/';
    console.log(`[디버그] 1. 대상 URL 접속 시도: ${targetUrl}`);

    const response = await axios.get(targetUrl, config);
    
    console.log(`[디버그] 2. 응답 상태 코드: ${response.status}`);
    
    if (!response.data || response.data.length < 100) {
        console.log(`[디버그] 응답 데이터가 너무 짧습니다. 차단 가능성 있음.`);
        console.log(`[디버그] 응답 서두: ${response.data.substring(0, 500)}`);
        return res.status(500).json({ error: "Empty or blocked response" });
    }

    const $ = cheerio.load(response.data);
    
    // 구조 확인을 위한 디버그: 특정 클래스가 존재하는지 체크
    const infoBoxCount = $('.ims-infobox-wrap').length;
    console.log(`[디버그] 3. 발견된 .ims-infobox-wrap 개수: ${infoBoxCount}`);

    // 만약 ims-infobox-wrap이 없다면 다른 선택자 시도 (구조 변경 대비)
    if (infoBoxCount === 0) {
        console.log(`[디버그] .ims-infobox-wrap를 찾지 못했습니다. 대안 선택자 검색 중...`);
        // 페이지 내의 모든 링크 개수 등 출력
        console.log(`[디버그] 총 a 태그 개수: ${$('a').length}`);
    }

    const raceResults = [];
    const raceBlocks = $('.ims-infobox-wrap');

    // 0개일 경우를 대비해 샘플 로그 출력
    for (let i = 0; i < raceBlocks.length; i++) {
        const el = raceBlocks[i];
        const name = $(el).find('.ims-infobox-title').text().trim();
        let seriesUrl = null;
        let seriesId = null;

        $(el).find('a').each((_, a) => {
            const txt = $(a).text().trim();
            if (txt === "Overview") {
                seriesUrl = $(a).attr('href');
                const match = seriesUrl?.match(/series\/(\d+)\//);
                if (match) seriesId = match[1];
                return false;
            }
        });

        console.log(`[디버그] - 대회 발견: ${name} (ID: ${seriesId})`);

        if (name && seriesUrl) {
            try {
                // 상세 페이지 크롤링 (연도별 결과)
                console.log(`[디버그]   -> 상세 페이지 접속: ${seriesUrl}`);
                const detailRes = await axios.get(seriesUrl, config);
                const $detail = cheerio.load(detailRes.data);
                const yearsArray = [];

                $detail('a').each((_, a) => {
                    const linkText = $detail(a).text().trim();
                    const linkHref = $detail(a).attr('href');
                    const yearMatch = linkText.match(/^(\d{4})\s*Results$/i);
                    
                    if (yearMatch && linkHref && linkHref.endsWith('/results/')) {
                        yearsArray.push({
                            year: parseInt(yearMatch[1]),
                            resultUrl: linkHref
                        });
                    }
                });

                console.log(`[디버그]   -> 수집된 연도 개수: ${yearsArray.length}`);

                raceResults.push({
                    name: name,
                    seriesId: seriesId,
                    seriesUrl: seriesUrl,
                    years: yearsArray
                });
            } catch (err) {
                console.log(`[디버그]   -> 상세 페이지 에러 (${name}): ${err.message}`);
                raceResults.push({ name, seriesId, seriesUrl, years: [], error: err.message });
            }
        }
    }

    console.log(`[최종] 총 ${raceResults.length}개의 데이터 반환`);
    return res.status(200).json(raceResults);

  } catch (error) {
    console.error(`[에러] 전체 프로세스 실패: ${error.message}`);
    if (error.response) {
        console.log(`[에러 디버그] 응답 바디: ${error.response.data.substring(0, 500)}`);
    }
    return res.status(500).json({ error: error.message });
  }
}