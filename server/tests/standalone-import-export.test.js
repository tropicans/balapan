import test from 'node.test';
import assert from 'node:assert';
import express from 'express';
import http from 'http';
import db, { initDatabase } from '../db.js';
import { createEvent, setActiveEvent } from '../services/eventService.js';
import { registerParticipant, getParticipants } from '../services/participantService.js';
import { recordBtoTime, getBtoLeaderboard } from '../services/btoService.js';

await initDatabase();

test('Phase 29 - Standalone Import/Export Data APIs', async (t) => {
  // 1. Setup Test Event
  const testEvent = createEvent({ nama: 'Phase 29 Test Event', deskripsi: 'Test Decoupled Import Export' });
  setActiveEvent(testEvent.id);

  // 2. Register participants
  const p1 = registerParticipant({ name: 'Speed Racer 1', team_name: 'Team Red', event_id: testEvent.id });
  const p2 = registerParticipant({ name: 'Speed Racer 2', team_name: 'Team Blue', event_id: testEvent.id });

  assert.strictEqual(p1.participant_number, 1);
  assert.strictEqual(p2.participant_number, 2);

  // 3. Record BTO times
  recordBtoTime({ participant_number: 1, finish_time: 12.345, event_id: testEvent.id });
  recordBtoTime({ participant_number: 2, finish_time: 11.987, event_id: testEvent.id });

  // 4. Verify participant list local retrieval
  const participantsResult = getParticipants({ event_id: testEvent.id });
  assert.strictEqual(participantsResult.total, 2);

  // 5. Verify BTO leaderboard local retrieval
  const leaderboard = getBtoLeaderboard({ event_id: testEvent.id });
  assert.strictEqual(leaderboard.length, 2);
  assert.strictEqual(leaderboard[0].participant_number, 2); // 11.987s is faster than 12.345s
});
