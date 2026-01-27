import axios from 'axios';
import https from 'https';

export default async function handler(req, res) {
  const { resultUrl, playerName } = req.query;

  if (!resultUrl || !playerName) {
    return res.status(400).json({ error: '조회할 이름이 필요합니다.' });
  }

  const raceIdMatch = resultUrl.match(/race\/(\d+)\//);
  const raceId = raceIdMatch ? raceIdMatch[1] : null;

  const config = {
    headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.coachcox.co.uk/',
        'Origin': 'https://www.coachcox.co.uk'
    },
    httpsAgent: new https.Agent({ rejectUnauthorized: false }),
    timeout: 10000
  };

  try {
    // 1단계: HTML 소스에서 현재 사용 중인 정확한 API 주소(버전 포함)를 동적으로 추출
    const pageRes = await axios.get(resultUrl, config);
    const html = pageRes.data;
    
    // 소스 코드 내의 'wp-json/imstats/v.../race/results/ID' 패턴 탐색
    const apiPattern = new RegExp(`https://www.coachcox.co.uk/wp-json/imstats/v[\\d\\.]+/race/results/${raceId}`);
    const apiMatch = html.match(apiPattern);
    
    // 만약 패턴을 못 찾으면 기존 v1.90을 기본값으로 사용
    const finalApiUrl = apiMatch ? apiMatch[0] : `https://www.coachcox.co.uk/wp-json/imstats/v1.90/race/results/${raceId}`;

    console.log(`[시도 중] API 주소: ${finalApiUrl}`);

    // 2단계: 실제 데이터 요청
    const response = await axios.get(finalApiUrl, config);
    
    // CoachCox의 API 구조상 데이터가 response.data.results에 들어있음
    const allResults = response.data.results || [];

    if (allResults.length === 0) {
      return res.status(404).json({ error: '결과 데이터를 찾을 수 없습니다. (응답 데이터 비어있음)' });
    }

    // 3단계: 필터링 (n: 이름, bi: 배번, ot: 전체시간 등)
    const searchResults = allResults
      .filter(item => item.n && item.n.toLowerCase().includes(playerName.toLowerCase().trim()))
      .map(item => ({
        bib: item.bi,
        name: item.n.replace(/<[^>]*>?/gm, '').trim(), // 이름에 링크 태그가 있을 경우 제거
        category: item.c,
        finish: item.ot,
        swim: item.st,
        bike: item.bt,
        run: item.rt,
        rank: item.odr
      }));

    console.log(`[완료] 검색된 인원: ${searchResults.length}명`);
    return res.status(200).json(searchResults);

  } catch (error) {
    console.error(`[에러] 호출 실패: ${error.message}`);
    return res.status(500).json({ error: '데이터 수집 중 오류: ' + error.message });
  }
}