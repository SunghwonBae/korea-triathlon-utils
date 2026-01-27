import axios from 'axios';
import https from 'https';

export default async function handler(req, res) {
  const { resultUrl, playerName } = req.query;

  if (!resultUrl || !playerName) {
    return res.status(400).json({ error: '조회할 이름이 필요합니다.' });
  }

  // 1. URL에서 대회 ID 추출 (예: 2460)
  const raceIdMatch = resultUrl.match(/race\/(\d+)\//);
  const raceId = raceIdMatch ? raceIdMatch[1] : null;

  if (!raceId) {
    return res.status(400).json({ error: '유효한 대회 ID를 찾을 수 없습니다.' });
  }

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
    // 2. CoachCox의 실제 데이터 소스 호출 (DataTables AJAX 엔드포인트)
    // 이 URL은 CoachCox가 테이블 데이터를 로드할 때 사용하는 표준 방식입니다.
    const apiUrl = `https://www.coachcox.co.uk/imstats/wp-admin/admin-ajax.php?action=get_race_results&race=${raceId}`;
    
    console.log(`[API 요청] ${apiUrl}`);
    const response = await axios.get(apiUrl, config);
    
    // CoachCox의 응답 구조는 { "data": [ [col0, col1, ...], [...] ] } 형태입니다.
    const allData = response.data.data;

    if (!allData || !Array.isArray(allData)) {
      return res.status(404).json({ error: '데이터를 불러올 수 없습니다. API 구조가 변경되었을 수 있습니다.' });
    }

    // 3. 이름 기반 필터링
    // 0:Bib, 1:Name, 2:Gender, 3:AgeGroup, 4:Finish, 5:TotalRank, 6:Swim, 8:Bike, 10:Run
    const searchResults = allData
      .filter(row => row[1] && row[1].toLowerCase().includes(playerName.toLowerCase().trim()))
      .map(row => ({
        bib: row[0],
        name: row[1].replace(/<[^>]*>?/gm, ''), // HTML 태그 제거 (링크 포함된 경우 대비)
        gender: row[2],
        category: row[3],
        finish: row[4],
        rank: row[5],
        swim: row[6],
        bike: row[8],
        run: row[10]
      }));

    console.log(`[조회 완료] 매칭 인원: ${searchResults.length}명`);
    return res.status(200).json(searchResults);

  } catch (error) {
    console.error(`[에러] API 호출 실패: ${error.message}`);
    return res.status(500).json({ error: '데이터 수집 중 오류: ' + error.message });
  }
}