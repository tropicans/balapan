import { v4 as uuidv4 } from 'uuid';
import db from './db.js';
import { RaceManager } from './raceManager.js';

export class TicketEngine {
  /**
   * Check if qualifying stage is locked
   */
  static isQualifyingLocked() {
    try {
      const setting = db.prepare("SELECT value FROM tournament_settings WHERE key = 'qualifying_status'").get();
      return setting?.value === 'locked';
    } catch (e) {
      return false;
    }
  }

  /**
   * Lock qualifying stage and finalize Round 2 bracket
   * Applies Automatic Bye system if Round 2 slots are not multiples of 3
   */
  static lockQualifyingStage(io = null) {
    const lockTx = db.transaction(() => {
      // Upsert qualifying_status = 'locked'
      const existing = db.prepare("SELECT key FROM tournament_settings WHERE key = 'qualifying_status'").get();
      if (existing) {
        db.prepare("UPDATE tournament_settings SET value = 'locked', updated_at = CURRENT_TIMESTAMP WHERE key = 'qualifying_status'").run();
      } else {
        db.prepare("INSERT INTO tournament_settings (key, value, updated_at) VALUES ('qualifying_status', 'locked', CURRENT_TIMESTAMP)").run();
      }

      // Note: Under Opsi A (Manual Solo Run), heats with 1 racer remain 'pending'
      // so the Race Director can manually declare them winner after their solo run.

      const totalTickets = db.prepare("SELECT COUNT(*) as count FROM next_round_tickets WHERE status = 'issued'").get()?.count || 0;
      return { success: true, is_locked: true, total_tickets: totalTickets };
    });

    const result = lockTx();

    if (io) {
      io.emit('qualifying:locked', {
        is_locked: true,
        total_tickets: result.total_tickets,
        timestamp: new Date().toISOString()
      });
      io.emit('bracket_updated');
    }

    return result;
  }

  /**
   * Alias for lockQualifyingStage
   */
  static lockQualifying(options = {}) {
    const io = options?.io !== undefined ? options.io : options;
    return this.lockQualifyingStage(io);
  }

  /**
   * Unlock qualifying stage (e.g. for reset/admin override)
   */
  static unlockQualifyingStage(io = null) {
    const unlockTx = db.transaction(() => {
      const existing = db.prepare("SELECT key FROM tournament_settings WHERE key = 'qualifying_status'").get();
      if (existing) {
        db.prepare("UPDATE tournament_settings SET value = 'open', updated_at = CURRENT_TIMESTAMP WHERE key = 'qualifying_status'").run();
      } else {
        db.prepare("INSERT INTO tournament_settings (key, value, updated_at) VALUES ('qualifying_status', 'open', CURRENT_TIMESTAMP)").run();
      }
      return { success: true, is_locked: false };
    });

    const result = unlockTx();
    if (io) {
      io.emit('qualifying:unlocked', { is_locked: false, timestamp: new Date().toISOString() });
      io.emit('bracket_updated');
    }
    return result;
  }

