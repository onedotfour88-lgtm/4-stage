import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * 2단계 공격 및 보안 상태 점검 함수
 * - 각 결과 객체는 attackId, expected, observed 속성만 포함합니다.
 */
export async function runAttackChecks() {
  const checks = [];

  // 1. 공개 data.json 파일 빈 배열 검사
  try {
    const dataJsonPath = path.resolve('public/data.json');
    const dataContent = await fs.readFile(dataJsonPath, 'utf8');
    const parsed = JSON.parse(dataContent);
    const isEmpty = Array.isArray(parsed) && parsed.length === 0;

    checks.push({
      attackId: 'check-data-json-empty',
      expected: 'data.json이 빈 배열([])이어야 합니다.',
      observed: isEmpty ? 'data.json이 빈 배열([])입니다.' : 'data.json에 메모 데이터가 남아있습니다.'
    });

    // 2. 민감 가상 메모 키워드 검색
    const sensitiveKeywords = [
      '프로젝트 일정 점검',
      '서버 인프라 점검',
      '팀 내부 미팅 공유',
      '보안 점검 사항'
    ];

    const leakedKeyword = sensitiveKeywords.find(keyword => dataContent.includes(keyword));

    checks.push({
      attackId: 'check-sensitive-keyword-leak',
      expected: '정적 파일 내 민감 키워드가 검색되지 않아야 합니다.',
      observed: leakedKeyword ? `민감 키워드 발견: ${leakedKeyword}` : '정적 파일 내 민감 키워드가 없습니다.'
    });
  } catch (err) {
    checks.push({
      attackId: 'check-data-json-missing',
      expected: '공개 data.json에 메모가 노출되지 않아야 합니다.',
      observed: 'data.json 파일이 없거나 읽을 수 없어 노출되지 않습니다.'
    });
  }

  // 3. Vercel Serverless API (/api/memos) 존재 검사
  try {
    const apiMemoPath = path.resolve('api/memos.js');
    await fs.access(apiMemoPath);
    checks.push({
      attackId: 'check-api-memos-exists',
      expected: 'api/memos.js 파일이 존재해야 합니다.',
      observed: 'api/memos.js 파일이 정상 존재합니다.'
    });
  } catch (err) {
    checks.push({
      attackId: 'check-api-memos-exists',
      expected: 'api/memos.js 파일이 존재해야 합니다.',
      observed: 'api/memos.js 파일을 찾을 수 없습니다.'
    });
  }

  // 4. aleph.json 파일 보존 검사
  try {
    const alephJsonPath = path.resolve('public/aleph.json');
    await fs.access(alephJsonPath);
    checks.push({
      attackId: 'check-aleph-json-exists',
      expected: 'public/aleph.json 파일이 생성 및 보존되어야 합니다.',
      observed: 'aleph.json 파일이 정상 보존되어 있습니다.'
    });
  } catch (err) {
    checks.push({
      attackId: 'check-aleph-json-exists',
      expected: 'public/aleph.json 파일이 생성 및 보존되어야 합니다.',
      observed: 'aleph.json 파일이 손실되었습니다.'
    });
  }

  return checks;
}

export default runAttackChecks;