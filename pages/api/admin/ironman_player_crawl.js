import axios from 'axios';
import https from 'https';

export default async function handler(req, res) {
  const { resultUrl, playerName } = req.query;

  if (!resultUrl || !playerName) {
    return res.status(400).json({ error: '조회할 이름이 필요합니다.' });
  }

  // URL에서 race ID 추출 (예: /race/2460/ -> 2460)
  const raceIdMatch = resultUrl.match(/race\/(\d+)\//);
  if (!raceIdMatch) {
    return res.status(400).json({ error: '유효한 대회 URL이 아닙니다.' });
  }
  const raceId = raceIdMatch[1];

  const config = {
    headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': resultUrl,
        'X-Requested-With': 'XMLHttpRequest'
    },
    httpsAgent: new https.Agent({ rejectUnauthorized: false }),
    timeout: 15000
  };

  try {
    // CoachCox의 실제 데이터 소스인 admin-ajax.php 호출
    // action=get_race_results 파라미터는 사이트 구조에 따라 다를 수 있으나 
    // 보통 DataTables용 서버사이드 엔드포인트를 사용합니다.
    // 여기서는 가장 확실한 방법인 페이지 전체 소스를 다시 분석하되 
    // 데이터가 로드될 때까지 기다리는 대신, 검색 쿼리를 URL에 붙여 시도합니다.
    
    const response = await axios.get(resultUrl, config);
    const html = response.data;

    // 만약 axios로 안될 경우를 대비해, 동적 로딩이 없는 'Print' 또는 'CSV'용 
    // 데이터 엔드포인트가 있는지 확인하는 로직이 필요할 수 있습니다.
    // 하지만 우선은 이름 기반 매칭 로직을 유지하며 '데이터 없음' 로그를 상세화합니다.

    const searchResults = [];
    
    // 로그 분석 결과 0개가 나오는 이유는 서버가 렌더링된 HTML을 주지 않기 때문입니다.
    // 이 경우 최후의 수단으로 해당 사이트가 사용하는 JSON API 구조를 모방합니다.
    
    // 예시: https://www.coachcox.co.uk/imstats/race-data/?race=2460
    const dataApiUrl = `https://www.coachcox.co.uk/imstats/race-data/?race=${raceId}`;
    const apiRes = await axios.get(dataApiUrl, config);
    const fullData = apiRes.data; // JSON 데이터라고 가정

    if (Array.isArray(fullData)) {
        const filtered = fullData.filter(p => 
            p.name.toLowerCase().includes(playerName.toLowerCase().trim())
        );
        return res.status(200).json(filtered);
    }

    return res.status(404).json({ 
        error: '데이터 소스 접근 방식 변경 필요', 
        debug: 'HTML 내에 데이터가 포함되어 있지 않습니다.' 
    });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}