  /**
   * Issue a Next Round Ticket atomically
   * Supports sequential numbering (#1, #2, ... / TKT-B2-001),
   * multi-ticket per racer ('Budi #1', 'Budi #2'),
   * auto-seeding to Round 2 slot in bracket_matches,
   * and All-3-Same-Lane Auto-Advance rule.
   */
  static issueTicket({ userId, packageId = null, serialNumber = 'DIGITAL', lane, source = 'marshal', heatNumber = null, io = null }) {
    if (!userId) {
      throw new Error('userId is required to issue next round ticket');
    }

    const issueTx = db.transaction(() => {
      // 1. Check if qualifying is locked
      if (this.isQualifyingLocked()) {
        throw new Error('Kualifikasi telah dikunci oleh Race Director');
      }

      // 2. Sequential ticket number (1, 2, 3...)
      const maxRow = db.prepare('SELECT COALESCE(MAX(ticket_number), 0) + 1 as next_num FROM next_round_tickets').get();
      const ticketNumber = maxRow?.next_num || 1;
      const ticketCode = `TKT-B2-${String(ticketNumber).padStart(3, '0')}`;

      // 3. Count tickets previously issued to this racer (active/non-void)
      const countRow = db.prepare(`
        SELECT COUNT(*) as count FROM next_round_tickets 
        WHERE user_id = ? AND status != 'void'
      `).get(userId);
      const racerTicketIndex = (countRow?.count || 0) + 1;

      // 4. Fetch user details for display label
      const user = db.prepare('SELECT id, name, team_name FROM users WHERE id = ?').get(userId);
      const userName = user?.name || 'Racer';
      const racerLabel = `${userName} #${racerTicketIndex}`;

      // 5. Sequential auto-placement into Round 2 bracket match (3-lane)
      const openHeats = db.prepare(`
        SELECT * FROM bracket_matches 
        WHERE round_number = 2 AND status = 'pending' AND (user_id_1 IS NULL OR user_id_2 IS NULL OR user_id_3 IS NULL)
        ORDER BY match_number ASC
      `).all();

      let targetMatch = null;
      let targetSlot = null;
      let slotLane = null;

      for (const m of openHeats) {
        if (!m.user_id_1) {
          targetMatch = m;
          targetSlot = 'user_id_1';
          slotLane = 'A';
          break;
        } else if (!m.user_id_2) {
          targetMatch = m;
          targetSlot = 'user_id_2';
          slotLane = 'B';
          break;
        } else if (!m.user_id_3) {
          targetMatch = m;
          targetSlot = 'user_id_3';
          slotLane = 'C';
          break;
        }
      }

      // If no open match in Round 2, create a new heat dynamically
      if (!targetMatch) {
        const gf = db.prepare('SELECT id FROM bracket_matches WHERE is_final = 1 OR round_number = 3 LIMIT 1').get();
        const maxMatchRow = db.prepare('SELECT MAX(match_number) as max_match FROM bracket_matches').get();
        const nextMatchNumber = (maxMatchRow?.max_match || 0) + 1;
        const newHeatId = uuidv4();

        db.prepare(`
          INSERT INTO bracket_matches (id, match_number, round_number, parent_match_id, status)
          VALUES (?, ?, 2, ?, 'pending')
        `).run(newHeatId, nextMatchNumber, gf?.id || null);

        targetMatch = {
          id: newHeatId,
          match_number: nextMatchNumber,
          round_number: 2,
          parent_match_id: gf?.id || null
        };
        targetSlot = 'user_id_1';
        slotLane = 'A';
      }

      const ticketId = uuidv4();
      const ticketCol = targetSlot === 'user_id_1' ? 'ticket_id_1' : (targetSlot === 'user_id_2' ? 'ticket_id_2' : 'ticket_id_3');

      // Update bracket slot
      db.prepare(`
        UPDATE bracket_matches 
        SET ${targetSlot} = ?, ${ticketCol} = ?
        WHERE id = ?
      `).run(userId, ticketId, targetMatch.id);

      // Insert into next_round_tickets
      db.prepare(`
        INSERT INTO next_round_tickets (
          id, ticket_number, ticket_code, user_id, racer_ticket_index,
          package_id, serial_number, lane, source, status,
          bracket_match_id, bracket_slot, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'issued', ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `).run(
        ticketId, ticketNumber, ticketCode, userId, racerTicketIndex,
        packageId, serialNumber, lane, source,
        targetMatch.id, targetSlot
      );

      // 6. Check All-3-Same-Lane Auto-Advance Rule (D-04)
      const updatedMatch = db.prepare('SELECT * FROM bracket_matches WHERE id = ?').get(targetMatch.id);
      let autoAdvanced = false;

      if (
        updatedMatch.user_id_1 &&
        updatedMatch.user_id_1 === updatedMatch.user_id_2 &&
        updatedMatch.user_id_2 === updatedMatch.user_id_3 &&
        updatedMatch.user_id_1 === userId
      ) {
        autoAdvanced = true;
        db.prepare(`
          UPDATE bracket_matches 
          SET status = 'completed', is_auto_advanced = 1, winner_id = ?
          WHERE id = ?
        `).run(userId, updatedMatch.id);

        RaceManager.advanceBracketWinner(updatedMatch.id, userId);
      }

      return {
        id: ticketId,
        ticket_number: ticketNumber,
        ticket_code: ticketCode,
        user_id: userId,
        user_name: userName,
        team_name: user?.team_name || '',
        racer_ticket_index: racerTicketIndex,
        racer_label: racerLabel,
        package_id: packageId,
        serial_number: serialNumber,
        lane,
        source,
        status: 'issued',
        bracket_match_id: updatedMatch.id,
        bracket_match_number: updatedMatch.match_number,
        bracket_slot: targetSlot,
        bracket_lane: slotLane,
        autoAdvanced,
        created_at: new Date().toISOString()
      };
    });

    const ticketResult = issueTx();

    if (io) {
      const stats = this.getTicketStats();
      io.emit('ticket:granted', {
        ticket: ticketResult,
        stats
      });
      io.emit('bracket_updated');
    }

    return ticketResult;
  }

