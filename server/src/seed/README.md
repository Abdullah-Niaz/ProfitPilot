# Local demo data

The seed script resets demo records. Never run it against a real customer database.

It now requires all of these settings in `server/.env`:

```env
NODE_ENV=development
MONGO_URI=mongodb://127.0.0.1:27017/financial_crm_demo
SEED_DATABASE_NAME=financial_crm_demo
SEED_ALLOW_RESET=DELETE_DEMO_DATA
DEMO_PASSWORD=YOUR_UNIQUE_DEMO_PASSWORD
```

Replace the password with a unique value of at least 12 characters and no more than 72 UTF-8 bytes. The guard accepts only a local MongoDB host and database names ending in `_demo`, `_test`, or `_dev`. The database name must match the explicit acknowledgement.

From `server`, run `npm run seed`. This deletes the seeded collections before inserting demo records, including replacing demo users and revoking their sessions. The demo email is `owner@agencycrm.com`; use the password you supplied. The script never prints the connection string or password.

Leave the reset settings unset during normal development. The separate integration test suite uses a temporary database and does not call this seed script.
