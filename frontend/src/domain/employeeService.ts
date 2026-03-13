/**
 * Employee API service with a dependency-injectable interface.
 *
 * Use {@link IEmployeeService} in component props/context so that tests can
 * swap in a mock implementation without touching the network.
 *
 * @module domain/employeeService
 */

import { Employee, EmployeeFormData } from './types';

/**
 * Contract for the employee data-access layer.
 * Components depend on this interface, not on the concrete class, so that
 * a mock can be injected during tests.
 */
export interface IEmployeeService {
  /**
   * Retrieves all employees, optionally filtered by department.
   * @param department - Optional department name to filter by.
   */
  getAll(department?: string): Promise<Employee[]>;

  /**
   * Retrieves a single employee by their unique identifier.
   * @param id - UUID of the employee.
   */
  getById(id: string): Promise<Employee>;

  /**
   * Creates a new employee record.
   * @param data - Form payload with all required employee fields.
   */
  create(data: EmployeeFormData): Promise<Employee>;

  /**
   * Updates an existing employee record.
   * @param id   - UUID of the employee to update.
   * @param data - Updated form payload.
   */
  update(id: string, data: EmployeeFormData): Promise<Employee>;

  /**
   * Permanently deletes an employee record.
   * @param id - UUID of the employee to delete.
   */
  delete(id: string): Promise<void>;
}

/**
 * Concrete HTTP implementation of {@link IEmployeeService}.
 *
 * @example
 * const service = new EmployeeService('/api/employees');
 * const employees = await service.getAll('Engineering');
 */
export class EmployeeService implements IEmployeeService {
  private readonly baseUrl: string;

  /**
   * @param baseUrl - Base URL for the employees REST endpoint.
   *   Defaults to `/api/employees`.
   */
  constructor(baseUrl = '/api/employees') {
    this.baseUrl = baseUrl;
  }

  /** @inheritdoc */
  async getAll(department = ''): Promise<Employee[]> {
    const url = department
      ? `${this.baseUrl}?department=${encodeURIComponent(department)}`
      : this.baseUrl;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch employees');
    return response.json() as Promise<Employee[]>;
  }

  /** @inheritdoc */
  async getById(id: string): Promise<Employee> {
    const response = await fetch(`${this.baseUrl}/${id}`);
    if (!response.ok) throw new Error('Employee not found');
    return response.json() as Promise<Employee>;
  }

  /** @inheritdoc */
  async create(data: EmployeeFormData): Promise<Employee> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const err = await response.json() as { error?: string };
      throw new Error(err.error ?? 'Failed to create employee');
    }
    return response.json() as Promise<Employee>;
  }

  /** @inheritdoc */
  async update(id: string, data: EmployeeFormData): Promise<Employee> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const err = await response.json() as { error?: string };
      throw new Error(err.error ?? 'Failed to update employee');
    }
    return response.json() as Promise<Employee>;
  }

  /** @inheritdoc */
  async delete(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${id}`, { method: 'DELETE' });
    if (!response.ok) {
      const err = await response.json() as { error?: string };
      throw new Error(err.error ?? 'Failed to delete employee');
    }
  }
}

/** Default singleton service instance used by the application. */
export const defaultEmployeeService: IEmployeeService = new EmployeeService();
