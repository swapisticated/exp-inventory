# 📦 EXP Inventory Management System

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

- 💻 Frontend: React.js (Tailwind CSS)
- 🧠 Backend: Node.js, Express
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
