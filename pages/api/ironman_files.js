import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  // JSON 파일이 저장된 경로 (public/data/ironman)
  const dataDir = path.join(process.cwd(), 'public', 'data', 'ironman');

  try {
    // 디렉토리가 존재하는지 확인
    if (!fs.existsSync(dataDir)) {
      // 디렉토리가 없으면 빈 배열 반환 (에러 아님)
      return res.status(200).json([]);
    }

    // 디렉토리 내 파일 목록 읽기
    const files = fs.readdirSync(dataDir);

    // .json 파일만 필터링하고 필요한 정보로 매핑
    const jsonFiles = files
      .filter(file => path.extname(file).toLowerCase() === '.json')
      .map(file => {
        // 파일명에서 확장자 제거 및 언더바를 공백으로 변경하여 표시 이름 생성
        // 예: gurye_2024.json -> GURYE 2024
        const displayName = path.parse(file).name.replace(/_/g, ' ').toUpperCase();
        return { filename: file, displayName };
      });

    // JSON 응답 반환
    res.status(200).json(jsonFiles);
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ message: '파일 목록을 불러오는 중 오류가 발생했습니다.' });
  }
}