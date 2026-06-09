/**
 * 헤더 정리 codemod (검토 #3, #4):
 *   #3 헤더 옆 슬래시 폴더명 span 제거: <span className="text-xs text-gray-500 font-normal ml-2">/ xxx</span>
 *   #4 헤더 아래 설명 문구 제거: <div className="meta">...</div> (균형 div 매칭)
 *
 * 대상: src/pages/*.tsx. 변경 파일/건수 출력. --dry 로 미리보기.
 */
const fs = require('fs');
const path = require('path');

const DRY = process.argv.includes('--dry');
const DIR = path.resolve(__dirname, '../src/pages');

// 슬래시 span 제거 (앞 공백 포함)
const SLASH_RE = /\s*<span className="text-xs text-gray-500 font-normal ml-2">\/[^<]*<\/span>/g;

// <div className="meta">...</div> 균형 매칭 제거
function removeMetaDivs(src) {
  let count = 0;
  let out = src;
  const OPEN = '<div className="meta">';
  for (;;) {
    const start = out.indexOf(OPEN);
    if (start === -1) break;
    // 균형: start부터 div depth 추적
    let i = start + OPEN.length;
    let depth = 1;
    while (i < out.length && depth > 0) {
      const nextOpen = out.indexOf('<div', i);
      const nextClose = out.indexOf('</div>', i);
      if (nextClose === -1) { i = out.length; break; }
      if (nextOpen !== -1 && nextOpen < nextClose) { depth++; i = nextOpen + 4; }
      else { depth--; i = nextClose + 6; }
    }
    // start..i = 전체 meta div. 앞쪽 공백/개행도 정리
    let s = start;
    while (s > 0 && (out[s - 1] === ' ' || out[s - 1] === '\t')) s--;
    if (out[s - 1] === '\n') s--;
    out = out.slice(0, s) + out.slice(i);
    count++;
  }
  return { out, count };
}

let totalSlash = 0, totalMeta = 0, files = 0;
for (const f of fs.readdirSync(DIR).filter((x) => x.endsWith('.tsx'))) {
  const p = path.join(DIR, f);
  let src = fs.readFileSync(p, 'utf8');
  const orig = src;
  const slashMatches = (src.match(SLASH_RE) || []).length;
  src = src.replace(SLASH_RE, '');
  const { out, count: metaCount } = removeMetaDivs(src);
  src = out;
  if (src !== orig) {
    files++; totalSlash += slashMatches; totalMeta += metaCount;
    console.log(`  ${f}: slash ${slashMatches}, meta ${metaCount}`);
    if (!DRY) fs.writeFileSync(p, src);
  }
}
console.log(`\n${DRY ? '[DRY] ' : ''}변경 파일 ${files} · 슬래시 ${totalSlash} · meta ${totalMeta} 제거`);
