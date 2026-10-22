/* Stats service — builds the leaderboard from the other two services. Port 4003 */
const { createService, callService } = require('../shared/service');

const USER_SERVICE    = process.env.USER_SERVICE_URL    || 'http://localhost:4001';
const WORKOUT_SERVICE = process.env.WORKOUT_SERVICE_URL || 'http://localhost:4002';

createService({
  name: 'stats-service',
  port: process.env.PORT || 4003,
  routes: [
    ['GET', '/stats', async () => {
      // Ask both services at the same time
      const [users, workouts] = await Promise.all([
        callService(USER_SERVICE, '/users'),
        callService(WORKOUT_SERVICE, '/workouts')
      ]);

      const list = workouts.data;
      const leaderboard = users.data.map(u => {
        const mine = list.filter(w => w.userId === u.id);
        return {
          userId: u.id,
          name: u.name,
          workouts: mine.length,
          minutes: mine.reduce((s, w) => s + w.duration, 0),
          calories: mine.reduce((s, w) => s + w.calories, 0)
        };
      }).sort((a, b) => b.calories - a.calories);

      return {
        body: {
          totals: {
            members: users.data.length,
            workouts: list.length,
            minutes: list.reduce((s, w) => s + w.duration, 0),
            calories: list.reduce((s, w) => s + w.calories, 0)
          },
          leaderboard
        }
      };
    }]
  ]
});
