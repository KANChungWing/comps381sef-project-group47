# Book Management System - Group 47

## 1. Project Info
- **Course**: COMP S3810SEF
- **Group No.**: 47
- **Members**:
  - KAN Chung Wing (SID: 138XXXXXXX)
  - [其他組員]

## 2. Project files
- `server.js`: Express + Facebook OAuth + CRUD + REST API
- `package.json`: Dependencies
- `views/`: login.ejs, index.ejs, create.ejs, edit.ejs
- `models/`: User & Item schema
- `public/`: style.css

## 3. The cloud-based server URL
http://3.26.99.126:3000

## 4. Operation guides

### Use of Login/Logout pages
- Open URL → Click **"Login with Facebook"**
- First time: Auto register with Facebook profile
- Logout: Click **"Logout"** button (top-right)

### Use of your CRUD web pages
- **Create**: Click "Add Book" → fill title/author/isbn → Create
- **Read**: Search box supports **partial match** on title/author
- **Update**: Click "Edit" → modify → Update
- **Delete**: Click "Delete"

### Use of your RESTful CRUD services
```bash
curl http://3.26.99.126:3000/api/items
curl -X POST -H "Content-Type: application/json" -d "{\"title\":\"Test\"}" http://3.26.99.126:3000/api/items
curl -X PUT -H "Content-Type: application/json" -d "{\"title\":\"Updated\"}" http://3.26.99.126:3000/api/items/ID
curl -X DELETE http://3.26.99.126:3000/api/items/ID
