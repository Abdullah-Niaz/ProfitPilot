# Financial CRM Dummy Data

This folder contains realistic dummy data for the Financial CRM for Agencies MERN SaaS project.

## What is included

- 1 agency workspace
- 5 team users
- 12 realistic agency clients
- 28+ projects
- 150+ revenue records
- 280+ expense records
- AI profitability insights
- Retain, upsell, monitor, renegotiate, and drop recommendations

## Demo Login

```txt
Email: owner@novaagency.com
Password: Password123!
```

## How to use

Copy this folder into:

```bash
server/src/seed
```

Then add this script to `server/package.json`:

```json
"scripts": {
  "seed": "node src/seed/seed.js"
}
```

Run:

```bash
npm run seed
```

## Important

The seed script expects these Mongoose models to exist:

- User
- Workspace
- WorkspaceMember
- Client
- Project
- Revenue
- Expense
- AIInsight

If your model field names are different, adjust `seed.js` mappings accordingly.
