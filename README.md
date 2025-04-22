# 📦 Virtual Inventory 

A robust, full-stack inventory management application designed to help businesses efficiently manage sections, items, and stock logs. Built with a modern tech stack focused on scalability, auditability, and ease of use.

---

## 🚀 Features

- Add & manage items across multiple sections
- Log every inventory update with remarks (Audit Trail)
- Real-time stock count with version tracking
- Role-based access control (Admin & Employee)
- Clean, responsive frontend interface (React)
- RESTful backend with PostgreSQL via Prisma ORM

---

## 🛠️ Tech Stack

- 💻 Frontend: Next.js (Tailwind CSS)
- 🧠 Backend: Node.js
- 🧰 ORM: Prisma
- 🗄️ Database: PostgreSQL
- 🔐 Auth: JWT-based authentication

---

## 🧩 Database Schema (Prisma + PostgreSQL)

Main models:

- `User` (Admin/Employee)
- `Section` (Group/category of items)
- `Item` (Product with count & version)
- `AuditLog` (Track every item count change)

🔍 Each time an item count is updated, a new entry is created in the `AuditLog` table recording:

- Old count
- New count
- User ID
- Timestamp
- Remarks

Ensuring complete traceability of inventory activity.

## 🔍 UI Previews

### 🧾 Inventory Dashboard

![Dashboard](https://github.com/user-attachments/assets/0eb811d4-f04b-44a9-b749-2ea558d36e7d)




### ➕ Add Section Modal

![Add Secion](https://github.com/user-attachments/assets/94a17333-d7c2-40bf-a73c-aaa41cb775d5)




### 📦 Stock Management

![image](https://github.com/user-attachments/assets/c2e860c9-e0ce-434d-91f1-7b4fce1828dc)


---

## 🔐 Roles & Permissions

| Role     | Permissions                                         |
|----------|------------------------------------------------------|
| Admin    | Add/update/delete items, view audit logs             |
| Employee | View item status only, no modification rights        |

---

## 📈 Future Enhancements

- Export audit logs as CSV/PDF
- Notification system for low stock alerts
- Multi-user activity logs
- Section-wise item filters

---

## 🧪 Getting Started (Local Development)

1. Clone the repository  
   ```bash
   git clone https://github.com/yourusername/exp-inventory.git
   cd exp-inventory

2. Setup environment variables
Create a .env file with your PostgreSQL database URL:
   ```bash
   DATABASE_URL=your_database_url
   
3. Run migrations
   ```bash
   npx prisma migrate dev

4. Start the appication
   ```bash
   npm run dev

---

## 🤝 Contributions

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.
