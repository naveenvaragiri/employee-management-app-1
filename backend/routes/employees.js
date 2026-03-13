const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../database');

// GET /api/employees - list all, optional ?department=X filter
router.get('/', (req, res) => {
  try {
    const { department } = req.query;
    let employees;
    if (department) {
      employees = db.prepare('SELECT * FROM employees WHERE department = ? ORDER BY name').all(department);
    } else {
      employees = db.prepare('SELECT * FROM employees ORDER BY name').all();
    }
    res.json(employees);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch employees' });
  }
});

// GET /api/employees/:id
router.get('/:id', (req, res) => {
  try {
    const employee = db.prepare('SELECT * FROM employees WHERE id = ?').get(req.params.id);
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    res.json(employee);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch employee' });
  }
});

// POST /api/employees - create
router.post('/', (req, res) => {
  try {
    const { name, email, department, role, hire_date } = req.body;

    if (!name || !email || !department || !role || !hire_date) {
      return res.status(400).json({ error: 'All fields are required: name, email, department, role, hire_date' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    db.prepare(
      'INSERT INTO employees (id, name, email, department, role, hire_date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(id, name, email, department, role, hire_date, now, now);

    const employee = db.prepare('SELECT * FROM employees WHERE id = ?').get(id);
    res.status(201).json(employee);
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: 'Failed to create employee' });
  }
});

// PUT /api/employees/:id - update
router.put('/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM employees WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const { name, email, department, role, hire_date } = req.body;

    if (!name || !email || !department || !role || !hire_date) {
      return res.status(400).json({ error: 'All fields are required: name, email, department, role, hire_date' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const now = new Date().toISOString();

    db.prepare(
      'UPDATE employees SET name = ?, email = ?, department = ?, role = ?, hire_date = ?, updated_at = ? WHERE id = ?'
    ).run(name, email, department, role, hire_date, now, req.params.id);

    const employee = db.prepare('SELECT * FROM employees WHERE id = ?').get(req.params.id);
    res.json(employee);
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: 'Failed to update employee' });
  }
});

// DELETE /api/employees/:id
router.delete('/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM employees WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    db.prepare('DELETE FROM employees WHERE id = ?').run(req.params.id);
    res.json({ message: 'Employee deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete employee' });
  }
});

module.exports = router;
