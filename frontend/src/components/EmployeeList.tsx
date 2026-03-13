/**
 * EmployeeList component — renders a filterable table of employees.
 *
 * @module components/EmployeeList
 *
 * @example
 * <EmployeeList
 *   employees={employees}
 *   onEdit={handleEdit}
 *   onDelete={handleDelete}
 *   onFilter={fetchEmployees}
 * />
 */

import React, { useState, useMemo } from 'react';
import { Employee } from '../domain/types';

interface EmployeeListProps {
  /** Array of employee records to display. */
  employees: Employee[];
  /** Called when the user clicks "Edit" for an employee. */
  onEdit: (employee: Employee) => void;
  /** Called when the user clicks "Delete" for an employee, passing the employee ID. */
  onDelete: (id: string) => void;
  /**
   * Called when the user changes the department filter.
   * Pass an empty string to show all employees.
   */
  onFilter: (department: string) => void;
}

/**
 * Displays a table of employees with a department filter dropdown.
 *
 * Departments are derived from the current `employees` prop to avoid an
 * extra API call.  When a department is selected the `onFilter` callback is
 * invoked so the parent can re-fetch with the correct query parameter.
 */
function EmployeeList({ employees, onEdit, onDelete, onFilter }: EmployeeListProps): JSX.Element {
  const [filterDept, setFilterDept] = useState<string>('');

  /** Sorted unique list of departments derived from the current employee list. */
  const departments = useMemo<string[]>(() => {
    const depts = [...new Set(employees.map((e) => e.department))].sort();
    return depts;
  }, [employees]);

  /**
   * Handles a change to the department filter dropdown.
   *
   * @param e - The native change event from the `<select>` element.
   */
  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
    const dept = e.target.value;
    setFilterDept(dept);
    onFilter(dept);
  };

  return (
    <div className="employee-list">
      <div className="list-header">
        <h2>
          Employees (
          {employees.length}
          )
        </h2>
        <div className="filter-section">
          <label htmlFor="dept-filter">
            Filter by Department:
            <select id="dept-filter" value={filterDept} onChange={handleFilterChange}>
              <option value="">All Departments</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </label>
        </div>
      </div>
      {employees.length === 0 ? (
        <div className="empty-state">No employees found.</div>
      ) : (
        <div className="table-container">
          <table className="employee-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Department</th>
                <th>Role</th>
                <th>Hire Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => (
                <tr key={emp.id}>
                  <td>{emp.name}</td>
                  <td>{emp.email}</td>
                  <td><span className="badge">{emp.department}</span></td>
                  <td>{emp.role}</td>
                  <td>{emp.hire_date}</td>
                  <td className="actions">
                    <button
                      className="btn btn-secondary btn-sm"
                      type="button"
                      onClick={() => onEdit(emp)}
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      type="button"
                      onClick={() => onDelete(emp.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default EmployeeList;
