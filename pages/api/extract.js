import axios from 'axios';
import * as cheerio from 'cheerio';

export default async function handler(req, res) {
    const { tourcd, sYear } = req.query;
    if (!tourcd || !sYear) return res.status(400).json({ error: 'Missing params' });

    let allResults = [];
    let page = 1;
    const startTime = Date.now();

    try {
        while (true) {
            if (Date.now() - startTime > 8500) break; // Vercel 10초 제한 방어

            const url = `https://www.triathlon.or.kr/results/results/record/?mode=record&tourcd=${tourcd}&page=${page}&sYear=${sYear}`;
            const { data } = await axios.get(url, { timeout: 5000 });
            const $ = cheerio.load(data);
            const rows = $('.board_list tbody tr');

            if (rows.length === 0 || rows.text().includes('등록된 게시물이 없습니다')) break;

            rows.each((i, el) => {
                const cols = $(el).find('td');
                if (cols.length > 1) {
                    allResults.push({
                        rank: $(cols[0]).text().trim(),
                        name: $(cols[1]).text().trim(),
                        bib: $(cols[2]).text().trim(),
                        gender: $(cols[3]).text().trim(),
                        category: $(cols[4]).text().trim(),
                        total: $(cols[5]).text().trim(),
                        swim: $(cols[6]).text().trim(),
                        t1: $(cols[7]).text().trim(),
                        bike: $(cols[8]).text().trim(),
                        t2: $(cols[9]).text().trim(),
                        run: $(cols[10]).text().trim()
                    });
                }
            });
            page++;
        }
        // 분석을 위해 JSON 데이터 반환
        res.status(200).json(allResults);
    } catch (error) {
        res.status(500).json({ error: 'Server Error' });
    }
}