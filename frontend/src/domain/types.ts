/**
 * Core domain types for the Employee Management application.
 * @module domain/types
 */

/**
 * Represents a persisted employee record returned from the API.
 */
export interface Employee {
  /** Unique identifier (UUID) */
  id: string;
  /** Full name of the employee */
  name: string;
  /** Unique email address */
  email: string;
  /** Department the employee belongs to */
  department: string;
  /** Job role / title */
  role: string;
  /** ISO date string (YYYY-MM-DD) for the employee's hire date */
  hire_date: string;
  /** ISO timestamp when the record was created */
  created_at?: string;
  /** ISO timestamp when the record was last updated */
  updated_at?: string;
}

/**
 * Data required to create or update an employee.
 * Excludes server-generated fields.
 */
export type EmployeeFormData = Omit<Employee, 'id' | 'created_at' | 'updated_at'>;

/**
 * Standard API error response shape.
 */
export interface ApiError {
  /** Human-readable error message */
  error: string;
}
