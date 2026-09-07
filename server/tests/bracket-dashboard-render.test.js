import esbuild from '../../client/node_modules/esbuild/lib/main.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');

console.log('🧪 RUNNING BRACKET DASHBOARD RENDER TEST (REPRODUCING BUG)...');

const mockRaceContextPath = path.join(projectRoot, 'temp-mock-race-context.jsx');
const runnerPath = path.join(projectRoot, 'temp-test-entry.jsx');
const tempBundle = path.join(projectRoot, 'temp-test-bundle.mjs');

const mockRaceContextCode = `
import React from 'react';

export const mockMatches = [
  {
    id: 'match-1',
    round_number: 2,
    match_number: 1,
    status: 'pending',
    user_id_1: 'user-1',
    user_1_name: 'Speed King',
    user_1_team: 'TRF',
    ticket_number_1: 'T-001',
    ticket_index_1: 1,
    user_id_2: 'user-2',
    user_2_name: 'Dash Emperor',
    user_2_team: 'TEAM X',
    ticket_number_2: 'T-002',
    ticket_index_2: 1,
    user_id_3: null,
    user_3_name: null,
    user_3_team: null,
    winner_id: null
  }
];

export function useRace() {
  return {
    raceState: {
      bracketMatches: mockMatches
    },
    apiAdvanceBracket: async () => {}
  };
}
`;

const runnerCode = `
import React from 'react';
import { renderToString } from 'react-dom/server.browser';
import { BracketDashboard } from './client/src/screens/BracketDashboard.jsx';

try {
  const html = renderToString(React.createElement(BracketDashboard));
  console.log('✅ Render succeeded! Output length:', html.length);
  process.exit(0);
} catch (err) {
  console.error('❌ Render threw error:', err.name + ': ' + err.message);
  console.error(err.stack);
  process.exit(1);
}
`;

fs.writeFileSync(mockRaceContextPath, mockRaceContextCode, 'utf8');
fs.writeFileSync(runnerPath, runnerCode, 'utf8');

let exitCode = 0;

const mockPlugin = {
  name: 'mock-race-context',
  setup(build) {
    build.onResolve({ filter: /RaceContext/ }, args => {
      return { path: mockRaceContextPath };
    });
    build.onResolve({ filter: /canvas-confetti/ }, args => {
      return { path: path.join(projectRoot, 'client/src/utils/audio.js') };
    });
  }
};

try {
  await esbuild.build({
    entryPoints: [runnerPath],
    bundle: true,
    outfile: tempBundle,
    format: 'esm',
    platform: 'node',
    nodePaths: [path.join(projectRoot, 'client/node_modules')],
    plugins: [mockPlugin],
    external: ['fsevents', 'stream', 'util', 'events', 'path', 'fs', 'crypto', 'buffer', 'string_decoder', 'assert']
  });

  // Execute the bundle
  const { spawnSync } = await import('child_process');
  const res = spawnSync(process.execPath, [tempBundle], {
    encoding: 'utf8',
    cwd: projectRoot
  });

  console.log(res.stdout);
  if (res.stderr) console.error(res.stderr);

  if (res.status !== 0) {
    console.log('💥 REPRODUCED BUG: Test exited with status', res.status);
    if (res.stderr.includes('cfg is not defined') || res.stdout.includes('cfg is not defined')) {
      console.log('🎯 CONFIRMED: ReferenceError: cfg is not defined successfully reproduced!');
    }
    exitCode = res.status;
  } else {
    console.log('🎉 Test passed without errors!');
    exitCode = 0;
  }
} finally {
  if (fs.existsSync(mockRaceContextPath)) fs.unlinkSync(mockRaceContextPath);
  if (fs.existsSync(runnerPath)) fs.unlinkSync(runnerPath);
  if (fs.existsSync(tempBundle)) fs.unlinkSync(tempBundle);
}

process.exit(exitCode);
