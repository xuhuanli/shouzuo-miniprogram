const config = require('./config.js');
const cart = require('./utils/cart.js');

App({
  onLaunch() {
    // 首次启动时初始化本地存储（未接云开发时的兜底）
    if (!wx.getStorageSync('sz_orders')) {
      wx.setStorageSync('sz_orders', []);
    }

    // 配置了云开发环境 ID 就初始化云能力
    if (config.envId && wx.cloud) {
      try {
        wx.cloud.init({ env: config.envId, traceUser: true });
        this.globalData.cloudReady = true;
      } catch (e) {
        console.error('[cloud] 初始化失败', e);
      }
    }
  },

  onShow() {
    // 购物车角标跟着数量走
    cart.syncBadge();
  },
  globalData: {
    cloudReady: false,
    // 店主联系方式：改成你自己的
    shopWechat: 'xx17687058',
    shopPhone: '',
    shopName: '饭团手作',
    shipFrom: '杭州发货'
  }
});
