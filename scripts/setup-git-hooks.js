import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const hooksDir = path.join(repoRoot, '.git', 'hooks');

console.log('🔧 Setting up Local CI/CD Git Hooks for Auto-Rebuild...\n');

if (!fs.existsSync(hooksDir)) {
  console.log('⚠️ .git/hooks directory not found. Creating it...');
  fs.mkdirSync(hooksDir, { recursive: true });
}

const hookScript = `#!/bin/sh
# DGDash Racing System Auto-Rebuild Hook
# Triggered automatically after commit or merge

echo ""
echo "🚀 [CI/CD LOCAL] Perubahan terdeteksi! Memulai auto-rebuild Docker container..."
echo "========================================================================="

# Jalankan docker compose build & up di background/foreground
docker compose up -d --build

if [ $? -eq 0 ]; then
  echo "✅ [CI/CD LOCAL] Container berhasil di-rebuild dan berjalan di port 3050!"
else
  echo "⚠️ [CI/CD LOCAL] Gagal rebuild container. Pastikan Docker Desktop aktif."
fi
echo "========================================================================="
echo ""
`;

const postCommitPath = path.join(hooksDir, 'post-commit');
const postMergePath = path.join(hooksDir, 'post-merge');

try {
  fs.writeFileSync(postCommitPath, hookScript, { mode: 0o755 });
  console.log(`✅ Hook installed: ${postCommitPath}`);

  fs.writeFileSync(postMergePath, hookScript, { mode: 0o755 });
  console.log(`✅ Hook installed: ${postMergePath}`);

  console.log('\n🎉 Git hooks configured successfully!');
  console.log('👉 Setiap kali Anda melakukan "git commit" atau "git merge/pull",');
  console.log('   Docker container akan otomatis di-rebuild dan dijalankan!\n');
} catch (err) {
  console.error('❌ Failed to install git hooks:', err);
  process.exit(1);
}
