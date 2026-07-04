import { defineConfig } from 'allure';

export default defineConfig({
  name: 'Bunkai TMS QA',
  output: './allure-report',
  plugins: {
    awesome: {
      options: {
        reportLanguage: 'en',
      },
    },
  },
});
