# Financial CRM for Agencies - Dummy Data ZIP

This ZIP contains standalone dummy data files for your MERN SaaS project.

## Included

```bash
server/src/seed/dummyData.js
server/src/seed/seed.js
server/src/seed/README.md
```

## Data volume

- 12 clients
- 25+ projects
- 150+ revenue records
- 280+ expense records
- AI insights for every client
- Realistic profitable, low-margin, at-risk, and loss-making clients

## Demo user

```txt
Email: owner@novaagency.com
Password: Password123!
```

## Install notes

Place the `server/src/seed` folder inside your project.

Then add this to your backend `package.json`:

```json
"seed": "node src/seed/seed.js"
```

Run:

```bash
npm run seed
```
