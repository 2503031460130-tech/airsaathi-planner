# Contributing to AirSaathi

Thank you for your interest in improving AirSaathi!

## Development Workflow

### Prerequisites
- **Node.js** v22.12.0 or higher
- **npm** v10.0.0 or higher

### Setup
```bash
git clone https://github.com/2503031460130-tech/airsaathi-planner.git
cd airsaathi-planner
npm ci
```

### Available Scripts

| Command | Purpose |
| :--- | :--- |
| `npm test` | Run all 176 test cases |
| `npm run typecheck` | TypeScript strict type checking |
| `npm run format` | Auto-format with Prettier |
| `npm run format:check` | Verify formatting (CI) |
| `npm run build` | Build production bundle |
| `npm run build:demo` | Build public demo bundle |
| `npm run check` | Full validation pipeline (lint + test + build) |

### Code Quality Standards

This project enforces strict quality standards across all contributions:

1. **TypeScript `strict: true`** — All TypeScript files must pass strict mode without suppression.
2. **JSDoc on every export** — Every exported function, type, and constant must include complete `@param`, `@returns`, and `@throws` annotations.
3. **Prettier formatting** — Run `npm run format` before committing. CI rejects unformatted code.
4. **ESLint rules** — `prefer-const`, `no-var`, `eqeqeq`, `no-duplicate-imports` enforced.
5. **Zero hallucination policy** — The planner must never produce timing advice when data is missing, stale, or partial.
6. **Zero PII policy** — No personal data may flow through the AI explanation path. Only allowlisted action IDs are permitted.

### Architecture Principles

- **Functional Core / Imperative Shell** — `src/planner.mjs` and `src/forecast-plan.mjs` are pure, side-effect-free, and do not touch DOM or network.
- **Fail Closed** — Any missing, stale, or incomplete data must block advice, not substitute a guess.
- **Zero Spend Constraint** — No action recommendation may require any financial expenditure.
- **Bilingual by Contract** — All user-visible strings must have both `en` and `hi` entries in `src/messages.ts`.

### Testing Requirements

All new functionality must include:
- Unit tests for valid inputs and boundary values
- Tests for every error/rejection path
- Tests confirming fail-closed behavior on missing or stale data

Run `npm run test:coverage` to generate a coverage report.

### Pull Request Checklist

- [ ] `npm run check` passes locally
- [ ] All new exports have complete JSDoc
- [ ] Any new user-facing string has both English and Hindi entries
- [ ] No PII, credentials, or secrets are added anywhere
