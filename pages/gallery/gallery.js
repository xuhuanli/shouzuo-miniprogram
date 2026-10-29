const { cats } = require('../../data/products.js');
const db = require('../../utils/db.js');

Page({
  data: {
    cats,
    active: '全部',
    list: []
  },

  async onLoad() {
    this.all = await db.getProducts();
    this.setData({ list: this.all });
  },

  async onShow() {
    // 从管理页改完价格回到这里时刷新
    if (this.all) {
      this.all = await db.getProducts();
      const c = this.data.active;
      this.setData({ list: c === '全部' ? this.all : this.all.filter((p) => p.cat === c) });
    }
  },

  tapCat(e) {
    const c = e.currentTarget.dataset.cat;
    this.setData({
      active: c,
      list: c === '全部' ? this.all : this.all.filter((p) => p.cat === c)
    });
  },

  goDetail(e) {
    wx.navigateTo({
      url: '/pages/detail/detail?id=' + e.currentTarget.dataset.id
    });
  },

  // 没找到想要的 → 找主理人许愿
  wish() {
    const app = getApp();
    const wxId = (app.globalData.shopWechat || '').trim();
    wx.showModal({
      title: '许个愿吧',
      content: '加主理人微信，把想要的样子说给她听：' + wxId,
      confirmText: '复制微信号',
      cancelText: '看看小店',
      success: (res) => {
        if (res.confirm && wxId) {
          wx.setClipboardData({
            data: wxId,
            success: () => wx.showToast({ title: '微信号已复制', icon: 'none' })
          });
        } else if (!res.confirm) {
          wx.navigateTo({ url: '/pages/about/about' });
        }
      }
    });
  }
});
