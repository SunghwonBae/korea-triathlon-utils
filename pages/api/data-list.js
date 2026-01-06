import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
    const dataDir = path.join(process.cwd(), 'public', 'data');
    try {
        const files = fs.readdirSync(dataDir)
            .filter(file => file.endsWith('.json'))
            .map(file => ({
                name: file.replace('.json', '').replace(/_/g, ' '), // 파일명에서 언더바를 공백으로
                url: `/data/${file}`
            }));
        res.status(200).json(files);
    } catch (e) {
        res.status(200).json([]);
    }
}