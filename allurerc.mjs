import { defineConfig } from 'allure';

export default defineConfig({
  name: 'Bunkai TMS QA',
  output: './allure-report',
  // Persisted outside allure-report/ so `bun run test:clean` (which wipes
  // allure-results/ and allure-report/) never erases trend history.
  historyPath: './.allure/history.jsonl',
  // Awesome-plugin-native grouping (report-generation time), on top of the
  // classic messageRegex/matchedStatuses categories the allure-playwright
  // reporter already writes to allure-results/ (still current SDK options,
  // kept as-is in playwright.config.ts) — the two are complementary, not
  // a replacement for each other.
  categories: [
    {
      name: 'Product defects',
      matchers: { statuses: ['failed'] },
      groupBy: ['severity', 'owner', 'environment'],
      groupByMessage: true,
      groupEnvironments: true,
    },
    {
      name: 'Flaky tests',
      matchers: { flaky: true },
      groupBy: ['environment'],
    },
  ],
  plugins: {
    awesome: {
      options: {
        reportLanguage: 'en',
      },
    },
  },
});
