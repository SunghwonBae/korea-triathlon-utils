import axios from 'axios';
import * as cheerio from 'cheerio';
import https from 'https';
import fs from 'fs';

async function crawlTriathlonClubs() {
    const currentYear = new Date().getFullYear(); // 2026
    const baseUrl = 'https://www.triathlon.or.kr/player/club/';
    const clubDetailBase = `https://www.triathlon.or.kr/player/club/?sYear=${currentYear}&mode=view&clubcd=`;
    const fileName = `triathlon_club_${currentYear}.json`;
    
    const agent = new https.Agent({
        rejectUnauthorized: false
    });

    try {
        // 1. 목록 페이지에서 클럽 코드 추출
        const listResponse = await axios.get(baseUrl, { httpsAgent: agent });
        const $list = cheerio.load(listResponse.data);
        const clubCodes = [];

        $list('table.board_list tbody tr td.subject a').each((_, el) => {
            const onclick = $list(el).attr('onclick') || "";
            const match = onclick.match(/clubcd=(\d+)/);
            if (match) clubCodes.push(match[1]);
        });

        console.log(`${clubCodes.length}개의 클럽 데이터를 수집 시작합니다...`);

        const finalData = [];

        // 2. 각 클럽 상세 페이지 파싱
        for (const code of clubCodes) {
            const detailUrl = `${clubDetailBase}${code}`;
            const { data } = await axios.get(detailUrl, { httpsAgent: agent });
            const $ = cheerio.load(data);

            // [지역] 및 [클럽명] 추출: h4.has-btn 안의 "(서울) AlwaysTRI_CREW" 형태 파싱
            const fullTitle = $('h4.has-btn').text().replace('목록', '').trim();
            const regionMatch = fullTitle.match(/^\((.*?)\)/);
            const region = regionMatch ? regionMatch[1] : "";
            const clubName = fullTitle.replace(/^\((.*?)\)/, '').trim();

            // [회장] 및 [총무] 추출: em 태그 이후의 텍스트 노드 탐색
            let captain = "";
            let manager = "";
            $('th:contains("임원진")').next('td').find('p').contents().each((_, node) => {
                if (node.type === 'text') {
                    const text = $(node).text().trim();
                    const prevTag = $(node).prev('em').text().trim();
                    if (prevTag === '회장') captain = text;
                    if (prevTag === '총무') manager = text;
                }
            });

            // [클럽사이트] 추출
            const clubUrl = $('th:contains("클럽사이트")').next('td').text().trim();

            // [선수명단] 추출: 쉼표로 연결
            const memberList = [];
            $('ul.club_player li strong').each((_, el) => {
                memberList.push($(el).text().trim());
            });

            finalData.push({
                region: region,
                clubcd: code,
                club: clubName,
                captain: captain,
                manager: manager,
                url: clubUrl,
                members: memberList.join(', ')
            });

            console.log(`수집 완료: ${clubName}`);
        }



        // res.setHeader('Content-Type', 'application/json');
        // res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
        // return res.status(200).send(JSON.stringify(finalData, null, 2));

        // 3. JSON 파일 저장 및 반환
        fs.writeFileSync(fileName, JSON.stringify(finalData, null, 2), 'utf-8');
        console.log(`--------------------------------------`);
        console.log(`파일 저장 성공: ${fileName}`);
        
        // Express 환경을 가정할 경우: return res.status(200).send(JSON.stringify(finalData, null, 2));
        return finalData;

    } catch (error) {
        console.error('크롤링 에러:', error);
    }
}

crawlTriathlonClubs();