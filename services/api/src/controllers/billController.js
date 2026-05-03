const pool = require('../config/db');

// Create a new bill
const createBill = async (req, res) => {
  const { title } = req.body;
  const userId = req.user.userId;

  if (!title) {
    return res.status(400).json({ error: 'Bill title is required' });
  }

  try {
    // Create the bill
    const billResult = await pool.query(
      `INSERT INTO bills (created_by, title, status) 
       VALUES ($1, $2, 'draft') RETURNING *`,
      [userId, title]
    );
    const bill = billResult.rows[0];

    // Add creator as first member
    await pool.query(
      `INSERT INTO bill_members (bill_id, user_id) 
       VALUES ($1, $2)`,
      [bill.id, userId]
    );

    // Generate room code for live session
    const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    await pool.query(
      `INSERT INTO sessions (bill_id, room_code, expires_at) 
       VALUES ($1, $2, NOW() + INTERVAL '24 hours')`,
      [bill.id, roomCode]
    );

    res.status(201).json({
      message: 'Bill created successfully',
      bill,
      room_code: roomCode
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Add item to bill
const addItem = async (req, res) => {
  const { billId } = req.params;
  const { name, price, quantity } = req.body;

  if (!name || !price) {
    return res.status(400).json({ error: 'Item name and price are required' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO items (bill_id, name, price, quantity) 
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [billId, name, price, quantity || 1]
    );

    // Recalculate bill subtotal
   await pool.query(
  `UPDATE bills SET 
    subtotal = (SELECT SUM(price * quantity) FROM items WHERE bill_id = $1),
    total = (SELECT SUM(price * quantity) FROM items WHERE bill_id = $1) + cgst + sgst + service_charge
   WHERE id = $1`,
  [billId]
);

    res.status(201).json({
      message: 'Item added',
      item: result.rows[0]
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get bill details with all items and members
const getBill = async (req, res) => {
  const { billId } = req.params;

  try {
    // Get bill
    const billResult = await pool.query(
      'SELECT * FROM bills WHERE id = $1',
      [billId]
    );

    if (!billResult.rows[0]) {
      return res.status(404).json({ error: 'Bill not found' });
    }

    // Get items
    const itemsResult = await pool.query(
      'SELECT * FROM items WHERE bill_id = $1',
      [billId]
    );

    // Get members
    const membersResult = await pool.query(
      `SELECT u.id, u.name, u.phone, u.upi_id, bm.amount_owed, bm.status
       FROM bill_members bm
       JOIN users u ON bm.user_id = u.id
       WHERE bm.bill_id = $1`,
      [billId]
    );

    // Get room code
    const sessionResult = await pool.query(
      'SELECT room_code FROM sessions WHERE bill_id = $1',
      [billId]
    );

    res.json({
      bill: billResult.rows[0],
      items: itemsResult.rows,
      members: membersResult.rows,
      room_code: sessionResult.rows[0]?.room_code
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};


// Add member to bill by phone
const addMember = async (req, res) => {
  const { billId } = req.params;
  const { phone } = req.body;

  try {
    // Find user by phone
    const userResult = await pool.query(
      'SELECT * FROM users WHERE phone = $1',
      [phone]
    );

    if (!userResult.rows[0]) {
      return res.status(404).json({ 
        error: 'User not found. They need to sign up first.' 
      });
    }

    const user = userResult.rows[0];

    // Add to bill members
    await pool.query(
      `INSERT INTO bill_members (bill_id, user_id) 
       VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [billId, user.id]
    );

    res.json({
      message: 'Member added successfully',
      user: { id: user.id, name: user.name, phone: user.phone }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};



// Get all bills for current user
const getUserBills = async (req, res) => {
  const userId = req.user.userId;
  try {
    const result = await pool.query(
      `SELECT b.* FROM bills b
       JOIN bill_members bm ON b.id = bm.bill_id
       WHERE bm.user_id = $1
       ORDER BY b.created_at DESC`,
      [userId]
    );
    res.json({ bills: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};


const deleteItem = async (req, res) => {
  const { itemId, billId } = req.params;
  try {
    await pool.query('DELETE FROM items WHERE id = $1', [itemId]);

    // Recalculate subtotal and total
    await pool.query(
      `UPDATE bills SET 
        subtotal = COALESCE((SELECT SUM(price * quantity) FROM items WHERE bill_id = $1), 0),
        total = COALESCE((SELECT SUM(price * quantity) FROM items WHERE bill_id = $1), 0) + cgst + sgst + service_charge
       WHERE id = $1`,
      [billId]
    );

    res.json({ message: 'Item deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { createBill, addItem, getBill, addMember, getUserBills, deleteItem };
