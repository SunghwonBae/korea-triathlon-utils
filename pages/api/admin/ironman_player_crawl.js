import axios from 'axios';
import https from 'https';

export default async function handler(req, res) {
  const { resultUrl, playerName } = req.query;

  if (!resultUrl || !playerName) {
    return res.status(400).json({ error: '조회할 이름이 필요합니다.' });
  }

  // 1. 결과 URL을 CSV 다운로드 URL로 변환
  // 예: .../race/2460/results/ -> .../race/2460/csv/
  const csvUrl = resultUrl.replace('/results/', '/csv/');

  const config = {
    headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    },
    httpsAgent: new https.Agent({ rejectUnauthorized: false }),
    timeout: 20000
  };

  try {
    console.log(`[CSV 요청] ${csvUrl}`);
    const response = await axios.get(csvUrl, config);
    const csvData = response.data;

    if (!csvData || csvData.length < 10) {
      return res.status(404).json({ error: 'CSV 데이터를 불러올 수 없습니다.' });
    }

    // 2. CSV 파싱 (줄바꿈으로 분리)
    const lines = csvData.split('\n');
    const searchResults = [];

    // CSV 헤더 예시: Bib, Name, Gender, Age Group, Finish, Swim, Bike, Run ...
    // CoachCox CSV의 실제 인덱스에 맞춰 매핑 (첫 줄은 헤더이므로 i=1부터 시작)
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;

      // 쉼표로 분리 (데이터 내 쉼표가 있을 경우를 대비해 정규식 사용 권장이나 기본형으로 우선 처리)
      const cols = lines[i].split(',').map(item => item.replace(/"/g, '').trim());

      // CSV 구조 (CoachCox 표준): 0:Bib, 1:Name, 2:Gender, 3:AgeGroup, 4:Finish, 5:Swim, 6:Bike, 7:Run ...
      const rowName = cols[1];

      if (rowName && rowName.toLowerCase().includes(playerName.toLowerCase().trim())) {
        searchResults.push({
          bib: cols[0],
          name: rowName,
          gender: cols[2],
          category: cols[3],
          finish: cols[4],
          swim: cols[5],
          bike: cols[6],
          run: cols[7],
          // 추가 정보가 필요하면 cols[인덱스]를 더 추가하세요
        });
      }
    }

    console.log(`[완료] 검색된 인원: ${searchResults.length}명`);
    return res.status(200).json(searchResults);

  } catch (error) {
    console.error(`[에러] CSV 수집 실패: ${error.message}`);
    return res.status(500).json({ error: 'CSV 수집 중 오류: ' + error.message });
  }
}