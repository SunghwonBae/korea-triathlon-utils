const fs = require('fs');

// 파일 경로 설정
const filePath = 'c:\\korea-triathlon-utils\\public\\data\\all_records_v2.json';

try {
  // 파일 읽기
  const fileContent = fs.readFileSync(filePath, 'utf8');
  const jsonData = JSON.parse(fileContent);

  // 필터링: rn이 ironman-gurye_2017 또는 ironman-gurye_2018이 아닌 항목만 유지
  const filteredData = jsonData.filter(item => 
    item.rn !== 'ironman-gurye_2017' && item.rn !== 'ironman-gurye_2018'
  );

  // 파일 쓰기
  fs.writeFileSync(filePath, JSON.stringify(filteredData, null, 2), 'utf8');
  
  console.log(`처리 완료. 총 ${jsonData.length}개 중 ${jsonData.length - filteredData.length}개의 레코드가 삭제되었습니다.`);

} catch (error) {
  console.error('파일 처리 중 오류가 발생했습니다:', error);
}