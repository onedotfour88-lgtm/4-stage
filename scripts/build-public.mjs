import fs from 'node:fs/promises';
import path from 'node:path';

async function build() {
  const publicDir = path.resolve('public');
  await fs.mkdir(publicDir, { recursive: true });

  // aleph.json 자동 생성 및 보존 (지우지 않음)
  const alephData = {
    name: "aleph-config",
    builtAt: new Date().toISOString()
  };
  await fs.writeFile(path.join(publicDir, 'aleph.json'), JSON.stringify(alephData, null, 2));

  // data.json 메모 제거 및 빈 배열 유지
  await fs.writeFile(path.join(publicDir, 'data.json'), JSON.stringify([], null, 2));

  console.log('Public build completed: aleph.json generated and data.json cleared.');
}

build().catch((err) => {
  console.error('Build failed:', err);
  process.exit(1);
});