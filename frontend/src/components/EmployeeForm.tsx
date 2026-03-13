/**
 * EmployeeForm component — a controlled form for creating or editing employees.
 *
 * @module components/EmployeeForm
 *
 * @example
 * // Create mode
 * <EmployeeForm onSubmit={handleCreate} onCancel={handleCancel} />
 *
 * @example
 * // Edit mode
 * <EmployeeForm employee={currentEmployee} onSubmit={handleUpdate} onCancel={handleCancel} />
 */

import React, { useState, useEffect } from 'react';
import { Employee, EmployeeFormData } from '../domain/types';
import { validateEmployee } from '../domain/validation';

/** All-empty initial state used when opening the form in "create" mode. */
const emptyForm: EmployeeFormData = {
  name: '',
  email: '',
  department: '',
  role: '',
  hire_date: '',
};

interface EmployeeFormProps {
  /**
   * Employee to pre-populate the form for editing.
   * When `null` or `undefined` the form opens in create mode.
   */
  employee?: Employee | null;
  /**
   * Callback invoked with the validated form data on submission.
   * Throw an `Error` inside the callback to display an inline error message.
   */
  onSubmit: (data: EmployeeFormData) => Promise<void>;
  /** Callback invoked when the user clicks the Cancel button. */
  onCancel: () => void;
}

/**
 * Controlled form for creating or editing an employee.
 *
 * Client-side validation runs before `onSubmit` is called so that common
 * mistakes (e.g. malformed email) are caught immediately without a network
 * round-trip.
 */
function EmployeeForm({ employee, onSubmit, onCancel }: EmployeeFormProps): JSX.Element {
  const [formData, setFormData] = useState<EmployeeFormData>(emptyForm);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (employee) {
      setFormData({
        name: employee.name ?? '',
        email: employee.email ?? '',
        department: employee.department ?? '',
        role: employee.role ?? '',
        hire_date: employee.hire_date ?? '',
      });
    } else {
      setFormData(emptyForm);
    }
  }, [employee]);

  /**
   * Synchronises the React state with the controlled input value.
   *
   * @param e - The native change event from any of the form inputs.
   */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  /**
   * Validates and submits the form.
   *
   * Prevents the default browser form submission, runs client-side
   * validation, then calls `onSubmit`.  Displays an inline error on failure.
   *
   * @param e - The native submit event.
   */
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setFormError(null);

    const validationError = validateEmployee(formData);
    if (validationError) {
      setFormError(validationError);
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(formData);
    } catch (err) {
      setFormError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="form-container">
      <h2>{employee ? 'Edit Employee' : 'Add New Employee'}</h2>
      {formError && <div className="error-message">{formError}</div>}
      <form onSubmit={handleSubmit} className="employee-form" noValidate>
        <div className="form-group">
          <label htmlFor="name">
            Name *
            <input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="Full name"
            />
          </label>
        </div>
        <div className="form-group">
          <label htmlFor="email">
            Email *
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="email@example.com"
            />
          </label>
        </div>
        <div className="form-group">
          <label htmlFor="department">
            Department *
            <input
              id="department"
              name="department"
              type="text"
              value={formData.department}
              onChange={handleChange}
              required
              placeholder="e.g. Engineering, Marketing"
              list="dept-suggestions"
            />
          </label>
          <datalist id="dept-suggestions">
            <option value="Engineering" />
            <option value="Marketing" />
            <option value="Sales" />
            <option value="HR" />
            <option value="Finance" />
          </datalist>
        </div>
        <div className="form-group">
          <label htmlFor="role">
            Role *
            <input
              id="role"
              name="role"
              type="text"
              value={formData.role}
              onChange={handleChange}
              required
              placeholder="e.g. Engineer, Manager, Director"
              list="role-suggestions"
            />
          </label>
          <datalist id="role-suggestions">
            <option value="Engineer" />
            <option value="Manager" />
            <option value="Director" />
            <option value="Analyst" />
            <option value="Designer" />
          </datalist>
        </div>
        <div className="form-group">
          <label htmlFor="hire_date">
            Hire Date *
            <input
              id="hire_date"
              name="hire_date"
              type="date"
              value={formData.hire_date}
              onChange={handleChange}
              required
            />
          </label>
        </div>
        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Saving...' : employee ? 'Update Employee' : 'Add Employee'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

export default EmployeeForm;
