# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.0.3] - 2026-03-17

### Added
- `GET /v1/income/rulesets` — list all rulesets with formula, parameters, and active status
- `GET /v1/income/countries` — list all supported countries with income group and data availability
- `POST /v1/users` — register a user with a `country_code`
- `GET /v1/users/:id/income` — get a user's income entitlement
- Global error handler with consistent JSON error responses
- Custom 404 handler for unknown routes
- Rulesets registry (`src/core/rulesets.ts`) — pure data, no HTTP
- In-memory user store (`src/core/users.ts`) — Phase 3 placeholder
- API integration tests using Fastify `.inject()` (16 tests)

## [0.0.2] - 2026-03-17

### Added
- Real World Bank dataset with 49 countries across all four income groups (HIC, UMC, LMC, LIC)
- Ruleset v1: deterministic entitlement formula using GNI per capita and Gini inequality index
- `gniPerCapitaUsd` and `incomeGroup` fields on `CountryStats`
- `IncomeGroup` type (`HIC` | `UMC` | `LMC` | `LIC`)
- World Bank data source documentation (`src/data/worldbank/README.md`)
- Automated World Bank data importer (`npm run data:update`)
- Admin-editable `config.json` for all importer tunables (data sources, indicators, countries, income thresholds, output rounding)
- Modular importer pipeline: config → fetch → transform → validate → write
- Importer validates output before overwriting `countries.json` (same rules as test suite)
- Retry with exponential backoff for World Bank API calls
- Comprehensive unit tests: Ruleset v1 (10), data loader (6), importer (22)
- This CHANGELOG

### Changed
- Default port changed from 3000 to 3333
- Rules engine now uses GNI per capita (instead of GDP) as the income reference
- Gini inequality index now amplifies the need score (weighted at 0.15)
- Global income floor updated from $200 to $210 PPP-USD/month (based on World Bank upper-middle-income poverty line of $6.85/day)
- `ruleset_version` changed from `stub-v0.0.1` to `v1`
- `data_version` changed from `dummy-2026-03-01` to `worldbank-2023`
- Dummy 3-country dataset replaced with 49 real countries

## [0.0.1] - 2026-03-17

### Added
- Project scaffold: TypeScript + Fastify + Vitest
- Core domain types: `Country`, `CountryStats`, `GlobalIncomeEntitlement`, `RulesetMeta`
- Stub rules engine with $200 PPP-USD/month global income floor
- Dummy dataset for 3 countries (DE, BR, NG)
- REST endpoint `GET /v1/income/calc?country=XX`
- Health endpoint `GET /health`
- Dockerfile and docker-compose.yml
- MIT license
