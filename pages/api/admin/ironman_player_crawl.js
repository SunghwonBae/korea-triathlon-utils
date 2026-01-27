import axios from 'axios';
import * as cheerio from 'cheerio';
import https from 'https';

export default async function handler(req, res) {
  const { resultUrl, bib } = req.query;

  if (!resultUrl || !bib) {
    return res.status(400).json({ error: '결과 URL과 배번이 필요합니다.' });
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

    console.log(`[디버그] ${resultUrl} 에서 배번 ${bib} 검색 중...`);

    // id가 imraceresultstable인 테이블 내의 모든 행(tr)을 탐색
    $('#imraceresultstable tbody tr').each((_, el) => {
      const cols = $(el).find('td');
      if (cols.length === 0) return; // 헤더 행 제외

      // td 순서에 따른 데이터 매핑 (0부터 시작)
      // 0:배번, 1:이름, 2:국가, 3:성별, 4:카테고리, 5:전체순위, 6:전체시간, 
      // 7:수영시간, 8:수영순위, 9:싸이클시간, 10:싸이클순위, 11:런시간, 12:런순위, 13:완주여부
      
      const rowBib = $(cols[0]).text().trim(); // 첫 번째 td가 배번

      if (rowBib === bib) {
        playerData = {
          bib: rowBib,
          name: $(cols[1]).text().trim(),
          country: $(cols[2]).text().trim(),
          gender: $(cols[3]).text().trim(),
          category: $(cols[4]).text().trim(),
          rank: $(cols[5]).text().trim(),
          finish: $(cols[6]).text().trim(),
          swim: $(cols[7]).text().trim(),
          swimRank: $(cols[8]).text().trim(),
          bike: $(cols[9]).text().trim(),
          bikeRank: $(cols[10]).text().trim(),
          run: $(cols[11]).text().trim(),
          runRank: $(cols[12]).text().trim(),
          status: $(cols[13]).text().trim()
        };
        return false; // 찾았으므로 반복 종료
      }
    });

    if (playerData) {
      console.log(`[성공] 선수 발견: ${playerData.name}`);
      return res.status(200).json(playerData);
    } else {
      console.log(`[실패] 배번 ${bib}을 찾을 수 없습니다.`);
      return res.status(404).json({ error: `배번 ${bib} 선수를 찾을 수 없습니다.` });
    }
  } catch (error) {
    console.error(`[에러] 파싱 실패: ${error.message}`);
    return res.status(500).json({ error: '서버 에러: ' + error.message });
  }
}