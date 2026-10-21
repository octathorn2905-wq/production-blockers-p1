# Production blockers P1

Playwright scripts for Nexletta production blockers only. This repo does not include the post-deployment smoke suite.

## Scripts

- `tests/p1/nx-030.spec.ts` — account activation and invitation
- `tests/p1/nx-039-049.spec.ts` — disputed payments, and task edits limited to the assignee
- `tests/p1/state-eligibility.spec.ts` — clinic, veteran, and provider state match, plus portal timezones

## Run

```bash
npm install
npx playwright install chromium
copy .env.example .env
npm test
```

Put passwords only in `.env`. That file is not committed. For a visible browser, use `npm run test:headed`.
