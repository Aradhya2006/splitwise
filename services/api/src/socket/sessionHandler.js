const pool = require('../config/db');
const redisClient = require('../config/redis');

const sessionHandler = (io) => {
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Join a bill session room
    socket.on('join_session', async ({ roomCode, userId, userName }) => {
      try {
        // Find session by room code
        const sessionResult = await pool.query(
          `SELECT s.*, b.title FROM sessions s 
           JOIN bills b ON s.bill_id = b.id 
           WHERE s.room_code = $1 AND s.status = 'active'`,
          [roomCode]
        );

        if (!sessionResult.rows[0]) {
          socket.emit('error', { message: 'Invalid or expired room code' });
          return;
        }

        const session = sessionResult.rows[0];
        const billId = session.bill_id;

        // Join the socket room
        socket.join(roomCode);
        socket.roomCode = roomCode;
        socket.userId = userId;
        socket.billId = billId;

        // Store user in Redis
        await redisClient.hSet(
          `session:${roomCode}:users`,
          userId,
          JSON.stringify({ userId, userName, joinedAt: Date.now() })
        );

        // Get all users in room from Redis
        const allUsers = await redisClient.hGetAll(`session:${roomCode}:users`);
        const usersList = Object.values(allUsers).map(u => JSON.parse(u));

        // Get current item assignments from Redis
        const assignments = await redisClient.hGetAll(`session:${roomCode}:assignments`);

        // Tell everyone someone joined
        io.to(roomCode).emit('user_joined', {
          userId,
          userName,
          users: usersList
        });

        // Send current state to the person who just joined
        socket.emit('session_state', {
          billId,
          billTitle: session.title,
          roomCode,
          users: usersList,
          assignments
        });

        console.log(`${userName} joined room ${roomCode}`);

      } catch (err) {
        console.error(err);
        socket.emit('error', { message: 'Server error' });
      }
    });

    // User assigns an item to themselves
    socket.on('assign_item', async ({ itemId, percentage }) => {
      try {
        const { roomCode, userId, billId } = socket;

        if (!roomCode || !userId) {
          socket.emit('error', { message: 'Not in a session' });
          return;
        }

        // Store assignment in Redis
        const assignmentKey = `${itemId}:${userId}`;
        await redisClient.hSet(
          `session:${roomCode}:assignments`,
          assignmentKey,
          JSON.stringify({ itemId, userId, percentage, updatedAt: Date.now() })
        );

        // Broadcast to everyone in the room
        io.to(roomCode).emit('item_assigned', {
          itemId,
          userId,
          percentage
        });

        console.log(`User ${userId} assigned ${percentage}% of item ${itemId}`);

      } catch (err) {
        console.error(err);
        socket.emit('error', { message: 'Server error' });
      }
    });

    // User confirms their selections
    socket.on('confirm_selections', async () => {
      try {
        const { roomCode, userId, billId } = socket;

        // Mark user as confirmed in Redis
        await redisClient.hSet(
          `session:${roomCode}:confirmed`,
          userId,
          'true'
        );

        // Tell everyone this user confirmed
        io.to(roomCode).emit('user_confirmed', { userId });

        // Check if ALL members confirmed
        const confirmed = await redisClient.hGetAll(`session:${roomCode}:confirmed`);
        const users = await redisClient.hGetAll(`session:${roomCode}:users`);

        if (Object.keys(confirmed).length === Object.keys(users).length) {
          // Everyone confirmed — save splits to DB
          await saveSplitsToDB(roomCode, billId);

          // Tell everyone to proceed to payment
          io.to(roomCode).emit('all_confirmed', {
            message: 'Everyone confirmed! Proceeding to payment.'
          });
        }

      } catch (err) {
        console.error(err);
        socket.emit('error', { message: 'Server error' });
      }
    });

    // Handle disconnect
    socket.on('disconnect', async () => {
      const { roomCode, userId } = socket;

      if (roomCode && userId) {
        // Remove from Redis
        await redisClient.hDel(`session:${roomCode}:users`, userId);

        // Tell everyone they left
        io.to(roomCode).emit('user_left', { userId });

        console.log(`User ${userId} left room ${roomCode}`);
      }
    });
  });
};

// Save all assignments from Redis to PostgreSQL
const saveSplitsToDB = async (roomCode, billId) => {
  try {
    const assignments = await redisClient.hGetAll(`session:${roomCode}:assignments`);

    for (const key of Object.keys(assignments)) {
      const { itemId, userId, percentage } = JSON.parse(assignments[key]);

      // Get item price
      const itemResult = await pool.query(
        'SELECT price FROM items WHERE id = $1',
        [itemId]
      );

      if (!itemResult.rows[0]) continue;

      const amount = (itemResult.rows[0].price * percentage) / 100;

      // Save to item_splits table
      await pool.query(
        `INSERT INTO item_splits (item_id, user_id, percentage, amount)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT DO NOTHING`,
        [itemId, userId, percentage, amount]
      );
    }

    // Update each member's total amount owed
    await pool.query(
      `UPDATE bill_members bm
       SET amount_owed = (
         SELECT COALESCE(SUM(its.amount), 0)
         FROM item_splits its
         JOIN items i ON its.item_id = i.id
         WHERE i.bill_id = $1 AND its.user_id = bm.user_id
       )
       WHERE bm.bill_id = $1`,
      [billId]
    );

    // Update bill status
    await pool.query(
      `UPDATE bills SET status = 'confirmed' WHERE id = $1`,
      [billId]
    );

    console.log(`Splits saved to DB for bill ${billId}`);

  } catch (err) {
    console.error('Error saving splits:', err);
  }
};

module.exports = sessionHandler;