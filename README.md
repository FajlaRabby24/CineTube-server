# 🚀 CineTube Server

The backend API for CineTube, built with Express 5 and Prisma. This server handles authentication, media management, payment processing, and core business logic.

## 🛠️ Tech Stack

- **Runtime**: [Bun](https://bun.sh/)
- **Framework**: [Express 5](https://expressjs.com/)
- **ORM**: [Prisma](https://www.prisma.io/)
- **Database**: PostgreSQL (via `pg` adapter)
- **Authentication**: [Better-Auth](https://better-auth.com/)
- **Storage**: [Cloudinary](https://cloudinary.com/)
- **Payments**: [Stripe](https://stripe.com/)
- **Validation**: [Zod](https://zod.dev/)
- **Mailing**: [Nodemailer](https://nodemailer.com/)

## 🚀 Getting Started

### Prerequisites

- [Bun](https://bun.sh/) installed.
- PostgreSQL database instance.

### Installation

1. Navigate to the server directory:
   ```bash
   cd server
   ```
2. Install dependencies:
   ```bash
   bun install
   ```

### Database Setup

1. Configure your database connection in `.env`:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/cinetube"
   ```
2. Run migrations:
   ```bash
   bun migrate
   ```
3. Generate Prisma client:
   ```bash
   bun generate
   ```

### Development

Run the development server with hot-reload:

```bash
bun dev
```

### Scripts

- `bun dev`: Start development server using `tsx`.
- `bun migrate`: Run Prisma migrations.
- `bun studio`: Open Prisma Studio to explore data.
- `bun build`: Bundle the application using `tsup`.
- `bun seed:admin`: Seed the database with an admin account.
- `bun test:routes`: Run route health tests.

## 📁 Project Structure

- `src/server.ts`: Entry point.
- `src/app/modules`: Feature-based modules (routes, controllers, services).
- `src/app/middleware`: Custom Express middlewares.
- `src/app/config`: Configuration files (env, cloudinary, stripe).
- `prisma/`: Database schema and migrations.

---
Built with ❤️ for CineTube.
