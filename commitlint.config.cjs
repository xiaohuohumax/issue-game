/** @type {import('cz-git').UserConfig} */
// eslint-disable-next-line no-undef
module.exports = {
  ignores: [(commit) => commit.includes('init')],
  extends: ['@commitlint/config-conventional'],
  rules: {
    'body-leading-blank': [2, 'always'],
    'footer-leading-blank': [1, 'always'],
    'header-max-length': [2, 'always', 150],
    'subject-empty': [2, 'never'],
    'type-empty': [2, 'never'],
    'subject-case': [0],
    'type-enum': [
      2,
      'always',
      [
        'feat',
        'fix',
        'init',
        'art',
        'docs',
        'style',
        'refactor',
        'perf',
        'test',
        'build',
        'ci',
        'revert',
        'chore'
      ],
    ],
  },
  prompt: {
    alias: {
      f: 'docs: fix typos',
      r: 'docs: update README',
      s: 'style: update code format',
      b: 'build: bump dependencies',
      c: 'chore: update config',
    },
    customScopesAlign: 'top',
    allowEmptyIssuePrefixs: true,
    allowCustomIssuePrefixs: true,
    messages: {
      type: '选择你正在提交的改动类型:',
      scope: '[可选]标注这次改动的范围:',
      customScope: '自定义这次改动的范围:',
      subject: '填写简短精炼的变更描述:\n',
      body: '[可选]填写更加详细的变更描述 (使用"|"换行):\n',
      markBreaking: '[可选]有无破坏性改动? (在标题中添加"!"):',
      breaking: '[可选]列举非兼容性重大的变更 (使用"|"换行):\n',
      footerPrefixesSelect: '[可选]选择关联issue前缀:',
      customFooterPrefix: '输入自定义issue前缀:',
      footer: '[可选]列举关联issue。例如: #31, #I3244:',
      confirmCommit: '是否提交或修改?:'
    },
    types: [
      {
        value: 'feat',
        name: 'feat:      ✨ 新增功能 | Introducing new features',
        emoji: ':sparkles:'
      },
      {
        value: 'fix',
        name: 'fix:       🐛 修复缺陷 | Fixing a bug',
        emoji: ':bug:'
      },
      {
        value: 'init',
        name: 'init:      🎉 初始项目 | Initial commit',
        emoji: ':tada:'
      },
      {
        value: 'art',
        name: 'art:       🎨 结构改进 | Improving structure / format of the code',
        emoji: ':art:'
      },
      {
        value: 'docs',
        name: 'docs:      📝 文档更新 | Documentation only changes',
        emoji: ':memo:',
      },
      {
        value: 'style',
        name: 'style:     💄 代码格式 | Updating the UI and style files',
        emoji: ':lipstick:',
      },
      {
        value: 'refactor',
        name: 'refactor:  ♻️  代码重构 | A code change that neither fixes a bug nor adds a feature',
        emoji: ':recycle:',
      },
      {
        value: 'perf',
        name: 'perf:      ⚡️ 性能提升 | A code change that improves performance',
        emoji: ':zap:',
      },
      {
        value: 'test',
        name: 'test:      ✅ 测试相关 | Adding missing tests or correcting existing tests',
        emoji: ':white_check_mark:',
      },
      {
        value: 'build',
        name: 'build:     📦️ 构建相关 | Changes that affect the build system or external dependencies',
        emoji: ':package:',
      },
      {
        value: 'ci',
        name: 'ci:        🎡 持续集成 | Changes to our CI configuration files and scripts',
        emoji: ':ferris_wheel:',
      },
      {
        value: 'revert',
        name: 'revert:    🔨 回退代码 | Revert to a commit',
        emoji: ':hammer:'
      },
      {
        value: 'chore',
        name: 'chore:     ⏪️ 其他修改 | Other changes that do not modify src or test files',
        emoji: ':rewind:',
      },
    ],
    useEmoji: true,
    emojiAlign: 'center',
    themeColorCode: '',
    allowCustomScopes: true,
    allowEmptyScopes: true,
    customScopesAlias: 'custom',
    emptyScopesAlias: 'empty',
    upperCaseSubject: false,
    markBreakingChangeMode: false,
    allowBreakingChanges: ['init', 'feat', 'fix'],
    breaklineNumber: 100,
    breaklineChar: '|',
    skipQuestions: [],
    issuePrefixs: [
      { value: 'link', name: 'link:     链接 ISSUES 进行中' },
      { value: 'closed', name: 'closed:   标记 ISSUES 已完成' },
    ],
    customIssuePrefixsAlign: 'top',
    emptyIssuePrefixsAlias: 'skip',
    customIssuePrefixsAlias: 'custom',
    confirmColorize: true,
    defaultBody: '',
    defaultIssues: '',
    defaultSubject: '',
  },
};