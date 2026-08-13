# Ledger — Expense Tracker frontend

A React + TypeScript UI for the Expense Tracker API (`../ExpenseTracker.Api`).
Register/login, create groups, add expenses, see balances, settle up.

Chose React + TypeScript deliberately: it's the most common frontend paired
with .NET APIs in the industry (a .NET backend / React frontend split is a
very standard combo you'll see on the job), so this doubles as something
concrete to point recruiters at.

## Stack
- React 18 + TypeScript
- Vite (dev server + build)
- Plain CSS (no framework) — a small custom design system in `src/styles.css`
- No routing library — the app is small enough that group selection is just
  React state; no extra dependency needed for a project this size

## Prerequisites
- Node.js 18+ and npm (check with `node --version`)
- The backend API running locally first (`cd ../ExpenseTracker.Api && dotnet run`)
  — this frontend expects it at `http://localhost:5000`

## Run it

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173`. The API base URL is set in `.env`
(`VITE_API_URL=http://localhost:5000/api`) — change it there if your API
runs on a different port.

## What's in it

```
src/
  api.ts                 -> fetch wrapper, one function per endpoint, stores the JWT
  types.ts                -> TypeScript types mirroring the backend's DTOs
  App.tsx                 -> top-level layout: sidebar (groups) + main panel
  styles.css               -> design tokens + all component styles
  components/
    AuthScreen.tsx          -> login / register toggle
    GroupDetail.tsx          -> balances, expense history, tabs for add/settle/members
    BalanceList.tsx           -> "who owes who" ledger rows
    ExpenseList.tsx            -> expense history with delete
    AddExpenseForm.tsx          -> new expense, defaults to splitting across the whole group
    AddMemberForm.tsx            -> add an existing registered user to a group
    SettleUpForm.tsx              -> record a payment between two members
```

Auth state (JWT + basic user info) is kept in `localStorage`, so refreshing
the page keeps you logged in until the token expires (24h by default, set on
the backend).

## Design notes
Styled like an actual ledger rather than a generic dashboard: balances and
amounts render in a monospaced, tabular-numeral font so figures line up like
a real statement, with green/red used only to mean "owed to you" / "you owe"
— never decoratively. Everything else stays quiet (neutral paper background,
one ink-teal brand color) so the money figures are what draws the eye.

## Known limitation
This sandbox doesn't have outbound network access, so `npm install` wasn't
run here — the TypeScript was checked manually against a global `tsc`
install and is syntactically sound, but you're the first real `npm install`
+ `npm run dev` this has been through. If anything's off, it'll most likely
surface as a straightforward type error on first run — easy to paste back
here and fix.
