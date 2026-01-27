import axios from 'axios';
import https from 'https';

export default async function handler(req, res) {
  const { resultUrl, playerName } = req.query;

  if (!resultUrl || !playerName) {
    return res.status(400).json({ error: '조회할 이름이 필요합니다.' });
  }

  // 1. Race ID 추출
  const raceIdMatch = resultUrl.match(/race\/(\d+)\//);
  const raceId = raceIdMatch ? raceIdMatch[1] : null;

  const config = {
    headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': resultUrl,
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'X-Requested-With': 'XMLHttpRequest'
    },
    httpsAgent: new https.Agent({ rejectUnauthorized: false }),
    timeout: 15000
  };

  try {
    // 2. CoachCox가 데이터를 가져오는 실제 엔드포인트
    // DataTables 2.x 버전은 대개 이런 파라미터를 사용하여 서버에 데이터를 요청합니다.
    const apiUrl = `https://www.coachcox.co.uk/imstats/wp-admin/admin-ajax.php`;
    
    // POST 방식으로 요청해야 할 가능성이 높습니다.
    const params = new URLSearchParams();
    params.append('action', 'get_race_results');
    params.append('race', raceId);
    params.append('draw', '1');
    params.append('start', '0');
    params.append('length', '2000'); // 전체 데이터를 가져오기 위해 크게 잡음

    console.log(`[API 요청] RaceID: ${raceId} 에 대한 데이터 요청 중...`);
    const response = await axios.post(apiUrl, params, config);
    
    const allData = response.data.data;

    if (!allData || !Array.isArray(allData)) {
      // 만약 POST가 실패한다면 GET으로 재시도
      const getApiUrl = `${apiUrl}?action=get_race_results&race=${raceId}&length=2000`;
      const getRes = await axios.get(getApiUrl, config);
      if (!getRes.data.data) throw new Error("데이터 구조를 찾을 수 없습니다.");
      allData = getRes.data.data;
    }

    // 3. 필터링 로직
    const searchResults = allData
      .filter(row => {
        // row[1]이 이름 컬럼입니다. (HTML 태그 제거 후 비교)
        const nameInRow = row[1].replace(/<[^>]*>?/gm, '').trim();
        return nameInRow.toLowerCase().includes(playerName.toLowerCase().trim());
      })
      .map(row => ({
        name: row[1].replace(/<[^>]*>?/gm, '').trim(),
        gender: row[3], // 보내주신 td 순서 기반 조정
        category: row[4],
        finish: row[6],
        swim: row[9],
        bike: row[11],
        run: row[13]
      }));

    console.log(`[성공] 검색 결과: ${searchResults.length}건`);
    return res.status(200).json(searchResults);

  } catch (error) {
    console.error(`[에러] 상세: ${error.message}`);
    return res.status(500).json({ error: '수집 실패: ' + error.message });
  }
}