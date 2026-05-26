/**
 * Sampyo MDM v2 프론트엔드 배포.
 *  - 로컬: bun run build → dist/
 *  - 원격: /var/www/sampyo-mdm-v2 (chown sampyopi → upload → chown www-data)
 *
 * 실행: node scripts/deploy_v2.cjs
 *
 * .env.deploy는 기존 MDM의 것을 재사용 (../Sampyo_MDM/.env.deploy).
 * 별도 .env.deploy를 v2 폴더에 두려면 PATH 수정.
 */
const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const ENV_PATH_CANDIDATES = [
  path.resolve(__dirname, '../.env.deploy'),
  path.resolve(__dirname, '../../Sampyo_MDM/.env.deploy'),
];

function loadEnvDeploy() {
  const envPath = ENV_PATH_CANDIDATES.find((p) => fs.existsSync(p));
  if (!envPath) {
    console.error('[ERROR] .env.deploy 없음. 다음 경로 중 하나에 둬야 함:');
    for (const p of ENV_PATH_CANDIDATES) console.error(`  - ${p}`);
    process.exit(1);
  }
  console.log(`  .env.deploy: ${envPath}`);
  const env = {};
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i > 0) env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  return env;
}

const env = loadEnvDeploy();
const HOST = env.DEPLOY_HOST || '10.50.20.51';
const USER = env.DEPLOY_USER || 'sampyopi';
const SUDO_PASS = env.DEPLOY_SUDO_PASS || '';
const SSH_KEY_PATH = (env.DEPLOY_SSH_KEY_PATH || '').replace(/^~/, require('os').homedir());

const REMOTE_DIR = '/var/www/sampyo-mdm-v2';
const LOCAL_DIST = path.resolve(__dirname, '../dist');

function uploadDir(sftp, localDir, remoteDir, cb) {
  const entries = fs.readdirSync(localDir, { withFileTypes: true });
  let pending = entries.length;
  if (!pending) return cb();

  entries.forEach((entry) => {
    const localPath = path.join(localDir, entry.name);
    const remotePath = `${remoteDir}/${entry.name}`;

    if (entry.isDirectory()) {
      sftp.mkdir(remotePath, () => {
        uploadDir(sftp, localPath, remotePath, () => {
          if (--pending === 0) cb();
        });
      });
    } else {
      sftp.fastPut(localPath, remotePath, (err) => {
        if (err) console.error(`  업로드 실패: ${remotePath}`, err.message);
        else process.stdout.write(`  > ${entry.name}\n`);
        if (--pending === 0) cb();
      });
    }
  });
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

function sudoCmd(cmd) {
  return SUDO_PASS ? `echo '${SUDO_PASS}' | sudo -S ${cmd}` : `sudo ${cmd}`;
}

if (!fs.existsSync(LOCAL_DIST)) {
  console.error(`[ERROR] dist/ 없음. 먼저 bun run build 실행:`);
  console.error(`  cd ${path.resolve(__dirname, '..')} && bun run build`);
  process.exit(1);
}

const conn = new Client();
conn.on('ready', async () => {
  console.log('[1] SSH OK');
  try {
    console.log('[2] 디렉토리 클린 + 권한 변경...');
    await exec(conn, sudoCmd(`rm -rf ${REMOTE_DIR}/*`));
    await exec(conn, sudoCmd(`chown -R ${USER}:${USER} ${REMOTE_DIR}`));
    console.log('  OK');
  } catch (e) {
    console.error('  [warn]', e.message.trim());
  }

  conn.sftp((err, sftp) => {
    if (err) { console.error('SFTP 오류:', err); conn.end(); return; }
    console.log('[3] 파일 업로드...');
    uploadDir(sftp, LOCAL_DIST, REMOTE_DIR, async () => {
      try {
        await exec(conn, sudoCmd(`chown -R www-data:www-data ${REMOTE_DIR}`));
        console.log('[4] www-data 권한 OK');
      } catch (e) {
        console.error('  [warn]', e.message.trim());
      }
      console.log(`\n[완료] http://${HOST}:8444/`);
      conn.end();
    });
  });
});

conn.on('error', (e) => { console.error('[SSH error]', e.message); process.exit(1); });

const cfg = { host: HOST, port: parseInt(env.DEPLOY_PORT || '22', 10), username: USER };
if (SSH_KEY_PATH && fs.existsSync(SSH_KEY_PATH)) cfg.privateKey = fs.readFileSync(SSH_KEY_PATH);
else if (SUDO_PASS) cfg.password = SUDO_PASS;
else { console.error('[ERROR] SSH 자격증명 없음'); process.exit(1); }
conn.connect(cfg);
