# Loan Management App

A mobile-first loan tracking app built with React, Vite, and Firebase. It helps you record loans, track repayments, review overdue balances, and manage archived records from a simple dashboard.

## Live App

[https://loan-management-app-ca579.web.app](https://loan-management-app-ca579.web.app)

## Features

- Mobile-first dashboard with portfolio, insights, archive, and settings views
- Add, edit, extend, settle, and archive loans
- Search and filter borrowers quickly
- Consistent repayment and overdue status handling
- Safer date-only handling for due dates and payment dates
- Currency-aware summaries instead of mixed-currency totals
- Firebase Authentication and Firestore-backed data storage

## Tech Stack

- React 19
- Vite 5
- Firebase Hosting
- Firestore
- Firebase Authentication

## Local Development

```bash
npm install
npm run dev
```

## Production Build

```bash
npm run build
```

## Firebase Deployment

```bash
npx firebase-tools deploy --only hosting,firestore:rules,firestore:indexes
```
