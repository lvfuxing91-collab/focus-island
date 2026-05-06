const fs = require('fs');
const path = require('path');
const dir = path.join('e:/专注岛/第一版/专注岛mvp国际版', 'assets', 'icons');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const icons = {
  'tab_focus.svg': '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10" fill="none" stroke="#8A99A3" stroke-width="2"/><path d="M12 6v6l4 2" fill="none" stroke="#8A99A3" stroke-width="2"/></svg>',
  'tab_focus_active.svg': '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10" fill="none" stroke="#0F6C8C" stroke-width="2"/><path d="M12 6v6l4 2" fill="none" stroke="#0F6C8C" stroke-width="2"/></svg>',
  'tab_stats.svg': '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="10" width="4" height="10" fill="#8A99A3"/><rect x="10" y="4" width="4" height="16" fill="#8A99A3"/><rect x="16" y="14" width="4" height="6" fill="#8A99A3"/></svg>',
  'tab_stats_active.svg': '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="10" width="4" height="10" fill="#0F6C8C"/><rect x="10" y="4" width="4" height="16" fill="#0F6C8C"/><rect x="16" y="14" width="4" height="6" fill="#0F6C8C"/></svg>',
  'tab_profile.svg': '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="8" r="4" fill="#8A99A3"/><path d="M4 20c0-4 4-6 8-6s8 2 8 6" fill="none" stroke="#8A99A3" stroke-width="2"/></svg>',
  'tab_profile_active.svg': '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="8" r="4" fill="#0F6C8C"/><path d="M4 20c0-4 4-6 8-6s8 2 8 6" fill="none" stroke="#0F6C8C" stroke-width="2"/></svg>'
};

for (const [name, content] of Object.entries(icons)) {
  fs.writeFileSync(path.join(dir, name), content);
}
console.log('done');
