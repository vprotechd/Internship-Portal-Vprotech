# VProTech Assessment & Internship Portal

## Final workflow

Student Register → Login → Select Domain → Student Dashboard → Released Test → Server-timed Exam → Auto Submit → Admin Review.

There is no email-verification or account-activation step.

## Stack

- React + Vite + Tailwind CSS
- Node.js + Express
- MongoDB + Mongoose
- JWT in secure httpOnly cookie
- bcrypt password hashing

## Run locally

### Backend

```bash
cd server
cp .env.example .env
# edit MONGO_URI, JWT_SECRET and admin credentials
npm install
npm run dev
```

The API runs on `http://localhost:5000`.

### Frontend

```bash
cd client
npm install
npm run dev
```

The frontend runs on `http://localhost:5173` and proxies `/api` to the backend.

## Production cookie configuration

When frontend and backend are on different HTTPS origins, set:

```env
NODE_ENV=production
CLIENT_ORIGIN=https://your-frontend.example
```

The authentication cookie uses `httpOnly`, `secure`, and `SameSite=None` in production so credentialed cross-origin requests work.

## Admin

The first admin is seeded from:

```env
ADMIN_EMAIL=admin@vprotech.com
ADMIN_PASSWORD=ChangeMe123
```

Public registration always creates a `student` and never accepts a client-supplied role.

## Assessment behavior

- Students see only active, released tests assigned to their selected domain.
- One attempt per student/test is enforced with a unique database index.
- The server stores `startedAt` and an absolute `deadline`.
- No client-side grace period exists.
- Expired attempts are finalized server-side and by the expiry worker.
- Refreshing or closing the browser does not reset the deadline.
- Student submission responses contain no score, marks, pass/fail state, or correct answers.
- MCQ marks are calculated on the server.
- Coding answers remain available to admins for manual grading.
- Correct MCQ answers are excluded from student question APIs.
- Autosave is accepted only for an active attempt before its deadline.
- Tab visibility/fullscreen violations are incremented atomically.

## Admin capabilities

- Dashboard statistics and domain-wise student counts
- Student search/filtering with server-side pagination
- Domain creation/editing/activation/deactivation
- Question CRUD with MCQ/coding types, difficulty and marks
- Test creation/editing, domain assignment and question selection
- Allow Test / Stop Test controls
- Paginated results with student/test search
- Coding manual grading
- CSV export with CSV-injection protection
- Student password reset

Domains in use by students/tests cannot be deleted; they should be deactivated instead.

## Tests

```bash
cd server
npm test
```

The supplied validation suite covers server-side MCQ grading behavior. Production dependency installation/build should be run in an environment with npm registry access:

```bash
cd client
npm install
npm run build
```
