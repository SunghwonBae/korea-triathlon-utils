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

    // 그리드 로우들을 순회하며 배번 매칭
    $('.ims-grid-row').each((_, el) => {
      const cols = $(el).find('div');
      // CoachCox 그리드 컬럼 인덱스: 0:Rank, 1:Name, 2:Category, 3:Bib, 4:Swim, 6:Bike, 8:Run, 10:Finish
      const rowBib = $(cols[3]).text().trim();

      if (rowBib === bib) {
        playerData = {
          rank: $(cols[0]).text().trim(),
          name: $(cols[1]).text().trim(),
          category: $(cols[2]).text().trim(),
          bib: rowBib,
          swim: $(cols[4]).text().trim(),
          bike: $(cols[6]).text().trim(),
          run: $(cols[8]).text().trim(),
          finish: $(cols[10]).text().trim() || $(cols[9]).text().trim()
        };
        return false; // 매칭 시 즉시 종료
      }
    });

    if (playerData) {
      return res.status(200).json(playerData);
    } else {
      return res.status(404).json({ error: `배번 ${bib} 선수를 찾을 수 없습니다.` });
    }
  } catch (error) {
    return res.status(500).json({ error: '서버 에러: ' + error.message });
  }
}