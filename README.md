# employee-management-app-1

An enterprise employee management system with CRUD operations, real-time encrypted team chat, and a clean architecture frontend built with TypeScript and React.

## Features

- **Employee CRUD** — Create, read, update, and delete employee records with department filtering.
- **Real-time Chat** — End-to-end encrypted WebSocket team chat (TweetNaCl / X25519 + XSalsa20-Poly1305).
- **TypeScript** — All new frontend files are written in TypeScript with strict mode enabled.
- **Clean Architecture** — Business logic lives in `frontend/src/domain/`; UI components live in `frontend/src/components/`.
- **Dependency Injection** — `IEmployeeService` is provided via React Context so components are decoupled from the HTTP layer and can be tested with mock services.
- **Client-side Validation** — `validateEmployee` and `validateEmail` helpers in the domain layer prevent malformed data from reaching the API.

## Getting Started

### Prerequisites

- Node.js ≥ 18
- npm ≥ 9

### Backend

```bash
cd backend
npm install
npm start          # starts Express + WebSocket server on port 5000
```

### Frontend

```bash
cd frontend
npm install
npm start          # starts the React dev server on port 3000
```

Open [http://localhost:3000](http://localhost:3000) in your browser.  The frontend proxies `/api/*` requests to the backend automatically.

## Architecture

```
frontend/src/
├── domain/                          # Business logic (TypeScript)
│   ├── types.ts                     # Employee & EmployeeFormData interfaces
│   ├── validation.ts                # validateEmail / validateEmployee
│   ├── employeeService.ts           # IEmployeeService interface + HTTP implementation
│   └── EmployeeServiceContext.tsx   # React context for dependency injection
├── components/                      # UI components (TypeScript/React)
│   ├── EmployeeList.tsx
│   ├── EmployeeForm.tsx
│   └── Chat.js                      # Real-time encrypted chat panel
├── App.tsx                          # Root component
└── index.tsx                        # Entry point — wraps <App> in <EmployeeServiceProvider>
```

### Dependency Injection in Tests

Wrap the component under test with `<EmployeeServiceProvider service={mockService}>` to inject a mock without touching the network:

```tsx
import { render } from '@testing-library/react';
import { EmployeeServiceProvider } from '../domain/EmployeeServiceContext';
import { IEmployeeService } from '../domain/employeeService';
import EmployeeList from './EmployeeList';

const mockService: IEmployeeService = {
  getAll: jest.fn().mockResolvedValue([]),
  getById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

render(
  <EmployeeServiceProvider service={mockService}>
    <EmployeeList employees={[]} onEdit={jest.fn()} onDelete={jest.fn()} onFilter={jest.fn()} />
  </EmployeeServiceProvider>
);
```

## Testing

```bash
cd frontend
npm test                 # watch mode
npm run test:coverage    # single run with coverage report
```

Coverage thresholds (80 % minimum) are enforced over `src/domain/**`.

## Code Quality

The project follows the **Airbnb style guide**.  Run the linter with:

```bash
cd frontend
npx eslint src --ext .ts,.tsx
```

TypeScript strict mode is enabled in `tsconfig.json`.

## Security

- All user input is validated with `validateEmployee` before it is sent to the API.
- The backend also validates all fields and uses **parameterized queries** (SQLite prepared statements) to prevent SQL injection.
- API rate limiting is enforced with `express-rate-limit` (200 requests per 15 minutes).
- Chat messages are end-to-end encrypted — the server stores and relays only ciphertext; plaintext is never transmitted.
- Secrets and API keys must never be committed; the `.gitignore` excludes `.env` and database files.

## Documentation

- [Technical Design Document](DESIGN.md) — System architecture, API design, data models, security, performance, and deployment strategy.

