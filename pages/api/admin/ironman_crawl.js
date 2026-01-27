import axios from 'axios';
import * as cheerio from 'cheerio';
import https from 'https';

export default async function handler(req, res) {
  const config = {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    },
    httpsAgent: new https.Agent({ rejectUnauthorized: false }),
    timeout: 20000 // 상세 페이지 접속을 위해 타임아웃을 넉넉히 설정
  };

  try {
    const targetUrl = 'https://www.coachcox.co.uk/imstats/im/';
    console.log(`[시작] CoachCox 메인 페이지 수집 중...`);

    const response = await axios.get(targetUrl, config);
    const $ = cheerio.load(response.data);

    const raceResults = [];
    const raceBlocks = $('.ims-infobox');

    // 1단계: 메인 페이지에서 대회명과 시리즈 URL 수집
    for (const el of raceBlocks) {
        const name = $(el).find('.ims-infobox-title').text().trim();
        let seriesUrl = null;
        let seriesId = null;

        $(el).find('a').each((_, a) => {
            if ($(a).text().trim() === "Overview") {
                seriesUrl = $(a).attr('href');
                const match = seriesUrl?.match(/series\/(\d+)\//);
                if (match) seriesId = match[1];
                return false;
            }
        });

        if (name && seriesUrl) {
            console.log(`[분석 중] ${name} 상세 페이지 접속...`);
            
            try {
                // 2단계: 각 시리즈 페이지로 접속하여 연도별 결과 URL 추출
                const detailResponse = await axios.get(seriesUrl, config);
                const $detail = cheerio.load(detailResponse.data);
                const yearsArray = [];

                // "YYYY Results" 텍스트를 가진 링크 검색
                $detail('a').each((_, a) => {
                    const linkText = $detail(a).text().trim(); // 예: "2024 Results"
                    const linkHref = $detail(a).attr('href');
                    
                    // 연도 4자리 + " Results" 패턴 확인 및 URL이 /results/로 끝나는지 확인
                    const yearMatch = linkText.match(/^(\d{4})\s*Results$/i);
                    if (yearMatch && linkHref && linkHref.endsWith('/results/')) {
                        yearsArray.push({
                            year: parseInt(yearMatch[1]),
                            resultUrl: linkHref
                        });
                    }
                });

                // 연도별 내림차순 정렬 (최신순)
                yearsArray.sort((a, b) => b.year - a.year);

                raceResults.push({
                    name: name,
                    seriesId: seriesId,
                    seriesUrl: seriesUrl,
                    years: yearsArray
                });
            } catch (detailError) {
                console.error(`[경고] ${name} 상세 페이지 수집 실패:`, detailError.message);
                // 상세 페이지 실패 시에도 기본 정보는 포함
                raceResults.push({ name, seriesId, seriesUrl, years: [], error: "Detail fetch failed" });
            }
        }
    }

    console.log(`[완료] 총 ${raceResults.length}개의 대회 데이터 수집 완료`);
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json(raceResults);

  } catch (error) {
    console.error('[에러] Ironman 수집 실패:', error.message);
    return res.status(500).json({ error: error.message });
  }
}