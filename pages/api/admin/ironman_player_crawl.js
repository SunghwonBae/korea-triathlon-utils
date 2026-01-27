import axios from 'axios';
import * as cheerio from 'cheerio';
import https from 'https';

export default async function handler(req, res) {
  // 배번(bib) 대신 이름(playerName)과 전체기록(finishTime)을 받습니다.
  const { resultUrl, playerName, finishTime } = req.query;

  if (!resultUrl || !playerName || !finishTime) {
    return res.status(400).json({ error: '이름과 전체 기록이 모두 필요합니다.' });
  }

  const config = {
    headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' 
    },
    httpsAgent: new https.Agent({ rejectUnauthorized: false }),
    timeout: 15000
  };

  try {
    const response = await axios.get(resultUrl, config);
    const $ = cheerio.load(response.data);
    let playerData = null;

    console.log(`[디버그] ${resultUrl} 에서 [${playerName} / ${finishTime}] 검색 중...`);

    // id가 imraceresultstable인 테이블 내의 모든 행(tr)을 탐색
    $('#imraceresultstable tbody tr').each((_, el) => {
      const cols = $(el).find('td');
      if (cols.length < 10) return; 

      // td 순서 (사용자 정의 기반):
      // 0:이름, 1:성별, 2:카테고리, 3:카테고리순위, 4:전체시간, 5:전체순위, 
      // 6:예선시간, 7:예선순위, 8:수영시간, 9:싸이클시간, 10:런시간, 11:런순위
      
      const rowName = $(cols[0]).text().trim();
      const rowFinish = $(cols[4]).text().trim();

      // 이름과 전체 시간이 모두 일치하는지 확인 (대소문자 무시)
      if (rowName.toLowerCase() === playerName.toLowerCase() && rowFinish === finishTime) {
        playerData = {
          name: rowName,
          gender: $(cols[1]).text().trim(),
          category: $(cols[2]).text().trim(),
          categoryRank: $(cols[3]).text().trim(),
          finish: rowFinish,
          totalRank: $(cols[5]).text().trim(),
          swim: $(cols[8]).text().trim(),
          bike: $(cols[9]).text().trim(),
          run: $(cols[10]).text().trim(),
          runRank: $(cols[11]).text().trim()
        };
        return false; // 매칭 시 종료
      }
    });

    if (playerData) {
      return res.status(200).json(playerData);
    } else {
      return res.status(404).json({ error: '일치하는 선수를 찾을 수 없습니다. 이름과 시간을 다시 확인하세요.' });
    }
  } catch (error) {
    return res.status(500).json({ error: '서버 에러: ' + error.message });
  }
}