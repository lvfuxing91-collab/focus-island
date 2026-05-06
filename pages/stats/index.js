const storage = require('../../utils/storage.js');
const { formatTime, formatDuration } = require('../../utils/util.js');

Page({
  data: {
    timeRange: 'week',
    todayDurationM: '0',
    todayCount: 0,
    streakDays: 0,
    totalDurationH: '0',
    totalCount: 0,
    sessions: [],
    recentSessions: [],
    chartData: [],
    tagStats: [],
    selectedChartData: null
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().init();
    }
    this.loadData();
  },

  switchTimeRange(e) {
    const range = e.currentTarget.dataset.range;
    if (range !== this.data.timeRange) {
      this.setData({ timeRange: range, selectedChartData: null }, () => {
        this.loadData();
      });
    }
  },

  onChartBarTap(e) {
    const index = e.currentTarget.dataset.index;
    const chartData = this.data.chartData.map((d, i) => ({
      ...d,
      active: i === index
    }));
    this.setData({
      selectedChartData: chartData[index],
      chartData
    });
  },

  loadData() {
    const sessions = storage.getSessions();
    const tags = storage.getTags();
    const { timeRange } = this.data;
    
    let todayDuration = 0;
    let todayCount = 0;
    let totalDuration = 0;
    let totalCount = sessions.length;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayMs = today.getTime();

    // 1. Calculate Streak
    const sessionDays = new Set();
    sessions.forEach(s => {
      const d = new Date(s.createdAt);
      d.setHours(0, 0, 0, 0);
      sessionDays.add(d.getTime());
    });
    
    let streakDays = 0;
    let checkTime = todayMs;
    if (!sessionDays.has(todayMs)) {
       checkTime -= 86400000;
    }
    while(sessionDays.has(checkTime)) {
      streakDays++;
      checkTime -= 86400000;
    }

    // 2. Prepare Chart Data & Tag Stats
    const chartData = [];
    const daysCount = timeRange === 'week' ? 7 : 30;
    const dayNames = ['日', '一', '二', '三', '四', '五', '六'];
    
    const tagDurations = {};
    tags.forEach(t => tagDurations[t.id] = 0);
    
    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date(todayMs - i * 86400000);
      let label = '';
      if (timeRange === 'week') {
        label = dayNames[d.getDay()];
      } else {
        label = d.getDate().toString();
      }
      chartData.push({
        label,
        fullDate: `${d.getMonth()+1}月${d.getDate()}日`,
        timestamp: d.getTime(),
        duration: 0,
        height: 0,
        active: i === 0 // Today is active initially
      });
    }

    // 3. Process sessions
    const formattedSessions = sessions.map(session => {
      totalDuration += session.duration;
      
      const sessionDayStart = new Date(session.createdAt);
      sessionDayStart.setHours(0, 0, 0, 0);
      const sessionDayMs = sessionDayStart.getTime();
      
      if (sessionDayMs === todayMs) {
        todayDuration += session.duration;
        todayCount += 1;
      }

      const dayData = chartData.find(d => d.timestamp === sessionDayMs);
      if (dayData) {
        dayData.duration += session.duration;
        
        // Use pre-calculated tagDurations if available
        if (session.tagDurations) {
          Object.keys(session.tagDurations).forEach(tagId => {
            if (tagDurations[tagId] !== undefined) {
              tagDurations[tagId] += session.tagDurations[tagId];
            }
          });
        } else {
          // Fallback for old data
          const durPerItem = session.items.length > 0 ? session.duration / session.items.length : session.duration;
          session.items.forEach(item => {
            const tagId = item.tagId || 'tag_other';
            if (tagDurations[tagId] !== undefined) {
              tagDurations[tagId] += durPerItem;
            }
          });
        }
      }

      const dateObj = new Date(session.createdAt);
      const isToday = sessionDayMs === todayMs;
      const isYesterday = sessionDayMs === todayMs - 86400000;
      
      let dateStr = '';
      if (isToday) {
        dateStr = `今天 ${formatNumber(dateObj.getHours())}:${formatNumber(dateObj.getMinutes())}`;
      } else if (isYesterday) {
        dateStr = `昨天 ${formatNumber(dateObj.getHours())}:${formatNumber(dateObj.getMinutes())}`;
      } else {
        dateStr = formatTime(dateObj);
      }

      let durationStr = '';
      const m = Math.ceil(session.duration / 60);
      if (m > 0) {
        durationStr = `${m}min`;
      } else {
        durationStr = `0min`;
      }
      
      const items = session.items.map(item => {
        const tag = tags.find(t => t.id === item.tagId) || tags[0];
        return {
          ...item,
          tagName: tag.name,
          tagColor: tag.color
        };
      });

      const uniqueTags = [];
      const tagIds = new Set();
      items.forEach(item => {
        if (!tagIds.has(item.tagId)) {
          tagIds.add(item.tagId);
          uniqueTags.push({ id: item.tagId, color: item.tagColor, name: item.tagName });
        }
      });
      if (uniqueTags.length === 0) {
        const defaultTag = tags.find(t => t.id === 'tag_other') || tags[0] || { color: '#9B9B9B', name: '其他' };
        uniqueTags.push({ id: defaultTag.id, color: defaultTag.color, name: defaultTag.name });
      }

      return {
        ...session,
        dateStr,
        durationStr,
        items,
        uniqueTags
      };
    });

    // 4. Calculate Tag Stats Percentages
    let periodTotalDuration = 0;
    chartData.forEach(d => periodTotalDuration += d.duration);

    const tagStats = tags.map(t => {
      const dur = tagDurations[t.id];
      const percentage = periodTotalDuration > 0 ? Math.round((dur / periodTotalDuration) * 100) : 0;
      return {
        id: t.id,
        name: t.name,
        color: t.color,
        percentage,
        duration: dur
      };
    }).filter(t => t.percentage > 0).sort((a, b) => b.percentage - a.percentage);

    // 5. Calculate chart heights
    let maxDuration = 0;
    chartData.forEach(d => {
      if (d.duration > maxDuration) maxDuration = d.duration;
      const m = Math.ceil(d.duration / 60);
      d.durationStr = `${m} 分钟`;
    });

    chartData.forEach(d => {
      if (maxDuration === 0) {
        d.height = 5;
      } else {
        d.height = Math.max(5, (d.duration / maxDuration) * 100);
      }
    });

    const todayM = Math.ceil(todayDuration / 60).toString();
    const totalH = (totalDuration / 3600).toFixed(1);
    const selectedChartData = this.data.selectedChartData || chartData[chartData.length - 1];

    if (!this.data.selectedChartData) {
      chartData[chartData.length - 1].active = true;
    }

    this.setData({
      todayDurationM: todayM,
      todayCount: todayCount,
      totalDurationH: totalH,
      totalCount: totalCount,
      streakDays,
      chartData,
      tagStats,
      recentSessions: formattedSessions.slice(0, 5),
      selectedChartData
    });
  }
});

function formatNumber(n) {
  n = n.toString()
  return n[1] ? n : `0${n}`
}
