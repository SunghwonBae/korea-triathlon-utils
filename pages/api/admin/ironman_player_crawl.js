import axios from 'axios';
import https from 'https';

export default async function handler(req, res) {
  const { resultUrl, playerName } = req.query;

  if (!resultUrl || !playerName) {
    return res.status(400).json({ error: '조회할 이름이 필요합니다.' });
  }

  const config = {
    headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    },
    httpsAgent: new https.Agent({ rejectUnauthorized: false }),
    timeout: 15000
  };

  try {
    console.log(`[분석 시작] 소스 코드에서 데이터 추출 중: ${resultUrl}`);
    const response = await axios.get(resultUrl, config);
    const html = response.data;

    // 1. var dataSet = [ ... ]; 부분을 추출하는 정규표현식
    // CoachCox 소스 내에 var dataSet = [[...]]; 형식으로 존재함
    const match = html.match(/var\s+dataSet\s*=\s*(\[\[[\s\S]*?\]\]);/);

    if (!match || !match[1]) {
      console.log("[에러] 소스 코드에서 dataSet 변수를 찾을 수 없습니다.");
      return res.status(404).json({ error: '페이지 구조 내에서 데이터를 찾을 수 없습니다.' });
    }

    // 2. 추출된 문자열을 실제 JSON(배열)으로 변환
    let allData;
    try {
        allData = JSON.parse(match[1]);
    } catch (e) {
        console.log("[에러] JSON 파싱 실패");
        return res.status(500).json({ error: '데이터 파싱 오류' });
    }

    console.log(`[디버그] 전체 데이터 개수: ${allData.length}개`);

    // 3. 이름 기반 필터링 및 객체화
    // 소스 내 배열 순서: 
    // [0]이름(HTML포함), [1]성별, [2]카테고리, [3]카테고리순위, [4]전체시간, [5]전체순위 ... [8]수영, [9]사이클, [10]런
    const searchResults = allData
      .filter(row => {
        // 이름에 <a> 태그가 포함되어 있으므로 태그 제거 후 비교
        const cleanName = row[0].replace(/<[^>]*>?/gm, '').trim();
        return cleanName.toLowerCase().includes(playerName.toLowerCase().trim());
      })
      .map(row => ({
        name: row[0].replace(/<[^>]*>?/gm, '').trim(),
        gender: row[1],
        category: row[2],
        categoryRank: row[3],
        finish: row[4],
        totalRank: row[5],
        swim: row[8],
        bike: row[9],
        run: row[10]
      }));

    console.log(`[완료] 검색 결과: ${searchResults.length}명`);
    return res.status(200).json(searchResults);

  } catch (error) {
    console.error(`[서버 에러] ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
}