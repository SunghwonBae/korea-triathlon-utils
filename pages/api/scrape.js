import chromium from '@sparticuz/chromium-min';
import puppeteer from 'puppeteer-core';

export const config = {
  maxDuration: 60, // 최대 실행 시간 확보
};

export default async function handler(req, res) {
  const { bib, urlTemplate } = req.query;

  if (!bib || !urlTemplate) {
    return res.status(400).json({ error: 'Bib and urlTemplate are required' });
  }

  const targetUrl = urlTemplate.replace('{bib}', bib);
  let browser = null;

  try {
    // ------------------------------------------------------------------
    // 핵심 변경점: 크롬 바이너리를 원격(GitHub)에서 다운로드하여 사용
    // ------------------------------------------------------------------
    // Vercel 환경인지 확인 (로컬에서는 다운로드 안 함)
    const isProduction = process.env.NODE_ENV === 'production';
    
    // Node 20 호환 바이너리 URL (v129)
    // 이 URL의 파일이 /tmp 폴더로 다운로드되어 실행됩니다.
    const remoteExecutablePath = 'https://github.com/Sparticuz/chromium/releases/download/v129.0.0/chromium-v129.0.0-pack.tar';

    const executablePath = isProduction
      ? await chromium.executablePath(remoteExecutablePath)
      : process.platform === 'win32'
        ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
        : '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

    browser = await puppeteer.launch({
      args: isProduction ? chromium.args : [],
      defaultViewport: chromium.defaultViewport,
      executablePath: executablePath,
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
    });

    const page = await browser.newPage();

    // 리소스 차단 (속도 최적화)
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      if (['image', 'stylesheet', 'font', 'media'].includes(req.resourceType())) {
        req.abort();
      } else {
        req.continue();
      }
    });

    // 페이지 접속
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });

    // Race Splits 대기
    try {
        await page.waitForSelector('h3', { timeout: 4000 });
    } catch(e) {}

    // 데이터 추출
    const data = await page.evaluate(() => {
        let result = { 
            name: 'Unknown', 
            swim: '-', t1: '-', bike: '-', t2: '-', run: '-', total: 'DNS/DNF' 
        };
        
        const nameEl = document.querySelector('h1');
        if (nameEl) result.name = nameEl.innerText.trim();
        
        const headings = Array.from(document.querySelectorAll('h3'));
        const splitHeader = headings.find(h => h.innerText.includes('Race Splits'));
        
        if (splitHeader) {
            const rows = Array.from(document.querySelectorAll('.row.mx-0'));
            let transitionCount = 0;

            rows.forEach(row => {
                const text = row.innerText;
                const cols = row.querySelectorAll('.col');
                if (cols.length === 0) return;
                
                const timeVal = cols[cols.length - 1].innerText.replace(/\n/g, '').trim();
                if (!timeVal || timeVal === '--') return;

                if (text.includes('Swim')) result.swim = timeVal;
                else if (text.includes('Bike') || text.includes('Cycle')) result.bike = timeVal;
                else if (text.includes('Run')) result.run = timeVal;
                else if (text.includes('Transition')) {
                    transitionCount++;
                    if (transitionCount === 1) result.t1 = timeVal;
                    else if (transitionCount === 2) result.t2 = timeVal;
                } else if (text.includes('Full Course') || text.includes('Finish')) {
                    result.total = timeVal;
                }
            });
        }
        return result;
    });

    res.status(200).json({ bib, ...data });

  } catch (error) {
    console.error('Scraping Error:', error);
    res.status(500).json({ 
        error: 'Failed to scrape', 
        details: error.message 
    });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}