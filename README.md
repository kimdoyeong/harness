# harness

AI 코딩 에이전트와 일할 때 쓰는 스킬 모음이다. 지금은 `ai-sdlc` 스킬 하나가 들어 있다.

## ai-sdlc

기능 하나를 Plan, Design, Build, Test, Deploy, Maintain 여섯 단계로 나눠 진행하게 하는 스킬이다. [Claude Code](https://claude.com/claude-code)와 Codex에서 쓴다. 각 단계는 산출물 하나를 커밋하면서 끝나고, 다음 단계는 그 산출물을 읽으면서 시작한다. 판단이 필요한 결정은 모두 사용자가 내린다.

| 단계 | 남기는 것 | 사용자가 결정하는 것 |
|---|---|---|
| Plan | `docs/<branch_name>/intent.md` | 의도가 맞는지 |
| Design | `docs/specs/<spec_name>.md`, 목업 | 요구사항과 디자인 |
| Build | `docs/<branch_name>/plan.md`, 코드와 테스트 | 계획과 우려 사항 |
| Test | 테스트 출력 | 없음. 결과를 보고받는다 |
| Deploy | 머지, 릴리스 | 운영에 닿는 모든 실행 |
| Maintain | `docs/STATUS.md`, 다음 `intent.md` | 지금 고칠지, 미룰지, 닫을지 |

버그 수정이나 문구 수정처럼 의도와 요구사항이 바뀌지 않는 변경은 Plan과 Design을 건너뛰는 "작은 변경" 절차를 따른다.

스킬은 절차만 정한다. 테스트, 빌드, 배포에 쓰는 실제 명령은 스킬을 쓰는 프로젝트의 `AGENTS.md`나 `CLAUDE.md`, README에 적어 둔다.

### 파일

- [`.claude/skills/ai-sdlc/SKILL.md`](.claude/skills/ai-sdlc/SKILL.md): 단계별 절차와 공통 규칙
- [`.claude/skills/ai-sdlc/templates.md`](.claude/skills/ai-sdlc/templates.md): `intent.md`, `spec.md`, `plan.md`, `STATUS.md` 양식
- `.agents/skills/ai-sdlc/`: Codex가 읽는 사본. 위 두 파일과 내용이 같아야 하며 `pnpm test`가 확인한다. 스킬을 고치면 두 폴더를 함께 고친다.

### 사용

Claude Code에서는 `/ai-sdlc`, Codex에서는 `$ai-sdlc`를 입력하거나, 새 기능을 시작하거나 배포하려고 할 때 에이전트가 스스로 읽는다. 처음에는 Plan 단계부터 시작해 브랜치를 만들고 사용자를 인터뷰한다.

## harness CLI

프로젝트에 `ai-sdlc`를 쓸 준비를 한 줄로 끝내는 명령이다. npm에 게시하지 않으며, 이 저장소를 clone한 컴퓨터에서 링크해 쓴다.

### 설치 (처음 한 번)

Node 22.18 이상(23.0~23.5 제외)과 pnpm이 필요하다. CLI는 TypeScript를 빌드 없이 실행한다.

```sh
git clone https://github.com/kimdoyeong/harness.git
cd harness
pnpm install
pnpm add --global link:"$PWD"
```

`ERR_PNPM_GLOBAL_BIN_DIR_NOT_IN_PATH` 오류가 나면 `pnpm setup`을 실행하고 터미널을 새로 연 뒤 마지막 줄을 다시 실행한다.

링크로 설치되므로 저장소의 스킬이나 CLI 코드를 고치면 다시 설치하지 않아도 바로 반영된다. 지울 때는 `pnpm remove --global harness`.

### 사용

대상 프로젝트 폴더에서 실행한다.

```sh
cd ~/some-project
harness init
```

```
harness init: /Users/me/some-project

  created    .claude/skills/ai-sdlc/SKILL.md
  created    .claude/skills/ai-sdlc/templates.md
  created    .agents/skills/ai-sdlc/SKILL.md
  created    .agents/skills/ai-sdlc/templates.md
  created    docs/STATUS.md
  created    docs/specs/.gitkeep
  created    docs/archive/.gitkeep
  created    AGENTS.md

다음: AGENTS.md의 <TODO>에 실제 명령을 적고, Claude Code에서 /ai-sdlc, Codex에서 $ai-sdlc 를 실행하세요.
```

다시 실행하면 스킬만 최신으로 맞춘다.

| 대상 | 다시 실행했을 때 |
|---|---|
| `.claude/skills/ai-sdlc/`와 `.agents/skills/ai-sdlc/`의 파일 중 저장소에 있는 것 | 저장소 내용으로 덮어쓴다. 대상에서 고친 내용은 묻지 않고 사라지며 `updated`로 표시된다. |
| 스킬 폴더에 직접 더한 파일, 다른 스킬 폴더 | 건드리지 않는다. |
| `docs/STATUS.md`, `AGENTS.md` | 이미 있으면 건드리지 않는다(`skipped`). |
| `docs/specs/`, `docs/archive/` | 폴더가 이미 있으면 아무것도 만들지 않는다(`skipped`). |

현재 폴더 밖에는 쓰지 않는다. 파일을 쓰지 못하면 그때까지 한 일을 출력하고 종료 코드 1로 끝난다.

### 개발

```sh
pnpm test        # 타입 검사, 린트, 테스트. src/ 줄 커버리지가 90% 아래면 실패한다
pnpm typecheck   # 타입 검사만
pnpm lint        # 린트만
```

코드에 주석을 쓰지 않는다. ESLint의 `local/no-comments` 규칙(`eslint.config.js`)이 `bin/harness.ts`의 셔뱅을 뺀 모든 주석을 오류로 잡는다.

요구사항은 [`docs/specs/cli.md`](docs/specs/cli.md)에 있다.
