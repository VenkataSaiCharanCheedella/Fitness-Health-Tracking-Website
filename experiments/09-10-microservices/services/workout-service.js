/* Workout service — owns workout records. Port 4002
   Checks with the user service that a member exists before saving. */
const { createService, callService } = require('../shared/service');

const USER_SERVICE = process.env.USER_SERVICE_URL || 'http://localhost:4001';
const INTENSITIES  = ['Low', 'Medium', 'High'];

let nextId = 6;
const workouts = [
  { id: 1, userId: 1, type: 'Running',         duration: 35, calories: 380, intensity: 'High',   date: '2026-10-22' },
  { id: 2, userId: 2, type: 'Yoga',            duration: 40, calories: 160, intensity: 'Low',    date: '2026-10-22' },
  { id: 3, userId: 3, type: 'Cycling',         duration: 45, calories: 410, intensity: 'High',   date: '2026-10-21' },
  { id: 4, userId: 1, type: 'Weight Training', duration: 50, calories: 300, intensity: 'Medium', date: '2026-10-21' },
  { id: 5, userId: 2, type: 'Swimming',        duration: 30, calories: 290, intensity: 'Medium', date: '2026-10-20' }
];

createService({
  name: 'workout-service',
  port: process.env.PORT || 4002,
  routes: [
    ['GET', '/workouts', ({ query }) => {
      const userId = query.get('userId');
      return { body: userId ? workouts.filter(w => w.userId === Number(userId)) : workouts };
    }],

    ['POST', '/workouts', async ({ body }) => {
      const errors = [];
      if (!String(body.type || '').trim())        errors.push('type is required');
      if (!(Number(body.duration) > 0))            errors.push('duration must be greater than 0');
      if (!(Number(body.calories ?? 0) >= 0))      errors.push('calories cannot be negative');
      if (body.intensity && !INTENSITIES.includes(body.intensity)) errors.push('intensity must be Low, Medium or High');
      if (errors.length) return { status: 400, body: { errors } };

      // Service-to-service call over HTTP
      const { status } = await callService(USER_SERVICE, '/users/' + Number(body.userId));
      if (status === 404) return { status: 404, body: { errors: ['user does not exist'] } };

      const workout = {
        id: nextId++, userId: Number(body.userId), type: String(body.type).trim(),
        duration: Number(body.duration), calories: Number(body.calories || 0),
        intensity: body.intensity || 'Medium', date: new Date().toISOString().slice(0, 10)
      };
      workouts.unshift(workout);
      return { status: 201, body: workout };
    }],

    ['DELETE', '/workouts/:id', ({ params }) => {
      const i = workouts.findIndex(w => w.id === Number(params.id));
      if (i === -1) return { status: 404, body: { error: 'Workout not found' } };
      workouts.splice(i, 1);
      return { status: 204 };
    }]
  ]
});
