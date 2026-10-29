const db = require('../../utils/db.js');
const store = require('../../utils/store.js');

Page({
  data: {
    orders: [],
    loading: true,
    cloud: false
  },

  onShow() {
    const bar = this.getTabBar && this.getTabBar();
    if (bar) bar.refresh(3);
    this.load();
  },

  onPullDownRefresh() {
    this.load().then(() => wx.stopPullDownRefresh());
  },

  async load() {
    this.setData({ cloud: db.isCloud() });
    try {
      const list = (await db.myOrders()) || [];
      this.setData({
        orders: list.map((o) => Object.assign({}, o, { id: o._id || o.id })),
        loading: false
      });
    } catch (e) {
      console.error(e);
      this.setData({ loading: false });
      wx.showToast({ title: e.message || '读取订单失败', icon: 'none' });
    }
  },

  copyOrder(e) {
    const order = this.data.orders.find((o) => o.id === e.currentTarget.dataset.id);
    if (!order) return;
    wx.setClipboardData({
      data: store.buildOrderText(order),
      success: () => wx.showToast({ title: '预约单已复制', icon: 'none' })
    });
  },

  // 复制物流单号，方便去快递 App / 小程序里查
  copyTracking(e) {
    const order = this.data.orders.find((o) => o.id === e.currentTarget.dataset.id);
    if (!order || !order.trackingNo) return;
    wx.setClipboardData({
      data: order.trackingNo,
      success: () => wx.showToast({ title: '单号已复制，去快递App粘贴查询', icon: 'none' })
    });
  },

  cancelOrder(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '取消这条预约？',
      content: '取消后可以重新提交，记录不会删除。',
      confirmText: '取消预约',
      cancelText: '再想想',
      success: async (res) => {
        if (!res.confirm) return;
        try {
          await db.cancelMyOrder(id);
          this.load();
        } catch (err) {
          wx.showToast({ title: err.message || '取消失败', icon: 'none' });
        }
      }
    });
  },

  removeOrder(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '删除这条记录？',
      content: '删除后无法恢复。',
      confirmText: '删除',
      confirmColor: '#EC8FA5',
      success: async (res) => {
        if (!res.confirm) return;
        try {
          await db.deleteMyOrder(id);
          this.load();
        } catch (err) {
          wx.showToast({ title: err.message || '删除失败', icon: 'none' });
        }
      }
    });
  },

  goGallery() {
    wx.switchTab({ url: '/pages/gallery/gallery' });
  },

  goAbout() {
    wx.navigateTo({ url: '/pages/about/about' });
  }
});
