import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

const noComments = {
  meta: {
    type: 'suggestion',
    docs: { description: 'Disallow comments' },
    schema: [],
    messages: { found: '주석을 쓰지 않는다. 이름과 구조로 뜻을 드러낸다.' },
  },
  create(context) {
    return {
      Program() {
        for (const comment of context.sourceCode.getAllComments()) {
          if (comment.type === 'Shebang') continue;
          context.report({ loc: comment.loc, messageId: 'found' });
        }
      },
    };
  },
};

export default defineConfig(
  { ignores: ['node_modules/'] },
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    plugins: { local: { rules: { 'no-comments': noComments } } },
    rules: { 'local/no-comments': 'error' },
  },
);
