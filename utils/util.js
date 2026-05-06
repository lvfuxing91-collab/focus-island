const formatTime = date => {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hour = date.getHours()
  const minute = date.getMinutes()
  const second = date.getSeconds()

  return `${[year, month, day].map(formatNumber).join('/')} ${[hour, minute, second].map(formatNumber).join(':')}`
}

const formatNumber = n => {
  n = n.toString()
  return n[1] ? n : `0${n}`
}

const formatDuration = (seconds) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  
  if (h > 0) {
    return `${formatNumber(h)}:${formatNumber(m)}:${formatNumber(s)}`;
  }
  return `${formatNumber(m)}:${formatNumber(s)}`;
}

const generateId = (prefix = 'id') => {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
}

module.exports = {
  formatTime,
  formatDuration,
  formatNumber,
  generateId
}