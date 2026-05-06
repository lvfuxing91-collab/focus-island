const fs = require('fs');
const path = require('path');
function walk(dir) {
  if (!fs.existsSync(dir)) return;
  fs.readdirSync(dir).forEach(f => {
    let p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (p.endsWith('.js')) {
      let content = fs.readFileSync(p, 'utf8');
      if (content.includes('wx.getSystemInfoSync()')) {
        content = content.replace(/wx\.getSystemInfoSync\(\)/g, "(wx.getDeviceInfo ? Object.assign({}, wx.getDeviceInfo(), wx.getWindowInfo ? wx.getWindowInfo() : {}, wx.getAppBaseInfo ? wx.getAppBaseInfo() : {}) : wx.getSystemInfoSync())");
        fs.writeFileSync(p, content);
        console.log('Patched', p);
      }
    }
  });
}
walk('miniprogram_npm');