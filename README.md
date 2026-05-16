<div align="center">
  <h1>🎓 EduLearn LMS</h1>
  <p><strong>A Modern, Microservices-Based Learning Management System</strong></p>
  <p>
    <img src="https://img.shields.io/badge/React-19-blue?style=for-the-badge&logo=react" alt="React" />
    <img src="https://img.shields.io/badge/Vite-8-646CFF?style=for-the-badge&logo=vite" alt="Vite" />
    <img src="https://img.shields.io/badge/Spring_Boot-3-6DB33F?style=for-the-badge&logo=spring-boot" alt="Spring Boot" />
    <img src="https://img.shields.io/badge/MySQL-8.0-4479A1?style=for-the-badge&logo=mysql" alt="MySQL" />
    <img src="https://img.shields.io/badge/Kafka-Local-231F20?style=for-the-badge&logo=apache-kafka" alt="Kafka" />
  </p>
</div>

<br/>

EduLearn is a comprehensive Learning Management System built with a highly scalable **Microservices Architecture**. It features course management, enrollment, secure payments via Razorpay, real-time notifications, and a highly interactive user interface.

---

## 🏗️ System Architecture & Use Cases

Our architecture is designed to handle high loads, separate concerns cleanly, and provide a seamless experience for Students, Instructors, and Admins.

### Use Case Diagram
This diagram outlines the interactions between our key actors (Student, Instructor, Admin) and the EduLearn system.
<div align="center">
  <img src=".\src\assets\UseCaseDiagram.png" alt="EduLearn Use Case Diagram" width="80%" />
</div>

<br/>

<div align="center">
  <img src=".\src\assets\EduLearnDiagram.png" alt="EduLearn System Diagram" width="80%" />
</div>

---

## 💻 Frontend Analysis

The frontend of EduLearn (`edulearn-vite`) is a modern Single Page Application (SPA) designed with performance, usability, and dynamic interactions in mind.

### 🛠️ Tech Stack
- **Core:** React 19, Vite (Lightning-fast build tool)
- **Routing & State:** React Router v7, `@tanstack/react-query` (for efficient data fetching and caching)
- **Styling & UI:** `framer-motion` (for fluid animations), `lucide-react` (beautiful icons)
- **Data Visualization:** `recharts` (for interactive analytics dashboards)
- **Networking:** Axios

### 📂 Frontend Structure
```text
edulearn-vite/
├── src/
│   ├── assets/       # Static files (images, icons)
│   ├── components/   # Reusable UI components (Buttons, Modals, Cards)
│   ├── context/      # React Context for global state (Auth, Theme)
│   ├── pages/        # Page-level components (Home, Dashboard, Course)
│   ├── services/     # API integration layers (Axios instances)
│   ├── styles/       # Global styles and CSS variables
│   └── utils/        # Helper functions and constants
```

**Highlights:**
- **Performance:** Leveraging Vite and React 19 ensures fast hot-module replacement and optimized production builds.
- **Micro-Animations:** Driven by `framer-motion` to provide a premium, engaging user experience.
- **Robust Data Fetching:** React Query handles background updates, caching, and loading states automatically.

---

## 🚀 Setup Guide

Get the complete EduLearn platform running locally on your machine.

### Prerequisites
- **Java 17 SDK**, **Maven 3.9+**
- **Node.js (LTS)** & **npm**
- **MySQL 8.0**
- **Redis Server** & **Apache Kafka**

### 1. Configure Environment Variables
Copy the `.env` file to the required locations. Ensure these keys are set:
- `SPRING_DATASOURCE_PASSWORD`: Your MySQL root password.
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`: For OAuth2.
- `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET`: For payments.

### 2. Start Infrastructure Services
Start your local services (in separate terminals):
```bash
# Redis
redis-server

# Zookeeper (from Kafka directory)
.\bin\windows\zookeeper-server-start.bat .\config\zookeeper.properties

# Kafka (from Kafka directory)
.\bin\windows\kafka-server-start.bat .\config\server.properties
```

### 3. Initialize Databases
```bash
mysql -u root -p < backend/init-local-databases.sql
```

### 4. Build & Run Backend Services
Open a terminal in the `backend/` folder and run:
```bash
mvn clean install -DskipTests
```
Then, start the microservices **in this specific order** using separate terminals:
1. `mvn -pl discovery-service spring-boot:run` (Port 8761)
2. `mvn -pl config-service spring-boot:run` (Port 8888)
3. `mvn -pl api-gateway spring-boot:run` (Port 8080)
4. Then start the remaining services (`auth`, `user`, `course`, `enrollment`, `notification`, `payment`).

### 5. Start the Frontend
Open a new terminal in the `edulearn-vite/` directory:
```bash
npm install
npm run dev
```

The frontend is now accessible at **http://localhost:5173** and routes requests through the API Gateway at **http://localhost:8080**.

---

<div align="center">
  <i>Built with ❤️ by the EduLearn Team</i>
</div>
