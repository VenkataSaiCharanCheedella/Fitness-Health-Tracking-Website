/* User service — owns member accounts. Port 4001 */
const { createService } = require('../shared/service');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// This service's own data store (each microservice keeps its own data)
let nextId = 4;
const users = [
  { id: 1, name: 'Charan',   email: 'charan@example.com',   goal: 'Build muscle' },
  { id: 2, name: 'Srinidhi', email: 'srinidhi@example.com', goal: 'Improve stamina' },
  { id: 3, name: 'Lasya',    email: 'lasya@example.com',    goal: 'Stay healthy' }
];

createService({
  name: 'user-service',
  port: process.env.PORT || 4001,
  routes: [
    ['GET', '/users', () => ({ body: users })],

    ['GET', '/users/:id', ({ params }) => {
      const user = users.find(u => u.id === Number(params.id));
      return user ? { body: user } : { status: 404, body: { error: 'User not found' } };
    }],

    ['POST', '/users', ({ body }) => {
      const name  = String(body.name || '').trim();
      const email = String(body.email || '').trim().toLowerCase();
      const errors = [];
      if (name.length < 2)        errors.push('name must be at least 2 characters');
      if (!EMAIL_RE.test(email))  errors.push('email is not valid');
      if (users.some(u => u.email === email)) errors.push('email is already registered');
      if (errors.length) return { status: 400, body: { errors } };

      const user = { id: nextId++, name, email, goal: String(body.goal || 'Stay healthy') };
      users.push(user);
      return { status: 201, body: user };
    }]
  ]
});
