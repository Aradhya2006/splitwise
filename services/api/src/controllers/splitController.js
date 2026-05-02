const pool = require('../config/db');

// Calculate splits for all items in a bill
const calculateSplits = async (req, res) => {
  const { billId } = req.params;
  const { splits, tax, discount } = req.body;

  // splits format:
  // [{ itemId, assignments: [{ userId, percentage }] }]
  // tax format: { cgst, sgst, serviceCharge }
  // discount format: { type, amount } 
  // type: 'platform' | 'payer' | 'item'

  try {
    // Get bill
    const billResult = await pool.query(
      'SELECT * FROM bills WHERE id = $1',
      [billId]
    );
    const bill = billResult.rows[0];
    if (!bill) return res.status(404).json({ error: 'Bill not found' });

    // Get all items
    const itemsResult = await pool.query(
      'SELECT * FROM items WHERE bill_id = $1',
      [billId]
    );
    const items = itemsResult.rows;

    // Step 1 — Save item splits
    for (const split of splits) {
      const item = items.find(i => i.id === split.itemId);
      if (!item) continue;

      const totalPct = split.assignments.reduce((sum, a) => sum + a.percentage, 0);
      if (Math.abs(totalPct - 100) > 0.01) {
        return res.status(400).json({
          error: `Percentages for item ${item.name} must add up to 100`
        });
      }

      for (const assignment of split.assignments) {
        const amount = (item.price * item.quantity * assignment.percentage) / 100;

        await pool.query(
          `INSERT INTO item_splits (item_id, user_id, percentage, amount)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT DO NOTHING`,
          [split.itemId, assignment.userId, assignment.percentage, amount]
        );
      }
    }

    // Step 2 — Update tax on bill
    const cgst = tax?.cgst || 0;
    const sgst = tax?.sgst || 0;
    const serviceCharge = tax?.serviceCharge || 0;

    await pool.query(
      `UPDATE bills SET cgst=$1, sgst=$2, service_charge=$3,
       total = subtotal + $1 + $2 + $3
       WHERE id = $4`,
      [cgst, sgst, serviceCharge, billId]
    );

    // Step 3 — Calculate each person's food total
    const membersResult = await pool.query(
      `SELECT user_id FROM bill_members WHERE bill_id = $1`,
      [billId]
    );
    const members = membersResult.rows;

    const subtotal = parseFloat(bill.subtotal);
    const totalTax = cgst + sgst + serviceCharge;
    const memberTotals = {};

    for (const member of members) {
      const uid = member.user_id;

      // Food share
      const foodResult = await pool.query(
        `SELECT COALESCE(SUM(its.amount), 0) as food_total
         FROM item_splits its
         JOIN items i ON its.item_id = i.id
         WHERE i.bill_id = $1 AND its.user_id = $2`,
        [billId, uid]
      );
      const foodTotal = parseFloat(foodResult.rows[0].food_total);

      // Tax share — proportional to food share
      const foodRatio = subtotal > 0 ? foodTotal / subtotal : 0;
      let taxShare = totalTax * foodRatio;

      // Step 4 — Handle discount
      let discountShare = 0;
      const discountAmount = discount?.amount || 0;
      const discountType = discount?.type || 'none';

      if (discountAmount > 0) {
        if (discountType === 'platform') {
          // Everyone benefits proportionally
          discountShare = discountAmount * foodRatio;
        } else if (discountType === 'payer') {
          // Only payer benefits — handled on frontend, skip here
          discountShare = 0;
        } else if (discountType === 'item') {
          // Already applied to item price — skip
          discountShare = 0;
        }
      }

      const finalAmount = foodTotal + taxShare - discountShare;
      memberTotals[uid] = {
        foodTotal: parseFloat(foodTotal.toFixed(2)),
        taxShare: parseFloat(taxShare.toFixed(2)),
        discountShare: parseFloat(discountShare.toFixed(2)),
        finalAmount: parseFloat(finalAmount.toFixed(2))
      };

      // Update bill_members
      await pool.query(
        `UPDATE bill_members SET amount_owed = $1 WHERE bill_id = $2 AND user_id = $3`,
        [finalAmount.toFixed(2), billId, uid]
      );
    }

    // Update discount on bill
    if (discount?.amount) {
      await pool.query(
        `UPDATE bills SET discount_type=$1, discount_amount=$2 WHERE id=$3`,
        [discount.type, discount.amount, billId]
      );
    }

    res.json({
      message: 'Splits calculated successfully',
      summary: memberTotals
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get final split summary for a bill
const getSplitSummary = async (req, res) => {
  const { billId } = req.params;

  try {
    const result = await pool.query(
      `SELECT 
        u.id, u.name, u.phone, u.upi_id,
        bm.amount_owed, bm.amount_paid, bm.status
       FROM bill_members bm
       JOIN users u ON bm.user_id = u.id
       WHERE bm.bill_id = $1`,
      [billId]
    );

    const billResult = await pool.query(
      'SELECT total, discount_type, discount_amount, cgst, sgst FROM bills WHERE id = $1',
      [billId]
    );

    res.json({
      bill_total: billResult.rows[0],
      members: result.rows
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { calculateSplits, getSplitSummary };