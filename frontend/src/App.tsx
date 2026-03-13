/**
 * Root application component.
 *
 * Manages top-level state (employees, form visibility, chat panel) and
 * delegates data-access to the injected {@link IEmployeeService}.
 *
 * @module App
 */

import React, { useState, useEffect, useCallback } from 'react';
import EmployeeList from './components/EmployeeList';
import EmployeeForm from './components/EmployeeForm';
import Chat from './components/Chat';
import { useEmployeeService } from './domain/EmployeeServiceContext';
import { Employee, EmployeeFormData } from './domain/types';
import './App.css';

/**
 * Generates or retrieves a stable anonymous user ID for the current browser
 * session, persisted in `sessionStorage`.
 *
 * @returns A random user ID string prefixed with "user-".
 */
function getOrCreateChatUserId(): string {
  const stored = sessionStorage.getItem('chatUserId');
  if (stored) return stored;
  const generated = `user-${Math.random().toString(36).slice(2, 9)}`;
  sessionStorage.setItem('chatUserId', generated);
  return generated;
}

/**
 * Top-level application shell component.
 *
 * @example
 * <App />
 */
function App(): JSX.Element {
  const employeeService = useEmployeeService();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [showForm, setShowForm] = useState<boolean>(false);
  const [showChat, setShowChat] = useState<boolean>(false);
  const [chatUserId] = useState<string>(getOrCreateChatUserId);

  /**
   * Fetches the list of employees from the API, optionally filtered by
   * department.
   *
   * @param department - Department name to filter by. Pass an empty string
   *   (default) to retrieve all employees.
   */
  const fetchEmployees = useCallback(
    async (department = ''): Promise<void> => {
      try {
        setLoading(true);
        const data = await employeeService.getAll(department);
        setEmployees(data);
        setError(null);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    },
    [employeeService]
  );

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  /**
   * Creates a new employee record and refreshes the list.
   *
   * @param employeeData - Form payload for the new employee.
   */
  const handleCreate = async (employeeData: EmployeeFormData): Promise<void> => {
    await employeeService.create(employeeData);
    await fetchEmployees();
    setShowForm(false);
  };

  /**
   * Updates an existing employee record and refreshes the list.
   *
   * @param id           - UUID of the employee to update.
   * @param employeeData - Updated form payload.
   */
  const handleUpdate = async (id: string, employeeData: EmployeeFormData): Promise<void> => {
    await employeeService.update(id, employeeData);
    await fetchEmployees();
    setEditingEmployee(null);
    setShowForm(false);
  };

  /**
   * Deletes an employee after user confirmation and refreshes the list.
   *
   * @param id - UUID of the employee to delete.
   */
  const handleDelete = async (id: string): Promise<void> => {
    if (!window.confirm('Are you sure you want to delete this employee?')) return;
    await employeeService.delete(id);
    await fetchEmployees();
  };

  /**
   * Opens the edit form pre-populated with the given employee data.
   *
   * @param employee - The employee to edit.
   */
  const handleEdit = (employee: Employee): void => {
    setEditingEmployee(employee);
    setShowForm(true);
  };

  /** Dismisses the form and clears any editing state. */
  const handleCancel = (): void => {
    setEditingEmployee(null);
    setShowForm(false);
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>Employee Management System</h1>
        {!showForm && (
          <button className="btn btn-primary" type="button" onClick={() => setShowForm(true)}>
            + Add Employee
          </button>
        )}
        <button
          className="btn btn-secondary"
          type="button"
          onClick={() => setShowChat((v) => !v)}
          style={{ marginLeft: '0.5rem' }}
        >
          {showChat ? 'Hide Chat' : '💬 Team Chat'}
        </button>
      </header>
      <main className="app-main">
        {showForm && (
          <EmployeeForm
            employee={editingEmployee}
            onSubmit={
              editingEmployee
                ? (data: EmployeeFormData) => handleUpdate(editingEmployee.id, data)
                : handleCreate
            }
            onCancel={handleCancel}
          />
        )}
        {error && <div className="error-message">{error}</div>}
        {loading ? (
          <div className="loading">Loading employees...</div>
        ) : (
          <EmployeeList
            employees={employees}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onFilter={fetchEmployees}
          />
        )}
        {showChat && <Chat userId={chatUserId} />}
      </main>
    </div>
  );
}

export default App;
