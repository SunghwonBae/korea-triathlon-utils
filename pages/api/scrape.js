import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';

export const config = {
  maxDuration: 60,
};

export default async function handler(req, res) {
  const { bib, urlTemplate } = req.query;

  if (!bib || !urlTemplate) {
    return res.status(400).json({ error: 'Bib and urlTemplate are required' });
  }

  const targetUrl = urlTemplate.replace('{bib}', bib);
  let browser = null;

  try {
    // 그래픽 가속 비활성화 (필수)
    chromium.setGraphicsMode = false;

    // Vercel 환경에 최적화된 실행 경로 가져오기
    const executablePath = await chromium.executablePath();

    browser = await puppeteer.launch({
      args: [
        ...chromium.args,
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--single-process', 
        '--disable-features=site-per-process' // 추가된 안정성 옵션
      ],
      defaultViewport: chromium.defaultViewport,
      executablePath: executablePath,
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
    });

    const page = await browser.newPage();

    // 리소스 차단 (속도 최적화)
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const type = req.resourceType();
      if (['image', 'stylesheet', 'font', 'media'].includes(type)) {
        req.abort();
      } else {
        req.continue();
      }
    });

    // 접속
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