# Spec: cli
Author: Doyeong Kim. Status: approved (2026-11-25). Intent: `docs/scaffold-cli/intent.md` (approved 2026-11-25).
Mockup: 없음. 화면이 없는 CLI라서 아래 "화면과 인터페이스"에 입력과 출력의 예시를 적는다.

## 우려 사항
사용자가 결정해야 하는 것. 결정되면 아래로 옮긴다.

없음. 다섯 가지 모두 결정되어 아래로 옮겼다.

## 결정 사항
2026-11-25 사용자가 승인한 결정.

- docs 뼈대는 `docs/STATUS.md`, `docs/specs/.gitkeep`, `docs/archive/.gitkeep`이다.
- `AGENTS.md`는 명령 중심 최소 구성이다(내용은 아래 "화면과 인터페이스").
- 실행 방법은 harness 폴더에서 한 번 전역 링크한 뒤 대상 프로젝트에서 `harness init`이다.
- 스킬은 대상 프로젝트의 `.claude/skills/ai-sdlc/`에만 설치한다. 전역(`~/.claude/skills/`) 설치는 지원하지 않는다.
- 스킬 덮어쓰기의 범위(우려 사항 1): 원본에 있는 파일만 대상에 넣는다. 이름이 같은 파일은 대상에서 고쳤더라도 묻지 않고 덮어쓰고 출력에 `updated`로 표시한다. 원본에 없는 파일과 다른 스킬 폴더는 건드리지 않으며, 원본에서 지워진 예전 파일도 대상에서 지우지 않는다.
- 전역 링크(우려 사항 2): 링크는 사용자가 직접 한 번 한다. pnpm의 전역 bin 폴더가 `PATH`에 있어야 하고, 없으면 `pnpm setup`을 실행한다. 설치된 pnpm 12.21.0에서 명령이 정확히 `pnpm link --global`인지는 아직 확인하지 않았다. Build에서 문서와 실제 실행으로 확인하고, 다르면 이 spec의 명령을 고쳐 다시 승인받는다.
- `STATUS.md` 뼈대의 원본(우려 사항 3): CLI는 사본을 따로 두지 않는다. 실행할 때 `templates.md`의 `docs/STATUS.md` 코드 블록을 읽어 그대로 쓰고, 그 블록을 찾지 못하면 오류로 끝낸다.
- `README.md`(우려 사항 4): 링크 절차와 사용법을 적는 일을 이번 범위에 넣는다(R10). `README.md`의 첫 커밋도 `scaffold-cli` 브랜치에서 한다.
- Node 최소 버전(우려 사항 5): `package.json`의 `engines`를 Node 22 이상으로 둔다.
- 영역 이름: 이 spec의 `<spec_name>`은 `cli`다.

## 현재 상태
코드에서 확인한 사실(2026-11-25, 브랜치 `scaffold-cli`).

- 추적되는 파일은 `.gitignore`, `.claude/skills/ai-sdlc/SKILL.md`, `.claude/skills/ai-sdlc/templates.md`, `docs/scaffold-cli/intent.md`다.
- `README.md`는 있지만 커밋되지 않았다.
- `package.json`이 없다. Node 코드와 테스트가 없다.
- `docs/STATUS.md`와 `AGENTS.md`가 없다.
- 설치된 도구는 Node v22.22.3, pnpm 12.21.0이다.
- `templates.md`의 `## docs/STATUS.md` 절 아래 코드 블록에 `STATUS.md` 양식이 있다.

## 요구사항
"대상"은 `harness init`을 실행한 현재 폴더다. "원본"은 이 저장소의 `.claude/skills/ai-sdlc/`다.

