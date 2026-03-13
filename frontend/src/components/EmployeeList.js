import React, { useState, useMemo } from 'react';

function EmployeeList({ employees, onEdit, onDelete, onFilter }) {
  const [filterDept, setFilterDept] = useState('');

  const departments = useMemo(() => {
    const depts = [...new Set(employees.map((e) => e.department))].sort();
    return depts;
  }, [employees]);

  const handleFilterChange = (e) => {
    const dept = e.target.value;
    setFilterDept(dept);
    onFilter(dept);
  };

  return (
    <div className="employee-list">
      <div className="list-header">
        <h2>Employees ({employees.length})</h2>
        <div className="filter-section">
          <label htmlFor="dept-filter">Filter by Department:</label>
          <select id="dept-filter" value={filterDept} onChange={handleFilterChange}>
            <option value="">All Departments</option>
            {departments.map((dept) => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
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
                    <button className="btn btn-secondary btn-sm" onClick={() => onEdit(emp)}>Edit</button>
                    <button className="btn btn-danger btn-sm" onClick={() => onDelete(emp.id)}>Delete</button>
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
