# 🎥 YouTube–Twit Clone

A full-stack **YouTube × Twitter hybrid platform** that allows users to share short posts, upload videos, interact via likes/comments, and follow creators — combining **content creation** with **real-time social engagement**.

This project focuses on **scalability, clean architecture, and real-world features**, inspired by modern social media platforms.

---

## 🚀 Features

### 🔐 Authentication & User Management
- Secure user signup & login
- JWT-based authentication
- Profile creation & updates
- Follow / unfollow users

### 🧵 Social Feed (Twitter-like)
- Create short text posts (tweets)
- Like & comment on posts
- Real-time feed updates
- User-specific timelines

### 📺 Video Platform (YouTube-like)
- Video upload & streaming
- Video metadata (title, description, tags)
- Like, comment & share videos
- Creator channels

### 🔎 Discovery & Engagement
- Explore trending posts & videos
- Search users / content
- Personalized feed (follow-based)

### 🛠️ Backend Capabilities
- RESTful APIs
- Scalable data models
- Role-based access control
- Optimized database queries

---

## 🧱 Tech Stack

### Frontend
- **React.js**
- **Tailwind CSS**
- **React Router**
- **Axios**

### Backend
- **Node.js**
- **Express.js**
- **MongoDB**
- **Mongoose**
- **JWT Authentication**

### Dev & Tools
- **Postman**
- **Git & GitHub**
- **Cloudinary** (media uploads)
- **Socket.io** *(optional / future scope)*

---
# Setup
## 1 : Clone the repo

## 2 : Backend Setup
  ```
    cd server
    npm install
    npm run dev
  ```

## 3 : Frontend Setup
  ```
    cd client
    npm install
    npm run dev
  ```

## Environment Variables
Create a .env file inside the server folder:
```
  PORT=5000
  MONGO_URI=your_mongodb_uri
  ACCESS_TOKEN_SECRET = YOUR_SECRET
  ACCESS_TOKEN_EXPIRY = 1d
  REFRESH_TOKEN_SECRET = YOUR_SECRET 
  REFRESH_TOKEN_EXPIRY = 10d
  
  CLOUDINARY_CLOUD_NAME=NAME
  CLOUDINARY_API_KEY=YOUR_CLOUDINARY_API_KEY
  CLOUDINARY_API_SECRET= YOUR_SECRET_KEY
```
