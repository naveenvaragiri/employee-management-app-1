import React, { useState, useEffect } from 'react';
import EmployeeList from './components/EmployeeList';
import EmployeeForm from './components/EmployeeForm';
import Chat from './components/Chat';
import './App.css';

function App() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showChat, setShowChat] = useState(false);
  // Stable userId for this browser session (persisted in sessionStorage).
  const [chatUserId] = useState(() => {
    const stored = sessionStorage.getItem('chatUserId');
    if (stored) return stored;
    const generated = `user-${Math.random().toString(36).slice(2, 9)}`;
    sessionStorage.setItem('chatUserId', generated);
    return generated;
  });

  const fetchEmployees = async (department = '') => {
    try {
      setLoading(true);
      const url = department ? `/api/employees?department=${encodeURIComponent(department)}` : '/api/employees';
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch employees');
      const data = await response.json();
      setEmployees(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleCreate = async (employeeData) => {
    const response = await fetch('/api/employees', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(employeeData),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Failed to create employee');
    }
    await fetchEmployees();
    setShowForm(false);
  };

  const handleUpdate = async (id, employeeData) => {
    const response = await fetch(`/api/employees/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(employeeData),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Failed to update employee');
    }
    await fetchEmployees();
    setEditingEmployee(null);
    setShowForm(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this employee?')) return;
    const response = await fetch(`/api/employees/${id}`, { method: 'DELETE' });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Failed to delete employee');
    }
    await fetchEmployees();
  };

  const handleEdit = (employee) => {
    setEditingEmployee(employee);
    setShowForm(true);
  };

  const handleCancel = () => {
    setEditingEmployee(null);
    setShowForm(false);
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>Employee Management System</h1>
        {!showForm && (
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            + Add Employee
          </button>
        )}
        <button
          className="btn btn-secondary"
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
            onSubmit={editingEmployee ? (data) => handleUpdate(editingEmployee.id, data) : handleCreate}
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
