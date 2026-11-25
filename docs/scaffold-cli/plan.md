# Plan: 스캐폴딩 CLI
Author: Doyeong Kim. Status: approved (2026-11-25). Spec: `docs/specs/cli.md` (approved 2026-11-25). Intent: `docs/scaffold-cli/intent.md`.

## 확인이 필요한 우려 사항
1. **spec의 링크 명령이 틀렸다.** 설치된 pnpm 12.21.0의 `pnpm link --help`에는 `--global` 옵션이 없다. `pnpm add --help`에는 `-g, --global`("Install the package globally, linking its bins into the global bin directory")이 있다. 따라서 spec의 `pnpm link --global`은 그대로 쓸 수 없다. 대신 쓸 명령이 저장소를 복사하는지 심볼릭 링크로 거는지는 실행해 봐야 안다. 복사하면 R6(원본을 고치면 다시 링크하지 않아도 반영)이 깨진다.
   - 제안: 4단계에서 `pnpm add --global link:<저장소 경로>`를 실행해 두 가지를 확인한다. `harness` 명령이 생기는가, 원본 `SKILL.md`를 고친 뒤 다시 설치하지 않아도 반영되는가. 결과에 맞춰 spec의 "처음 한 번" 명령을 고치고 다시 승인받는다. 둘 중 하나라도 안 되면 구현을 멈추고 대안(`PATH`에 있는 폴더에 `bin/harness.ts`의 심볼릭 링크를 직접 만드는 방법 등)을 가져온다.
2. **사용자가 직접 해야 하는 일이 있고, 4단계는 저장소 밖을 바꾼다.** pnpm 전역 bin 폴더(`/Users/doyeongkim/Library/pnpm/bin`)가 지금 `PATH`에 없다(`pnpm bin --global`이 `ERR_PNPM_GLOBAL_BIN_DIR_NOT_IN_PATH`로 끝난다). `pnpm setup`은 셸 설정 파일을 고치므로 사용자가 직접 실행해야 한다. 또 4단계의 전역 설치는 pnpm 전역 폴더에 파일을 만든다.
   - 제안: 1~3단계는 저장소 안에서만 진행한다. 4단계 직전에 멈추고, 사용자가 `pnpm setup`을 실행한 뒤 전역 설치 명령을 보여주고 따로 승인받는다. 이 계획의 승인은 전역 설치의 승인이 아니다.
3. **단계마다 브랜치를 나누지 않으려 한다.** 스킬은 구현 단계마다 브랜치를 나누라고 하지만, 이번 변경은 파일 여섯 개 안팎이고 단계가 순서대로 이어진다.
   - 제안: `scaffold-cli` 브랜치 하나에서 단계마다 커밋 하나씩 만든다. 각 커밋에 그 단계의 테스트를 넣는다.
2026-11-25 사용자 결정: 세 가지 모두 제안대로 한다.

2026-11-25 사용자 요청으로 변경: 3단계까지 JavaScript로 구현한 뒤 "타입스크립트로 짜주세요"라는 요청을 받아 TypeScript로 옮겼다. 빌드 단계는 두지 않는다. Node 22.18부터는 `.ts` 파일을 타입만 지우고 바로 실행하므로(설치된 v22.22.3에서 확인) `bin/harness.ts`를 그대로 실행한다. 그래서 `engines`는 `>=22.18`이 되고, spec의 "Node 22 이상"은 4단계에서 spec을 고칠 때 함께 고쳐 승인받는다. 아래 내용은 이 변경을 반영해 고쳤다.

## 구현 단계
공통: TypeScript로 쓰고, 실행에는 Node 내장 모듈만 쓴다(`node:fs`, `node:path`, `node:util`의 `parseArgs`, `node:test`, `node:assert`). ESM이고 빌드 단계는 없다. Node가 `.ts`를 바로 실행하므로 import 경로에 `.ts` 확장자를 쓰고, 타입만 지우면 되는 문법만 쓴다(`enum`, 생성자 매개변수 속성 등은 쓰지 않는다. `tsconfig.json`의 `erasableSyntaxOnly`가 막는다). 개발 의존성은 타입 검사용 `typescript`와 `@types/node` 둘뿐이다. 테스트는 모두 `os.tmpdir()` 아래에 만든 임시 폴더에서 돌리고 끝나면 지운다.

