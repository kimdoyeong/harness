# AGENTS.md

## 작업 방식
새 기능과 변경은 ai-sdlc 스킬을 따른다.
산출물은 docs/ 에 둔다.

## 스킬
스킬을 만들거나 고칠 때는 Claude Code용 `.claude/skills/<이름>/`과 Codex용 `.agents/skills/<이름>/`에 같은 내용으로 둘 다 둔다.

`harness init`이 복사하는 원본은 `.claude/skills/ai-sdlc/`다. `.agents/skills/ai-sdlc/`는 그 사본이고, 두 폴더의 내용이 다르면 `pnpm test`가 실패한다.

## 명령
| 목적 | 명령 |
|---|---|
| 설치 | `pnpm install` |
| 테스트 | `pnpm test` (타입 검사, 린트, 테스트. `src/` 줄 커버리지가 90% 아래면 실패한다) |
| 타입 검사만 | `pnpm typecheck` |
| 린트만 | `pnpm lint` |
| 빌드 | 없음. Node가 TypeScript를 바로 실행한다 |
| 배포 | 없음. npm에 게시하지 않고 `pnpm add --global link:"$PWD"`로 링크해 쓴다 |
| 모델 평가 | 없음 |

## 코드 규칙
- 코드에 주석을 쓰지 않는다. ESLint의 `local/no-comments` 규칙이 `bin/harness.ts`의 셔뱅을 뺀 모든 주석을 오류로 잡는다.
- CLI의 요구사항은 `docs/specs/cli.md`에 있다. 출력, 도움말, 생성되는 `AGENTS.md`의 내용을 바꾸면 spec의 예시도 같이 고친다. 테스트가 `src/templates.ts`의 `AGENTS_MD`를 spec의 코드 블록과 비교한다.
- 사용자에게 보이는 문구와 문서는 한국어로 쓴다.
