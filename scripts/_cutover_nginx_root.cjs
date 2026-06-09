/**
 * 빅뱅 컷오버 — mdm.sampyo.co.kr nginx root를 v1 → v2(root dist)로 교체.
 *
 *   root /var/www/sampyo-mdm   →   root /var/www/sampyo-mdm-v2-root
 *   + location / 에 index.html no-cache (컷오버 stale-shell 방지)
 *
 * 보존: v1 dist(/var/www/sampyo-mdm)·/v2/ location(/var/www/sampyo-mdm-v2)·/api/hr proxy 그대로.
 * 안전: config 백업 → SFTP 업로드 → sudo cp → nginx -t → 성공 시 reload, 실패 시 백업 복원.
 *
 * 롤백(수동): node scripts/_cutover_nginx_root.cjs --rollback
 *   → root를 /var/www/sampyo-mdm(v1)로 되돌리고 reload.
 *
 * 사용: node scripts/_cutover_nginx_root.cjs   (STAMP=YYYYmmdd_HHMMSS 권장)
 */
const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');
const os = require('os');

const ROLLBACK = process.argv.includes('--rollback');
const CONFIG = '/etc/nginx/sites-available/mdm.sampyo.co.kr';
const V1_ROOT = '/var/www/sampyo-mdm';
const V2_ROOT = '/var/www/sampyo-mdm-v2-root';

const envPath = [
  path.resolve(__dirname, '../.env.deploy'),
  path.resolve(__dirname, '../../Sampyo_MDM/.env.deploy'),
  path.resolve(os.homedir(), 'Project/Sampyo_MDM/.env.deploy'),
].find((p) => fs.existsSync(p));
if (!envPath) { console.error('[ERROR] .env.deploy 없음'); process.exit(1); }
const env = {};
for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
  const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
const SUDO_PASS = env.DEPLOY_SUDO_PASS || '';
const SSH_KEY_PATH = (env.DEPLOY_SSH_KEY_PATH || '').replace(/^~/, os.homedir());

function sudoCmd(cmd) { return SUDO_PASS ? `echo '${SUDO_PASS}' | sudo -S ${cmd}` : `sudo ${cmd}`; }
function exec(conn, cmd) {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, { pty: false }, (err, stream) => {
      if (err) return reject(err);
      let out = '';
      stream.on('data', (d) => (out += d));
      stream.stderr.on('data', (d) => (out += d));
      stream.on('close', (code) => (code === 0 ? resolve(out) : reject(new Error(out))));
    });
  });
}
function putFile(conn, content, remotePath) {
  return new Promise((resolve, reject) => {
    conn.sftp((err, sftp) => {
      if (err) return reject(err);
      const ws = sftp.createWriteStream(remotePath);
      ws.on('close', resolve); ws.on('error', reject); ws.end(content);
    });
  });
}

(async () => {
  const cfg = { host: env.DEPLOY_HOST || '10.50.20.51', port: parseInt(env.DEPLOY_PORT || '22', 10), username: env.DEPLOY_USER || 'sampyopi', readyTimeout: 15000 };
  if (SSH_KEY_PATH && fs.existsSync(SSH_KEY_PATH)) cfg.privateKey = fs.readFileSync(SSH_KEY_PATH);
  else if (SUDO_PASS) cfg.password = SUDO_PASS;

  const conn = new Client();
  conn.on('ready', async () => {
    try {
      const current = await exec(conn, `cat ${CONFIG}`);
      const from = ROLLBACK ? V2_ROOT : V1_ROOT;
      const to = ROLLBACK ? V1_ROOT : V2_ROOT;

      if (current.includes(`root ${to};`)) {
        console.log(`[skip] 이미 root ${to} 상태입니다.`);
        conn.end(); return;
      }
      if (!current.includes(`root ${from};`)) {
        console.error(`[ERROR] 예상 root(${from})를 찾지 못함. 현재 config 수동 확인 필요.`);
        conn.end(); process.exitCode = 1; return;
      }

      let next = current.replace(`root ${from};`, `root ${to};`);
      // index.html no-cache (컷오버 방향에서만 추가, 이미 있으면 유지)
      if (!ROLLBACK && !next.includes('Cache-Control "no-cache"')) {
        next = next.replace(
          '    location / {\n        try_files $uri $uri/ /index.html;\n    }',
          '    location / {\n        try_files $uri $uri/ /index.html;\n        add_header Cache-Control "no-cache";\n    }',
        );
      }

      const stamp = process.env.STAMP || 'manual';
      const backup = `${CONFIG}.bak.cutover_${stamp}`;
      console.log(`[1] 백업: ${backup}`);
      await exec(conn, sudoCmd(`cp ${CONFIG} ${backup}`));

      console.log(`[2] root ${from} → ${to} 적용`);
      await putFile(conn, next, '/tmp/mdm_cutover.conf');
      await exec(conn, sudoCmd(`cp /tmp/mdm_cutover.conf ${CONFIG}`));

      console.log('[3] nginx -t');
      try {
        const t = await exec(conn, sudoCmd('nginx -t'));
        console.log(t.trim().split('\n').filter((l) => l.includes('syntax') || l.includes('successful') || l.includes('emerg')).join('\n'));
      } catch (terr) {
        console.error('[FAIL] nginx -t 실패 → 백업 복원');
        console.error(terr.message.trim());
        await exec(conn, sudoCmd(`cp ${backup} ${CONFIG}`));
        conn.end(); process.exitCode = 1; return;
      }

      console.log('[4] reload');
      await exec(conn, sudoCmd('systemctl reload nginx'));
      console.log(`[완료] root = ${to} ${ROLLBACK ? '(롤백)' : '(컷오버)'} · 백업 ${backup}`);
      conn.end();
    } catch (e) {
      console.error('[ERROR]', e.message.trim());
      conn.end(); process.exitCode = 1;
    }
  }).on('error', (e) => { console.error('SSH ERR:', e.message); process.exitCode = 1; }).connect(cfg);
})();
