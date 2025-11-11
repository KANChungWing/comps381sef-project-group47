\# Book Management System - Group 47



\## 1. Project Info

\- \*\*Course\*\*: COMP S381F

\- \*\*Group No.\*\*: 47

\- \*\*Members\*\*:

&nbsp; - 陳同學 (SID: 550123456)

&nbsp; - 黃同學 (SID: 550123457)



\## 2. File Intro

\- `server.js`: Express server with login, CRUD, REST API

\- `package.json`: Dependencies

\- `views/`: EJS templates

\- `models/`: User \& Book schema

\- `public/`: CSS



\## 3. Cloud URL

https://comps381f-group47.onrender.com



\## 4. Operation Guide



\### Login

\- URL: `/login`

\- \*\*Account\*\*: `group47` / `123456`

\- First time? Visit `/setup`



\### CRUD Web

\- \*\*Create\*\*: Click "Add Book"

\- \*\*Read\*\*: Search by title

\- \*\*Update\*\*: Click "Edit"

\- \*\*Delete\*\*: Click "Delete"

\- \*\*Logout\*\*: Top-right button



\### RESTful API (cURL)



```bash

\# Read

curl https://comps381f-group47.onrender.com/api/items



\# Create

curl -X POST -H "Content-Type: application/json" -d '{"title":"Node.js","author":"Ryan Dahl","isbn":"123"}' https://comps381f-group47.onrender.com/api/items



\# Update

curl -X PUT -H "Content-Type: application/json" -d '{"title":"Express.js"}' https://comps381f-group47.onrender.com/api/items/ID\_HERE



\# Delete

curl -X DELETE https://comps381f-group47.onrender.com/api/items/ID\_HERE

