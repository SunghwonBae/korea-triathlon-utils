import axios from 'axios';
import https from 'https';

export default async function handler(req, res) {
  const { resultUrl, playerName } = req.query;

  if (!resultUrl || !playerName) {
    return res.status(400).json({ error: '조회할 이름이 필요합니다.' });
  }

  // 1. URL에서 Race ID 추출 (예: 2460)
  const raceIdMatch = resultUrl.match(/race\/(\d+)\//);
  const raceId = raceIdMatch ? raceIdMatch[1] : null;

  if (!raceId) {
    return res.status(400).json({ error: '유효한 대회 ID를 찾을 수 없습니다.' });
  }

  // 2. 소스 코드에서 확인된 실제 API 주소 구성
  // 버전(v1.90)은 고정이 아닐 수 있으나 현재 시점 최신 주소입니다.
  const apiUrl = `https://www.coachcox.co.uk/wp-json/imstats/v1.90/race/results/${raceId}`;

  const config = {
    headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': resultUrl
    },
    httpsAgent: new https.Agent({ rejectUnauthorized: false }),
    timeout: 10000
  };

  try {
    console.log(`[API 요청] ${apiUrl}`);
    const response = await axios.get(apiUrl, config);
    
    // API 응답 구조: { "results": [ { "n": "이름", "ot": "기록", ... }, ... ] }
    const allResults = response.data.results;

    if (!allResults || !Array.isArray(allResults)) {
      return res.status(404).json({ error: '결과 데이터를 찾을 수 없습니다.' });
    }

    // 3. 필터링 및 매핑
    // API 필드 설명: n(name), c(category), ot(overall time), bi(bib), st(swim), bt(bike), rt(run)
    const searchResults = allResults
      .filter(item => item.n && item.n.toLowerCase().includes(playerName.toLowerCase().trim()))
      .map(item => ({
        bib: item.bi,
        name: item.n,
        category: item.c,
        finish: item.ot,
        swim: item.st,
        bike: item.bt,
        run: item.rt,
        rank: item.odr
      }));

    console.log(`[검색 완료] 매칭: ${searchResults.length}건`);
    return res.status(200).json(searchResults);

  } catch (error) {
    console.error(`[에러] ${error.message}`);
    return res.status(500).json({ error: '데이터 요청 중 오류가 발생했습니다.' });
  }
}