| ID | 요구사항 | 확인 방법 |
|---|---|---|
| R1 | `harness init`은 대상의 `.claude/skills/ai-sdlc/`에 원본의 모든 파일을 같은 내용으로 만든다. | 자동 테스트: 빈 임시 폴더에서 실행한 뒤 원본과 대상의 파일 목록과 해시가 같다. |
| R2 | `docs/STATUS.md`, `docs/specs/.gitkeep`, `docs/archive/.gitkeep`을 만든다. `docs/specs/`나 `docs/archive/`가 이미 있으면 그 폴더에는 아무것도 만들지 않는다. | 자동 테스트: 빈 폴더에서 세 파일이 생긴다. `docs/specs/a.md`가 있는 폴더에서는 `docs/specs/.gitkeep`이 생기지 않는다. |
| R3 | `AGENTS.md`를 아래 "화면과 인터페이스"의 내용으로 만든다. | 자동 테스트: 생성된 파일이 기대 내용과 같다. |
| R4 | 다시 실행하면 스킬 파일은 원본 내용이 되고, `docs/` 아래 파일과 `AGENTS.md`는 바뀌지 않는다. | 자동 테스트: 첫 실행 뒤 대상의 `SKILL.md`, `docs/STATUS.md`, `AGENTS.md`를 고치고 다시 실행한다. `SKILL.md`는 원본 해시로 돌아오고, 나머지 둘은 고친 내용과 수정 시각이 그대로다. |
| R5 | 다룬 파일마다 한 줄씩 상태를 출력한다: `created`, `updated`, `unchanged`, `skipped`. 성공하면 종료 코드는 0이다. | 자동 테스트: 첫 실행과 두 번째 실행의 출력과 종료 코드가 아래 예시와 같다. |
| R6 | 스킬은 실행할 때 원본에서 읽는다. 원본을 고친 뒤 다시 링크하거나 빌드하지 않아도 다음 `harness init`에 반영된다. | 자동 테스트: 원본 위치를 임시 폴더로 바꿔 실행하고, 원본 파일을 고친 뒤 다시 실행하면 대상이 바뀐다. 수동: 링크된 상태에서 원본 `SKILL.md`를 고치고 대상에서 다시 실행한다. |
| R7 | 대상 폴더 밖에는 쓰지 않는다. 네트워크를 쓰지 않는다. | 자동 테스트: 쓰려는 경로가 모두 대상 폴더 아래다. 코드 검토: 네트워크를 쓰는 모듈과 의존성이 없다. |
| R8 | 대상이 이 저장소 자신이면 스킬 파일을 `unchanged`로 보고하고 내용을 망가뜨리지 않는다. | 자동 테스트: 원본과 대상이 같은 폴더인 상태로 실행한 뒤 스킬 파일 해시가 그대로다. |
| R9 | `harness`, `harness --help`는 사용법을 출력하고 0으로 끝난다. 모르는 명령이나 옵션은 사용법을 stderr에 출력하고 1로 끝난다. 파일을 쓰지 못하면 경로와 이유를 stderr에 출력하고 1로 끝난다. | 자동 테스트: 각 경우의 출력과 종료 코드. 쓰기 실패는 읽기 전용 폴더로 확인한다. |
| R10 | `README.md`에 처음 한 번 하는 링크 절차와 `harness init` 사용법, 다시 실행했을 때의 동작을 적는다. | 수동: `README.md`의 명령을 그대로 따라 해서 성공한다. |
| R11 | intent의 성공 기준: 빈 프로젝트에서 한 번 실행한 뒤 그 폴더의 Claude Code에서 `/ai-sdlc`가 동작한다. | 수동: 임시 폴더에서 `harness init` 뒤 Claude Code를 열어 `/ai-sdlc`를 실행한다. |

## 화면과 인터페이스

### 처음 한 번
```
cd <harness 저장소>
pnpm install
pnpm link --global      # Build에서 확인한다(결정 사항: 전역 링크)
```

### 빈 프로젝트에서 실행
```
$ cd ~/some-project
$ harness init
harness init: /Users/me/some-project

  created    .claude/skills/ai-sdlc/SKILL.md
  created    .claude/skills/ai-sdlc/templates.md
  created    docs/STATUS.md
  created    docs/specs/.gitkeep
  created    docs/archive/.gitkeep
  created    AGENTS.md

다음: AGENTS.md의 <TODO>에 실제 명령을 적고, Claude Code에서 /ai-sdlc 를 실행하세요.
$ echo $?
0
```

### 다시 실행 (원본 `SKILL.md`가 그사이 바뀐 경우)
```
$ harness init
harness init: /Users/me/some-project

  updated    .claude/skills/ai-sdlc/SKILL.md
  unchanged  .claude/skills/ai-sdlc/templates.md
  skipped    docs/STATUS.md (이미 있음)
  skipped    docs/specs/ (이미 있음)
  skipped    docs/archive/ (이미 있음)
  skipped    AGENTS.md (이미 있음)
$ echo $?
0
```

### 사용법과 오류
```
$ harness --help
사용법: harness init

  init    현재 폴더에 ai-sdlc 스킬, docs 뼈대, AGENTS.md를 만든다.
          스킬 파일은 항상 최신으로 덮어쓰고, 이미 있는 docs와 AGENTS.md는 건드리지 않는다.

$ harness foo
알 수 없는 명령: foo
사용법: harness init
$ echo $?
1
```

### 생성되는 `AGENTS.md`
```
# AGENTS.md

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
```

### 생성되는 `docs/STATUS.md`
`templates.md`의 `docs/STATUS.md` 양식 그대로다. 실행할 때 그 코드 블록을 읽어 쓴다.

## 범위 밖
- npm 레지스트리 게시, GitHub에서 바로 실행하는 방식.
- 전역(`~/.claude/skills/`) 설치.
- `CLAUDE.md` 생성.
- `docs/<branch_name>/intent.md` 같은 주기별 산출물 생성.
- 여러 스킬 중 골라 설치하는 기능.
- 대상 경로를 인자로 받는 기능, `--dry-run`, `--force` 같은 옵션.
- 대상의 스킬 폴더에서 원본에 없는 파일을 지우는 일.
