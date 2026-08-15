# Lab 1 — Test Plan and Evidence  (fill this in)

All test files live under server/tests/lab-01/ and client/tests/lab-01/.

| # | Tool | Test | Result |
|---|------|------|--------|
| 1 | Supertest | GET /api/health returns 200, status=ok | Pass |
| 2 | Supertest | GET /api/categories returns 4 seeded categories in id order | Pass |
| 3 | Vitest | Heading renders | Pass |
| 4 | Vitest | Success state shows Online + category list | Pass |
| 5 | Vitest | Error state shows Offline + message | Pass |

Paste your passing terminal output / screenshot below.
## Evidence-server : GET api/health test
![Evidence-server](images/evidence-server.png)

## Evidence-client : Heading renders
![Evidence-client](images/evidence-client.png)

## Evidence ตัวอย่างหน้าเว็บจาก localhost:5173 
![Evidence-Demo](images/messageImage_1786275781790.jpg)

## Evidence Total categories in database: 4
![Evidence-seed-categories](images/evidence-seed-categories.png)

## Evidence Api Categories
![Evidence-api-categories](images/evidence-api-categories.png)

## Evidence ui online 
![Evidence-ui-online](images/evidence-ui-online.png)

## Evidence Network
![Evidence-network](images/evidence-network.png)

## Evidence ui offline
![Evidence-ui-offline](images/evidence-ui-offline.png)

