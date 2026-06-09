/**
 * mdm.sampyo.co.kr nginx config에 `location ^~ /v2/` 블록을 복구한다.
 *
 * 배경: `/v2/` location 블록이 메인 config(/etc/nginx/sites-available/mdm.sampyo.co.kr)에서
 *   반복적으로 소실된다(누군가 config 덮어쓰기 추정). 소실되면 /v2/* 요청이 v1 SPA fallback으로
 *   빠져 옛 v1 앱이 서빙되고, /v2/assets/* 신규 청크는 404가 된다.
 *
 * 동작(멱등 + 안전):
 *   1. 현재 config를 읽어 이미 /v2/ 블록이 있으면 skip.
 *   2. `location / {` 앞에 v2 블록을 삽입한 새 내용을 /tmp에 SFTP 업로드(nginx $ 변수 이스케이프 회피).
 *   3. sudo cp 백업 → sudo cp 적용 → `nginx -t` 검증.
 *   4. 검증 성공 시 reload, 실패 시 백업 복원.
 *
 * 사용: node scripts/_add_mdm_v2_location.cjs
 * .env.deploy 재사용(deploy_v2.cjs와 동일).
 */
const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');
const os = require('os');

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

const CONFIG = '/etc/nginx/sites-available/mdm.sampyo.co.kr';
const SUDO_PASS = env.DEPLOY_SUDO_PASS || '';
const SSH_KEY_PATH = (env.DEPLOY_SSH_KEY_PATH || '').replace(/^~/, os.homedir());

const V2_BLOCK = [
  '    location ^~ /v2/ {',
  '        alias /var/www/sampyo-mdm-v2/;',
  '        try_files $uri $uri/ /v2/index.html;',
  '    }',
  '',
].join('\n');

function sudoCmd(cmd) {
  return SUDO_PASS ? `echo '${SUDO_PASS}' | sudo -S ${cmd}` : `sudo ${cmd}`;
}
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
      ws.on('close', resolve);
      ws.on('error', reject);
      ws.end(content);
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
      if (/location\s+\^~\s+\/v2\//.test(current) || /location[^\n]*\/v2\//.test(current)) {
        console.log('[skip] /v2/ location 블록이 이미 존재합니다.');
        conn.end();
        return;
      }
      if (!/^\s*location\s+\/\s*\{/m.test(current)) {
        console.error('[ERROR] `location / {` 앵커를 찾지 못함. 수동 확인 필요.');
        conn.end();
        process.exitCode = 1;
        return;
      }
      // location / { 앞에 v2 블록 삽입
      const next = current.replace(/^(\s*)location\s+\/\s*\{/m, (full, indent) => `${V2_BLOCK}${indent}location / {`);

      const stamp = (process.env.STAMP || 'manual'); // Date.now 회피 — 호출 시 STAMP=... 가능
      const backup = `${CONFIG}.bak.v2restore_${stamp}`;
      console.log('[1] 백업:', backup);
      await exec(conn, sudoCmd(`cp ${CONFIG} ${backup}`));

      console.log('[2] 새 config 업로드 → /tmp/mdm_v2_restore.conf');
      await putFile(conn, next, '/tmp/mdm_v2_restore.conf');
      await exec(conn, sudoCmd(`cp /tmp/mdm_v2_restore.conf ${CONFIG}`));

      console.log('[3] nginx -t 검증');
      try {
        const t = await exec(conn, sudoCmd('nginx -t'));
        console.log(t.trim());
      } catch (terr) {
        console.error('[FAIL] nginx -t 실패 → 백업 복원');
        console.error(terr.message.trim());
        await exec(conn, sudoCmd(`cp ${backup} ${CONFIG}`));
        conn.end();
        process.exitCode = 1;
        return;
      }

      console.log('[4] nginx reload');
      await exec(conn, sudoCmd('systemctl reload nginx'));
      console.log('[완료] /v2/ location 복구 + reload 성공');
      conn.end();
    } catch (e) {
      console.error('[ERROR]', e.message.trim());
      conn.end();
      process.exitCode = 1;
    }
  }).on('error', (e) => {
    console.error('SSH ERR:', e.message);
    process.exitCode = 1;
  }).connect(cfg);
})();
