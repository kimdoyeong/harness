# Intent: 스캐폴딩 CLI
Author: Doyeong Kim (저장소 소유자). Status: approved (2026-11-25).

## Problem
새 프로젝트에서 `ai-sdlc`를 쓰려면 스킬 폴더와 문서 뼈대를 매번 손으로 복사해야 한다.

- 요청: "스캐폴딩을 위한 cli를 node와 pnpm으로 구성해줘."
- 불편한 점(인터뷰에서 고른 답): 매번 손으로 복사
- 현재 저장소에는 설치를 돕는 코드가 없다. `.claude/skills/ai-sdlc/`의 `SKILL.md`와 `templates.md`, `README.md`만 있다.

## Proposed outcome
대상 프로젝트에서 명령 한 줄을 실행하면 `ai-sdlc`를 쓸 준비가 끝난다. 준비에는 세 가지가 들어간다(인터뷰에서 고른 답).

1. 스킬 설치: `.claude/skills/ai-sdlc/`
2. docs 뼈대
3. `AGENTS.md` 뼈대

**성공 기준:**

- 빈 프로젝트 폴더에서 명령을 한 번 실행하면 위 세 가지가 만들어지고, 그 폴더에서 연 Claude Code에서 `/ai-sdlc`가 동작한다. 확인: 임시 폴더에서 실행한 뒤 파일 목록과 Claude Code의 스킬 목록.
- 같은 폴더에서 다시 실행하면 스킬 파일은 이 저장소의 최신 내용으로 바뀌고, docs와 `AGENTS.md`는 한 바이트도 바뀌지 않는다. 확인: 두 번째 실행 전후의 파일 해시 비교.

## Affected users and systems
- 쓰는 사람: 이 저장소를 clone한 본인. 로컬에서만 실행한다.
- 바뀌는 것: 이 저장소에 Node 패키지와 CLI가 생긴다. 실행하면 대상 프로젝트의 `.claude/skills/ai-sdlc/`, `docs/`, `AGENTS.md`에 파일을 쓴다.
- 외부 서비스: 없음.

## Constraints
- Node와 pnpm으로 만든다.
- npm 레지스트리에 게시하지 않는다.
- 이미 있는 파일 처리: 스킬 파일은 항상 덮어쓴다. docs와 `AGENTS.md`처럼 사용자가 고치는 파일은 건드리지 않는다.
- 지침 파일은 `AGENTS.md`만 만든다. `CLAUDE.md`는 만들지 않는다.
- 범위 밖: `docs/<branch_name>/intent.md` 같은 주기별 산출물 생성, 여러 스킬 중 골라 설치하는 기능.

## Open questions
Design에서 정할 것:

1. docs 뼈대에 정확히 무엇을 만드는가? (`docs/STATUS.md`, `docs/specs/` 등)
2. `AGENTS.md` 뼈대에 어떤 항목을 넣는가?
3. 로컬에서 "명령 한 줄"이 되게 하는 방법과 명령 이름은 무엇인가?
4. 스킬을 프로젝트(`.claude/skills/`)에만 설치하는가, 전역(`~/.claude/skills/`)도 지원하는가?
5. 건드리지 않고 건너뛴 파일을 어떻게 알려 주는가?
