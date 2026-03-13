/**
 * Input validation logic for employee domain objects.
 * @module domain/validation
 */

import { EmployeeFormData } from './types';

/**
 * Validates that a string is a well-formed email address.
 *
 * @param email - The email string to validate.
 * @returns `true` when the email matches the expected format, `false` otherwise.
 *
 * @example
 * validateEmail('user@example.com'); // true
 * validateEmail('not-an-email');     // false
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validates all fields of an employee form payload.
 *
 * @param data - The form data to validate.
 * @returns `null` when all fields are valid, or a human-readable error
 *   message describing the first validation failure found.
 *
 * @example
 * const err = validateEmployee({ name: 'Alice', email: 'alice@corp.com',
 *   department: 'Engineering', role: 'Engineer', hire_date: '2024-01-15' });
 * // err === null  (all valid)
 *
 * const err2 = validateEmployee({ name: '', email: 'alice@corp.com',
 *   department: 'Engineering', role: 'Engineer', hire_date: '2024-01-15' });
 * // err2 === 'Name is required'
 */
export function validateEmployee(data: EmployeeFormData): string | null {
  const { name, email, department, role, hire_date } = data;

  if (!name?.trim()) return 'Name is required';
  if (!email?.trim()) return 'Email is required';
  if (!validateEmail(email)) return 'Invalid email format';
  if (!department?.trim()) return 'Department is required';
  if (!role?.trim()) return 'Role is required';
  if (!hire_date?.trim()) return 'Hire date is required';

  return null;
}
