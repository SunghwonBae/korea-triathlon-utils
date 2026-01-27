import axios from 'axios';
import * as cheerio from 'cheerio';
import https from 'https';

export default async function handler(req, res) {
  const { resultUrl, playerName, finishTime } = req.query;

  console.log(`\n[조회 시작] URL: ${resultUrl}`);
  console.log(`[파라미터] 이름: ${playerName}, 기록: ${finishTime}`);

  if (!resultUrl || !playerName || !finishTime) {
    return res.status(400).json({ error: '이름과 전체 기록이 모두 필요합니다.' });
  }

  const config = {
    headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8'
    },
    httpsAgent: new https.Agent({ rejectUnauthorized: false }),
    timeout: 15000
  };

  try {
    const response = await axios.get(resultUrl, config);
    const $ = cheerio.load(response.data);
    
    // 디버그: 테이블 존재 여부 확인
    const table = $('#imraceresultstable');
    console.log(`[디버그] 테이블(#imraceresultstable) 존재 여부: ${table.length > 0}`);

    if (table.length === 0) {
        console.log(`[디버그] 테이블을 찾을 수 없습니다. 페이지 내 모든 table ID:`, $('table').map((i, el) => $(el).attr('id')).get());
        return res.status(500).json({ error: '결과 테이블을 찾을 수 없습니다.' });
    }

    const rows = table.find('tbody tr');
    console.log(`[디버그] 추출된 행(tr) 개수: ${rows.length}`);

    const searchResults = [];
    let matchCount = 0;

    rows.each((i, el) => {
      const cols = $(el).find('td');
      if (cols.length < 5) return;

      const rowName = $(cols[0]).text().trim();

      // 처음 5개 행만 로그로 출력하여 구조 파악
      if (i < 5) {
        console.log(`[행 샘플 ${i}] 이름: "${rowName}", 시간: "${rowFinish}", 컬럼수: ${cols.length}`);
      }

      // 이름 포함 여부(부분 일치) 및 시간 일치 확인
      if (rowName.toLowerCase().includes(playerName.toLowerCase().trim())) {
        matchCount++;
        searchResults.push({
            name: rowName,
            gender: $(cols[1]).text().trim(),
            category: $(cols[2]).text().trim(),
            categoryRank: $(cols[3]).text().trim(),
            finish: $(cols[4]).text().trim(),
            totalRank: $(cols[5]).text().trim(),
            swim: $(cols[8]).text().trim(),
            bike: $(cols[9]).text().trim(),
            run: $(cols[10]).text().trim()
        });
        return false; // 찾으면 중단
      }
    });

    console.log(`[결과] 일치 검색 완료. 매칭 수: ${matchCount}`);

    if (searchResults.length > 0) {
      return res.status(200).json(searchResults);
    } else {
      return res.status(404).json({ 
        error: '선수를 찾을 수 없습니다.',
        debugMsg: `상위 5개 샘플 확인 결과, 입력하신 "${playerName}" 와 일치하는 행이 없습니다.`
      });
    }
  } catch (error) {
    console.error(`[서버 에러] ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
}