  /**
   * Void a ticket (e.g. from Marshal 60s Undo)
   * Frees bracket slot and restores coupon quota
   */
  static voidTicket(ticketId, reason = 'Marshal undo', io = null) {
    if (!ticketId) {
      throw new Error('ticketId is required to void ticket');
    }

    const voidTx = db.transaction(() => {
      const ticket = db.prepare('SELECT * FROM next_round_tickets WHERE id = ?').get(ticketId);
      if (!ticket) {
        throw new Error('Tiket tidak ditemukan');
      }
      if (ticket.status === 'void') {
        throw new Error('Tiket sudah dibatalkan sebelumnya');
      }

      // 1. Mark ticket as void
      db.prepare(`
        UPDATE next_round_tickets 
        SET status = 'void', void_reason = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(reason, ticketId);

      // 2. Clear bracket match slot
      if (ticket.bracket_match_id && ticket.bracket_slot) {
        const match = db.prepare('SELECT * FROM bracket_matches WHERE id = ?').get(ticket.bracket_match_id);
        if (match) {
          const slotCol = ticket.bracket_slot;
          const ticketCol = slotCol === 'user_id_1' ? 'ticket_id_1' : (slotCol === 'user_id_2' ? 'ticket_id_2' : 'ticket_id_3');

          if (match.is_auto_advanced) {
            // Revert auto-advance
            db.prepare(`
              UPDATE bracket_matches 
              SET status = 'pending', is_auto_advanced = 0, winner_id = NULL, ${slotCol} = NULL, ${ticketCol} = NULL
              WHERE id = ?
            `).run(match.id);

            // If advanced to parent match, remove from parent match
            if (match.parent_match_id) {
              const parent = db.prepare('SELECT * FROM bracket_matches WHERE id = ?').get(match.parent_match_id);
              if (parent) {
                if (parent.user_id_1 === ticket.user_id) {
                  db.prepare('UPDATE bracket_matches SET user_id_1 = NULL WHERE id = ?').run(parent.id);
                } else if (parent.user_id_2 === ticket.user_id) {
                  db.prepare('UPDATE bracket_matches SET user_id_2 = NULL WHERE id = ?').run(parent.id);
                } else if (parent.user_id_3 === ticket.user_id) {
                  db.prepare('UPDATE bracket_matches SET user_id_3 = NULL WHERE id = ?').run(parent.id);
                }
              }
            }
          } else {
            db.prepare(`
              UPDATE bracket_matches 
              SET ${slotCol} = NULL, ${ticketCol} = NULL
              WHERE id = ?
            `).run(match.id);
          }
        }
      }

      // 3. Restore coupon package quota if applicable
      if (ticket.package_id) {
        db.prepare(`
          UPDATE coupon_packages 
          SET remaining_quota = remaining_quota + 1, used_quota = MAX(0, used_quota - 1), status = 'active', updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(ticket.package_id);
      }

      // 4. Restore digital coupon balance
      db.prepare(`
        UPDATE coupons 
        SET balance = balance + 1, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `).run(ticket.user_id);

      return {
        success: true,
        ticketId: ticket.id,
        ticketNumber: ticket.ticket_number,
        voided: true
      };
    });

    const result = voidTx();

    if (io) {
      io.emit('ticket:voided', {
        ticketId: result.ticketId,
        ticketNumber: result.ticketNumber,
        reason
      });
      io.emit('bracket_updated');
    }

    return result;
  }

  /**
   * Get ticket statistics & roster of ticket holders
   */
  static getTicketStats() {
    const totalIssued = db.prepare("SELECT COUNT(*) as count FROM next_round_tickets WHERE status = 'issued'").get()?.count || 0;
    const totalVoid = db.prepare("SELECT COUNT(*) as count FROM next_round_tickets WHERE status = 'void'").get()?.count || 0;
    const isLocked = this.isQualifyingLocked();

    let targetQuota = 24;
    try {
      const quotaSetting = db.prepare("SELECT value FROM tournament_settings WHERE key = 'qualifying_target_quota'").get();
      if (quotaSetting?.value) {
        targetQuota = parseInt(quotaSetting.value, 10) || 24;
      } else {
        const r2Count = db.prepare("SELECT COUNT(*) as count FROM bracket_matches WHERE round_number = 2").get()?.count || 0;
        if (r2Count > 0) {
          targetQuota = r2Count * 3;
        }
      }
    } catch (e) {
      // fallback
    }

    const remainingQuota = Math.max(0, targetQuota - totalIssued);
    const isCritical = remainingQuota <= 4 && !isLocked;

    const racers = db.prepare(`
      SELECT u.id as user_id, u.name as user_name, u.team_name, COUNT(t.id) as ticket_count
      FROM next_round_tickets t
      JOIN users u ON t.user_id = u.id
      WHERE t.status != 'void'
      GROUP BY u.id, u.name, u.team_name
      ORDER BY ticket_count DESC, u.name ASC
    `).all();

    const tickets = db.prepare(`
      SELECT t.*, u.name as user_name, u.team_name, bm.match_number as bracket_match_number
      FROM next_round_tickets t
      JOIN users u ON t.user_id = u.id
      LEFT JOIN bracket_matches bm ON t.bracket_match_id = bm.id
      ORDER BY t.ticket_number ASC
    `).all();

    return {
      total_issued: totalIssued,
      total_void: totalVoid,
      target_quota: targetQuota,
      remaining_quota: remainingQuota,
      is_locked: isLocked,
      is_critical: isCritical,
      racers,
      tickets
    };
  }
}

export default TicketEngine;
