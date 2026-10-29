const app = getApp();

Page({
  data: {
    shopName: '饭团手作',
    wechat: '',
    place: '杭州发货',
    process: [
      { t: '选布', d: '每块布都是按我自己的审美挑的，喜欢的风格才舍得做成东西' },
      { t: '裁剪', d: '版型不是一次定死的，跟着大家用下来的反馈一遍遍调到顺手' },
      { t: '缝制', d: '全程机缝，针脚走直走稳' },
      { t: '整烫', d: '做完最后整烫一遍，拿到手是平平整整的' }
    ]
  },

  onLoad() {
    this.setData({ wechat: app.globalData.shopWechat });
  },

  copyWechat() {
    wx.setClipboardData({
      data: this.data.wechat,
      success: () => wx.showToast({ title: '微信号已复制', icon: 'none' })
    });
  },

  goAdmin() {
    wx.navigateTo({ url: '/pages/admin/admin' });
  }
});
