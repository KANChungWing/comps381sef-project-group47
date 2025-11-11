# Book Management System - Group 47

## 1. Project Info
- **Course**: COMP S3810SEF
- **Group No.**: 47
- **Members**:
  - KAN Chung Wing (SID: 550xxxxxx)

## 2. Project files
- `server.js`: Express + Facebook OAuth + CRUD + REST API
- `views/`: login.ejs, index.ejs, create.ejs, edit.ejs
- `models/`: User & Item schema
- `public/`: style.css

## 3. The cloud-based server URL
http://你的EC2-IP:3000

## 4. Operation guides

### Use of Login/Logout pages
- Click "Login with Facebook"
- First time: Auto register
- Logout: Click "Logout"

### Use of your CRUD web pages
- **Create**: Click "Add Book"
- **Read**: Search box (partial match)
- **Update**: Click "Edit"
- **Delete**: Click "Delete"

### Use of your RESTful CRUD services
```bash
curl http://你的IP:3000/api/items
curl -X POST -H "Content-Type: application/json" -d "{\"title\":\"Test\"}" http://你的IP:3000/api/items
curl -X PUT -H "Content-Type: application/json" -d "{\"title\":\"Updated\"}" http://你的IP:3000/api/items/ID
curl -X DELETE http://你的IP:3000/api/items/ID
