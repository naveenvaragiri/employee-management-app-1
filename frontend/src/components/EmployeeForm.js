import React, { useState, useEffect } from 'react';

const emptyForm = {
  name: '',
  email: '',
  department: '',
  role: '',
  hire_date: '',
};

function EmployeeForm({ employee, onSubmit, onCancel }) {
  const [formData, setFormData] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  useEffect(() => {
    if (employee) {
      setFormData({
        name: employee.name || '',
        email: employee.email || '',
        department: employee.department || '',
        role: employee.role || '',
        hire_date: employee.hire_date || '',
      });
    } else {
      setFormData(emptyForm);
    }
  }, [employee]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      await onSubmit(formData);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="form-container">
      <h2>{employee ? 'Edit Employee' : 'Add New Employee'}</h2>
      {formError && <div className="error-message">{formError}</div>}
      <form onSubmit={handleSubmit} className="employee-form">
        <div className="form-group">
          <label htmlFor="name">Name *</label>
          <input
            id="name"
            name="name"
            type="text"
            value={formData.name}
            onChange={handleChange}
            required
            placeholder="Full name"
          />
        </div>
        <div className="form-group">
          <label htmlFor="email">Email *</label>
          <input
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            required
            placeholder="email@example.com"
          />
        </div>
        <div className="form-group">
          <label htmlFor="department">Department *</label>
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
          <datalist id="dept-suggestions">
            <option value="Engineering" />
            <option value="Marketing" />
            <option value="Sales" />
            <option value="HR" />
            <option value="Finance" />
          </datalist>
        </div>
        <div className="form-group">
          <label htmlFor="role">Role *</label>
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
          <datalist id="role-suggestions">
            <option value="Engineer" />
            <option value="Manager" />
            <option value="Director" />
            <option value="Analyst" />
            <option value="Designer" />
          </datalist>
        </div>
        <div className="form-group">
          <label htmlFor="hire_date">Hire Date *</label>
          <input
            id="hire_date"
            name="hire_date"
            type="date"
            value={formData.hire_date}
            onChange={handleChange}
            required
          />
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
