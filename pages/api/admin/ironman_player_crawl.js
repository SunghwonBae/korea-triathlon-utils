import axios from 'axios';
import https from 'https';

export default async function handler(req, res) {
  const { resultUrl, playerName } = req.query;

  if (!resultUrl || !playerName) {
    return res.status(400).json({ error: '조회할 이름이 필요합니다.' });
  }

  const raceIdMatch = resultUrl.match(/race\/(\d+)\//);
  const raceId = raceIdMatch ? raceIdMatch[1] : "2460"; // 추출 실패시 기본값

  // 브라우저와 거의 동일한 헤더 설정
  const config = {
    headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
        'Referer': `https://www.coachcox.co.uk/imstats/race/${raceId}/results/`,
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
    },
    httpsAgent: new https.Agent({ 
        rejectUnauthorized: false, // SSL 인증서 무시
        keepAlive: true 
    }),
    timeout: 15000
  };

  try {
    // 브라우저에서 확인하신 그 주소 그대로 호출합니다.
    const apiUrl = `https://www.coachcox.co.uk/wp-json/imstats/v1.90/race/results/${raceId}`;
    
    console.log(`[데이터 요청 시작] API: ${apiUrl}`);
    
    const response = await axios.get(apiUrl, config);
    
    // 브라우저에서 본 JSON 구조에 따라 결과 추출
    const allResults = response.data.results || [];

    if (allResults.length === 0) {
      return res.status(404).json({ error: 'JSON 응답에 결과 데이터가 비어있습니다.' });
    }

    // 이름으로 필터링
    const searchResults = allResults
      .filter(item => {
        if (!item.n) return false;
        // n 필드에 HTML 태그(링크)가 포함되어 있을 수 있으므로 제거 후 비교
        const cleanName = item.n.replace(/<[^>]*>?/gm, '').trim();
        return cleanName.toLowerCase().includes(playerName.toLowerCase().trim());
      })
      .map(item => ({
        bib: item.bi || '-',
        name: item.n.replace(/<[^>]*>?/gm, '').trim(),
        category: item.c || '-',
        finish: item.ot || '-',
        swim: item.st || '-',
        bike: item.bt || '-',
        run: item.rt || '-',
        rank: item.odr || '-'
      }));

    console.log(`[조회 성공] 검색어: ${playerName}, 결과수: ${searchResults.length}`);
    return res.status(200).json(searchResults);

  } catch (error) {
    console.error(`[API 호출 에러] 상태: ${error.response?.status}, 메시지: ${error.message}`);
    
    // 만약 403이나 401이 뜬다면 서버 차단이므로 대체 메시지 출력
    if (error.response?.status === 403) {
        return res.status(403).json({ error: '사이트 보안 시스템이 서버의 접근을 차단했습니다.' });
    }
    
    return res.status(500).json({ error: '데이터 요청 중 오류: ' + error.message });
  }
}