### 1. 패키지 뼈대와 명령 해석 (R9 일부)
- `package.json`: `"name": "harness"`, `"version": "0.1.0"`, `"private": true`(실수로 게시되지 않게), `"type": "module"`, `"bin": {"harness": "bin/harness.ts"}`, `"engines": {"node": ">=22.18"}`, `"packageManager": "pnpm@12.21.0"`, `"scripts": {"typecheck": "tsc", "test": "tsc && node --test --experimental-test-coverage --test-coverage-include='src/**' --test-coverage-lines=90 'test/*.test.ts'"}`. 타입 오류가 있거나 커버리지가 90% 아래면 `pnpm test`가 실패한다(구현 중 구체화).
- `bin/harness.ts`: 셔뱅(`#!/usr/bin/env node`)과 실행 권한. `src/cli.ts`의 `run()`을 부르고 반환값을 `process.exitCode`에 넣는 일만 한다. 원본 위치는 이 파일의 실제 경로 기준 `../.claude/skills/ai-sdlc`다. Node는 진입 파일의 심볼릭 링크를 실제 경로로 풀기 때문에 링크로 실행해도 저장소를 가리킨다.
- `src/cli.ts`: `run({argv, cwd, skillSourceDir, stdout, stderr})`가 종료 코드를 돌려준다. 인자가 없거나 `--help`면 사용법을 stdout에 쓰고 0. `init`이면 3단계까지는 미구현. 모르는 명령, 모르는 옵션, `init` 뒤의 추가 인자는 "알 수 없는 명령: <입력>"과 사용법을 stderr에 쓰고 1. 문구는 spec의 "사용법과 오류" 그대로다.
- `tsconfig.json`: `strict`, `noEmit`, `module: nodenext`, `allowImportingTsExtensions`, `erasableSyntaxOnly`, `verbatimModuleSyntax`. 대상은 `bin`, `src`, `test`.
- `.gitignore`에 `node_modules/`를 더한다.
- 테스트(`test/cli.test.ts`): `run()`을 직접 불러 인자 없음, `--help`, `foo`, `init --foo`, `init extra`의 출력과 종료 코드를 확인한다. `bin/harness.ts`를 자식 프로세스로 실행해 `--help`가 0, `foo`가 1로 끝나는지 확인한다.

### 2. init: 스킬 복사 (R1, R4의 스킬 부분, R5, R6, R8)
- `src/init.ts`: `init({targetDir, skillSourceDir})`가 `{path, status, note}` 목록을 돌려준다. 출력은 하지 않는다.
- 원본 폴더의 파일을 하위 폴더까지 이름순으로 훑는다. `.DS_Store`는 스킬의 일부가 아니므로 건너뛴다(구현 중 추가). 파일마다 원본 바이트를 읽고, 대상에 없으면 쓰고 `created`, 내용이 같으면 쓰지 않고 `unchanged`, 다르면 덮어쓰고 `updated`. 내용이 같으면 쓰지 않으므로 원본과 대상이 같은 폴더여도 안전하다(R8).
- 대상 스킬 폴더의 다른 파일과 다른 스킬 폴더는 읽지도 지우지도 않는다.
- `src/cli.ts`: `init`의 결과를 spec 예시의 형식으로 출력한다. 첫 줄 `harness init: <대상 절대 경로>`, 빈 줄, 상태를 10칸에 맞춘 줄들. `created`가 하나라도 있고 그중에 `AGENTS.md`가 있으면 끝에 "다음: …" 안내를 붙인다.
- 테스트(`test/init.test.ts`): 임시 원본 폴더와 임시 대상 폴더를 만들어 확인한다.
  - 빈 대상: 원본과 대상의 파일 목록과 SHA-256이 같다(R1). 실제 저장소의 `.claude/skills/ai-sdlc/`를 원본으로 한 번 더 확인한다.
  - 대상의 `SKILL.md`를 고치고 다시 실행: 원본 해시로 돌아오고 상태가 `updated`다(R4).
  - 원본 파일을 고치고 다시 실행: 대상이 바뀐다(R6).
  - 대상 스킬 폴더에 `my-notes.md`를 두고 실행: 그대로 남는다.
  - 원본과 대상이 같은 폴더: 모두 `unchanged`이고 해시가 그대로다(R8).

### 3. init: docs 뼈대, AGENTS.md, 안전장치 (R2, R3, R4, R5, R7, R9의 쓰기 실패)
- `src/templates.ts`:
  - `extractStatusTemplate(templatesMd)`: `## docs/STATUS.md` 줄을 찾고, 그 뒤 첫 ` ``` ` 줄과 다음 ` ``` ` 줄 사이를 돌려준다(끝에 줄바꿈 하나). 제목 줄이나 코드 블록이 없으면 오류를 던진다. 입력은 원본의 `templates.md`다.
  - `AGENTS_MD`: spec의 "생성되는 `AGENTS.md`" 내용 그대로인 문자열.
