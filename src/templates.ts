export const AGENTS_MD = `# AGENTS.md

## 작업 방식
새 기능과 변경은 ai-sdlc 스킬을 따른다.
산출물은 docs/ 에 둔다.

## 명령
| 목적 | 명령 |
|---|---|
| 설치 | <TODO> |
| 테스트 | <TODO> |
| 빌드 | <TODO> |
| 배포 | <TODO> |
| 모델 평가 | <TODO 또는 없음> |
`;

const STATUS_HEADING = '## docs/STATUS.md';

export function extractStatusTemplate(templatesMd: string): string {
  const lines = templatesMd.split(/\r?\n/);
  const heading = lines.findIndex((line) => line.trimEnd() === STATUS_HEADING);
  if (heading === -1) {
    throw new Error(`templates.md에서 "${STATUS_HEADING}" 절을 찾지 못했습니다.`);
  }

  let open = -1;
  for (let i = heading + 1; i < lines.length; i += 1) {
    if (open === -1 && lines[i].startsWith('## ')) break;
    if (!lines[i].startsWith('```')) continue;
    if (open === -1) {
      open = i;
    } else {
      return `${lines.slice(open + 1, i).join('\n')}\n`;
    }
  }
  throw new Error(`templates.md의 "${STATUS_HEADING}" 절에서 코드 블록을 찾지 못했습니다.`);
}
