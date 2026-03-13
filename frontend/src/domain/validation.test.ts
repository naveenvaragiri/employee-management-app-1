/**
 * Unit tests for domain/validation.ts
 */

import { validateEmail, validateEmployee } from './validation';
import { EmployeeFormData } from './types';

const validEmployee: EmployeeFormData = {
  name: 'Alice Smith',
  email: 'alice@example.com',
  department: 'Engineering',
  role: 'Engineer',
  hire_date: '2024-01-15',
};

describe('validateEmail', () => {
  it('returns true for a valid email address', () => {
    expect(validateEmail('user@example.com')).toBe(true);
  });

  it('returns true for an email with a subdomain', () => {
    expect(validateEmail('user@mail.corp.com')).toBe(true);
  });

  it('returns false when the @ sign is missing', () => {
    expect(validateEmail('notanemail')).toBe(false);
  });

  it('returns false when the domain part is missing', () => {
    expect(validateEmail('user@')).toBe(false);
  });

  it('returns false for an empty string', () => {
    expect(validateEmail('')).toBe(false);
  });

  it('returns false when there is a space in the address', () => {
    expect(validateEmail('user @example.com')).toBe(false);
  });
});

describe('validateEmployee', () => {
  it('returns null when all fields are valid', () => {
    expect(validateEmployee(validEmployee)).toBeNull();
  });

  it('returns an error when name is empty', () => {
    const data = { ...validEmployee, name: '' };
    expect(validateEmployee(data)).toBe('Name is required');
  });

  it('returns an error when name is only whitespace', () => {
    const data = { ...validEmployee, name: '   ' };
    expect(validateEmployee(data)).toBe('Name is required');
  });

  it('returns an error when email is empty', () => {
    const data = { ...validEmployee, email: '' };
    expect(validateEmployee(data)).toBe('Email is required');
  });

  it('returns an error when email format is invalid', () => {
    const data = { ...validEmployee, email: 'not-an-email' };
    expect(validateEmployee(data)).toBe('Invalid email format');
  });

  it('returns an error when department is empty', () => {
    const data = { ...validEmployee, department: '' };
    expect(validateEmployee(data)).toBe('Department is required');
  });

  it('returns an error when department is only whitespace', () => {
    const data = { ...validEmployee, department: '  ' };
    expect(validateEmployee(data)).toBe('Department is required');
  });

  it('returns an error when role is empty', () => {
    const data = { ...validEmployee, role: '' };
    expect(validateEmployee(data)).toBe('Role is required');
  });

  it('returns an error when hire_date is empty', () => {
    const data = { ...validEmployee, hire_date: '' };
    expect(validateEmployee(data)).toBe('Hire date is required');
  });

  it('returns an error when hire_date is only whitespace', () => {
    const data = { ...validEmployee, hire_date: '   ' };
    expect(validateEmployee(data)).toBe('Hire date is required');
  });
});