- `src/init.ts`에 스킬 복사 다음 순서로 더한다.
  - `docs/STATUS.md`: 없으면 만들고 `created`, 있으면 `skipped`와 "이미 있음".
  - `docs/specs/`, `docs/archive/`: 폴더가 없으면 만들고 그 안에 빈 `.gitkeep`을 써서 `created docs/specs/.gitkeep`. 폴더가 있으면 아무것도 하지 않고 `skipped docs/specs/`와 "이미 있음".
  - `AGENTS.md`: `docs/STATUS.md`와 같은 규칙.
  - 건너뛰는 파일은 열지도 않는다. 수정 시각이 바뀌지 않아야 한다.
- 안전장치(R7): 쓰기 전에 목적지 경로가 대상 폴더 아래인지 확인한다. 이미 있는 가장 가까운 상위 폴더의 실제 경로(`realpath`)가 대상 폴더의 실제 경로 밖이면 쓰지 않고 오류로 끝낸다. 대상 안의 심볼릭 링크를 타고 밖에 쓰는 일을 막는다.
- 쓰기 실패(R9): 실패하면 그때까지의 결과를 출력하고, stderr에 "쓰지 못했습니다: <경로> (<이유>)"를 쓰고 1로 끝낸다. 이미 쓴 파일은 되돌리지 않는다.
- 테스트:
  - 빈 대상: 세 파일과 `AGENTS.md`가 생기고 내용이 기대와 같다(R2, R3). `docs/STATUS.md`는 실제 `templates.md`에서 뽑은 내용과 같다.
  - `docs/specs/a.md`가 있는 대상: `docs/specs/.gitkeep`이 생기지 않는다(R2).
  - `docs/STATUS.md`와 `AGENTS.md`를 고치고 다시 실행: 내용과 `mtimeMs`가 그대로다(R4).
  - 첫 실행과 두 번째 실행의 전체 출력이 spec 예시와 같다. 경로 줄만 임시 폴더 경로로 바꿔 비교한다(R5).
  - 결과의 모든 경로가 대상 폴더 아래다. 대상의 `.claude`를 바깥 폴더를 가리키는 심볼릭 링크로 만들면 오류로 끝나고 바깥에 파일이 생기지 않는다(R7).
  - `chmod 555`한 대상: 종료 코드 1, stderr에 경로와 이유(R9).
  - `extractStatusTemplate`: 제목이 없는 입력과 코드 블록이 없는 입력에서 오류.

### 4. 전역 설치 확인과 spec 수정 (R6 수동) — 따로 승인받는다
- 우려 사항 1, 2의 절차대로 한다. 사용자가 `pnpm setup`을 실행한 뒤, 전역 설치 명령을 보여주고 승인받아 실행한다.
- 임시 폴더에서 `harness init`을 실행해 출력을 남긴다. 원본 `SKILL.md`에 한 줄을 더하고 다시 실행해 `updated`가 나오는지 본 뒤 원본을 되돌린다.
- `docs/specs/cli.md`의 "처음 한 번" 명령과 결정 사항의 전역 링크 항목을 확인한 명령으로 고치고, 바꾼 이유를 한 줄 남겨 다시 승인받는다.

4단계 결과(2026-11-25): 사용자가 `pnpm setup`과 설치 명령을 직접 실행했다. `pnpm add --global link:<저장소 경로>`로 `harness` 명령이 생겼고, pnpm 전역 폴더의 `node_modules/harness`는 저장소를 가리키는 링크라서 `.ts`가 그대로 실행됐다. 임시 폴더에서 첫 실행은 모두 `created`, 원본 `SKILL.md`에 한 줄을 더한 뒤에는 `updated`가 나왔고, 원본은 `git checkout`으로 되돌렸다.

### 5. README (R10)와 수동 확인 (R11)
- `README.md`에 "설치" 절(처음 한 번 하는 명령, `pnpm setup` 안내)과 "사용" 절(`harness init`, 만들어지는 파일, 다시 실행했을 때 덮어쓰는 것과 건드리지 않는 것), "개발" 절(`pnpm test`)을 쓴다. `README.md`를 이 브랜치에서 처음 커밋한다.
- R10: 새 임시 폴더에서 `README.md`의 명령을 그대로 따라 한다.
- R11: 임시 폴더를 준비해 경로를 알려 주면 사용자가 그 폴더에서 Claude Code를 열어 `/ai-sdlc`를 실행해 본다.

