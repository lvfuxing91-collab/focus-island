# 专注岛 Focus Island - 产品需求文档 PRD v1.0

========== 基础信息 ==========
版本号：v1.0
创建日期：2026.4.16

========== 词汇解释 ==========
- 正向计时：也称自由模式，从0开始累加计时，预设时长上限8小时，用户可随时结束
- 专注事项：用户在某段专注时间内完成的具体任务，可添加多个，如"背单词""改稿子""敲代码"
- 标签分类：专注事项的归类标签，如"学习""工作""运动"等，用于数据统计分析
- 番茄钟：预设时长的专注时段，常见为25分钟，到时间自动提醒

========== 功能需求（v1.0 MVP范围） ==========
【P0 核心功能】
1. 正向计时
   - 点击即开始，无预设时长，上限8小时自动停止
   - 异常处理：环境异常（小程序切后台等）校准时间；放弃需二次确认；本地存储满提示等。
2. 番茄钟
   - 25min/1h/2h固定倒计时，到点提醒
3. 专注事项记录
   - 计时前/中/后随时添加、编辑、删除专注事项
4. 本地存储
   - 专注记录本地持久化，wx.storage
5. 个人页
   - 查看历史专注总时长、累计专注次数、今日专注时长

========== 技术规范 ==========
- 开发框架：微信小程序原生（不用uni-app/Taro）
- UI组件库：Vant Weapp (需通过 npm 安装并构建 npm)
- 状态管理：原生globalData（不引入第三方库）
- 存储方案：wx.storage本地存储

数据结构定义：
1. FocusSession: id, mode, pomodoroPreset, startTime, endTime, duration, isAbandoned, isInterrupted, items, createdAt
2. FocusItem: id, content, tagId, startTime, endTime
3. Tag: id, name, color, isDefault (默认标签：学习、工作、运动、其他)
4. TimerSnapshot: isRunning, mode, startTime, pausedDuration, currentItems, lastSnapshotTime

核心页面列表：
1. 首页 (pages/index) - 显示今日专注总时长和次数，"开始专注"按钮，番茄钟时长选择，底部导航
2. 计时中页面 (pages/timer) - 圆形进度环，当前时长，"添加事项"，"暂停/继续/结束/放弃"
3. 记录编辑页 (pages/record) - 专注事项列表，添加/编辑/删除，"保存"
4. 我的页面 (pages/profile) - 历史记录概览和列表

原型UI要求：
- 主色调深蓝（#0F6C8C）、浅蓝渐变
- 首页有超大圆形时间显示和模式切换（自由模式/番茄钟），底部有TabBar（专注、统计、设置）
- 计时页面有圆形进度环，中间显示时间
- 待办事项可以弹出面板添加
- 优先保证核心流程能跑，UI美观度其次。

请生成完整的微信小程序项目文件，包括 app.js, app.json, pages 目录结构，并在 package.json 中配置 vant-weapp。确保可以直接在微信开发者工具中打开。
