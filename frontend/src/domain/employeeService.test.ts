/**
 * Unit tests for domain/employeeService.ts
 *
 * The global `fetch` is replaced with a Jest mock so no network calls are made.
 */

import { EmployeeService } from './employeeService';
import { Employee, EmployeeFormData } from './types';

/** Helper to create a mock fetch response. */
function mockFetchResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

const sampleEmployee: Employee = {
  id: 'abc-123',
  name: 'Alice Smith',
  email: 'alice@example.com',
  department: 'Engineering',
  role: 'Engineer',
  hire_date: '2024-01-15',
};

const sampleFormData: EmployeeFormData = {
  name: 'Alice Smith',
  email: 'alice@example.com',
  department: 'Engineering',
  role: 'Engineer',
  hire_date: '2024-01-15',
};

describe('EmployeeService', () => {
  let service: EmployeeService;

  beforeEach(() => {
    service = new EmployeeService('/api/employees');
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  // ── getAll ──────────────────────────────────────────────────────────────────

  describe('getAll', () => {
    it('calls the base URL when no department is supplied', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(
        mockFetchResponse([sampleEmployee])
      );

      const result = await service.getAll();

      expect(global.fetch).toHaveBeenCalledWith('/api/employees');
      expect(result).toEqual([sampleEmployee]);
    });

    it('appends the department query parameter when provided', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(
        mockFetchResponse([sampleEmployee])
      );

      await service.getAll('Engineering');

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/employees?department=Engineering'
      );
    });

    it('URL-encodes the department query parameter', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(
        mockFetchResponse([sampleEmployee])
      );

      await service.getAll('Human Resources');

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/employees?department=Human%20Resources'
      );
    });

    it('throws when the response is not ok', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(
        mockFetchResponse({ error: 'Server error' }, false, 500)
      );

      await expect(service.getAll()).rejects.toThrow('Failed to fetch employees');
    });
  });

  // ── getById ─────────────────────────────────────────────────────────────────

  describe('getById', () => {
    it('fetches a single employee by ID', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(
        mockFetchResponse(sampleEmployee)
      );

      const result = await service.getById('abc-123');

      expect(global.fetch).toHaveBeenCalledWith('/api/employees/abc-123');
      expect(result).toEqual(sampleEmployee);
    });

    it('throws when the employee is not found', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(
        mockFetchResponse({ error: 'Not found' }, false, 404)
      );

      await expect(service.getById('missing')).rejects.toThrow('Employee not found');
    });
  });

  // ── create ──────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('POSTs the form data and returns the created employee', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(
        mockFetchResponse(sampleEmployee, true, 201)
      );

      const result = await service.create(sampleFormData);

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/employees',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sampleFormData),
        })
      );
      expect(result).toEqual(sampleEmployee);
    });

    it('throws with the API error message on failure', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(
        mockFetchResponse({ error: 'Email already exists' }, false, 409)
      );

      await expect(service.create(sampleFormData)).rejects.toThrow('Email already exists');
    });

    it('throws a generic message when the API returns no error field', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(
        mockFetchResponse({}, false, 500)
      );

      await expect(service.create(sampleFormData)).rejects.toThrow('Failed to create employee');
    });
  });

  // ── update ──────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('PUTs the form data and returns the updated employee', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(
        mockFetchResponse(sampleEmployee)
      );

      const result = await service.update('abc-123', sampleFormData);

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/employees/abc-123',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(sampleFormData),
        })
      );
      expect(result).toEqual(sampleEmployee);
    });

    it('throws with the API error message on failure', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(
        mockFetchResponse({ error: 'Employee not found' }, false, 404)
      );

      await expect(service.update('missing', sampleFormData)).rejects.toThrow('Employee not found');
    });
  });

  // ── delete ──────────────────────────────────────────────────────────────────

  describe('delete', () => {
    it('sends a DELETE request for the given ID', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(
        mockFetchResponse({ message: 'Deleted' })
      );

      await service.delete('abc-123');

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/employees/abc-123',
        { method: 'DELETE' }
      );
    });

    it('throws with the API error message on failure', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(
        mockFetchResponse({ error: 'Employee not found' }, false, 404)
      );

      await expect(service.delete('missing')).rejects.toThrow('Employee not found');
    });
  });
});