## 바뀌는 파일
| 파일 | 변경 | 단계 |
|---|---|---|
| `package.json` | 새로 만듦 | 1 |
| `.gitignore` | `node_modules/` 추가 | 1 |
| `bin/harness.ts` | 새로 만듦 | 1 |
| `src/cli.ts` | 새로 만듦 | 1, 2, 3 |
| `src/init.ts` | 새로 만듦 | 2, 3 |
| `src/templates.ts` | 새로 만듦 | 3 |
| `test/cli.test.ts`, `test/init.test.ts` | 새로 만듦 | 1, 2, 3 |
| `test/helpers.ts` | 새로 만듦. 두 테스트 파일이 같이 쓰는 임시 폴더, 해시 도구(구현 중 추가) | 2 |
| `docs/specs/cli.md` | 링크 명령 수정(재승인) | 4 |
| `README.md` | 설치, 사용, 개발 절. 첫 커밋 | 5 |
| `tsconfig.json` | 새로 만듦 | TypeScript 전환 |
| `pnpm-lock.yaml` | `pnpm install`이 만들면 커밋 | 1 |

`.claude/skills/ai-sdlc/`의 파일은 고치지 않는다.

## 리스크
- **전역 설치가 저장소를 복사한다:** R6이 깨진다. 4단계에서 실제로 확인하고, 깨지면 멈춘다(우려 사항 1).
- **`templates.md`의 양식 위치가 바뀐다:** `## docs/STATUS.md` 제목이나 코드 블록이 바뀌면 `harness init`이 오류로 끝난다. 실제 `templates.md`로 추출하는 테스트가 있어서 `pnpm test`에서 먼저 드러난다. 버린 대안: CLI에 `STATUS.md` 사본을 두는 방법. 같은 양식이 두 곳에 생겨서 spec 결정에서 버렸다.
- **묻지 않고 덮어쓴다:** 대상에서 스킬을 고친 내용이 사라진다. spec에서 결정한 동작이고 출력의 `updated`로 드러난다.
- **중간에 실패하면 일부만 만들어진다:** 되돌리지 않는다. 다시 실행하면 남은 것만 만들어지므로 그대로 둔다.
- **`chmod 555` 테스트는 root로 돌리면 통과하지 못한다:** 쓰기가 성공하기 때문이다. root면 그 테스트를 건너뛴다.
- **버린 대안, 인자 해석 라이브러리(commander 등):** 명령이 `init` 하나라서 `parseArgs`로 충분하다. 의존성이 없으면 설치와 링크가 단순해지고 네트워크를 쓰는 코드가 없다는 R7의 검토도 쉬워진다.
- **빌드 없는 TypeScript는 Node 22.18 이상에서만 돈다:** 더 낮은 Node에서는 `.ts`를 실행하지 못한다. `engines`에 적고 README에 쓴다. 또 Node는 `node_modules` 아래의 `.ts`는 실행하지 않으므로, 전역 설치가 저장소를 복사하면 명령 자체가 돌지 않는다. 링크면 실제 경로가 저장소라서 괜찮다. 4단계에서 함께 확인한다.
- **버린 대안, `tsc`로 `dist/`에 빌드:** CLI 코드를 고칠 때마다 빌드해야 하고, 빌드를 잊으면 예전 코드가 돈다.

## 되돌리는 방법
운영에 배포하는 것은 없다. 되돌릴 수 없는 변경도 없다.

- 코드: `main`에 머지하기 전이면 브랜치를 버린다. 머지한 뒤면 `git revert -m 1 <머지 커밋>`.
- 전역 설치: `pnpm remove --global harness`.
- `pnpm setup`이 셸 설정 파일에 더한 줄: 사용자가 그 줄을 지운다.
- 대상 프로젝트에 만든 파일: `.claude/skills/ai-sdlc/`, `docs/STATUS.md`, `docs/specs/.gitkeep`, `docs/archive/.gitkeep`, `AGENTS.md`를 지운다. 대상이 git 저장소면 `git status`로 새로 생긴 파일을 볼 수 있다.

## 성공 기준
- spec의 R1~R11 확인 방법을 모두 통과한다. R1~R9는 자동 테스트, R6의 수동 부분과 R10, R11은 수동이다.
- `pnpm test`가 실패 0으로 끝나고, `src/`의 줄 커버리지가 90% 이상이다.
- 남길 증거: `pnpm test`의 전체 출력, 4단계의 임시 폴더 실행 출력(첫 실행, 원본 수정 뒤 다시 실행). 사용자에게 보내는 보고에 붙인다.
- 배포 뒤 intent의 성공 기준 확인: 실제로 쓰는 프로젝트 하나에서 `harness init`을 실행하고 `/ai-sdlc`가 동작하는지, 다시 실행해 `docs/`와 `AGENTS.md`가 그대로인지 본다.
