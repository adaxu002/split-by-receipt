# Split by Receipt

Split shared expenses item by item. Upload a receipt, assign items to people, and calculate proportional settlements for roommates, students, restaurant groups, and shared shopping trips.

## Live Application

[Open Split by Receipt](https://split-by-receipt-381076915209.us-west2.run.app/)

## Features

- Quick receipt splitting
- Reusable folders for groups and shared expenses
- Grocery and restaurant receipt modes
- Manual item entry and JSON import
- Demo data for exploring the full workflow
- Per-person item assignment
- Tax, tip, discount, and service-fee allocation
- Local browser storage for folders and receipts

## Run Locally

Node.js 18 or newer is required.

```bash
npm start
```

Then open [http://localhost:8080](http://localhost:8080).

## Important Note

This repository contains the deployable production frontend. Most features work locally and store data in the browser. AI receipt scanning depends on the original server-side `/api/receipt/parse` endpoint and its Gemini configuration, which is not included in this frontend export. Manual entry, JSON import, demo data, folders, assignments, and settlement calculations remain available.

## Project Structure

```text
split-by-receipt/
├── assets/
│   ├── index-BRP0pvjj.css
│   └── index-DKBcKwBR.js
├── index.html
├── package.json
└── server.mjs
```
