const db = require('../../utils/db.js');
const local = require('../../data/products.js');

const DEFAULTS = {
  notices: [
    '宝贝们可以实时关注抖音上新',
    '可以在现有布料里更换其他布料',
    '付定金 25r 确认排单哟',
    '裁剪布料后定金不退！',
    '做好成品后弃单定金不退！',
    '发货后不退不换！',
    '如有做工问题请收货 24 小时内拍照联系',
    '不是全职手工人 制作不易望理解'
  ],
  noticeEndLines: ['大胆问！多沟通！', '不买没关系！'],
  steps: [
    { icon: '①', title: '付定金', desc: '25r 确认排单' },
    { icon: '②', title: '制作', desc: '4–12 天' },
    { icon: '③', title: '付尾款', desc: '成品确认后' },
    { icon: '④', title: '发货', desc: '满69包邮 不满补6r运费' }
  ]
};

Page({
  data: Object.assign({ featured: local.getFeatured() }, DEFAULTS),

  async onLoad() {
    try {
      const [list, shop] = await Promise.all([db.getProducts(), db.getShop()]);

      // 精选 3 款：云端标了 featured 的优先，否则按本地 featuredIds 顺序取
      const flagged = (list || []).filter((p) => p.featured);
      const featured = flagged.length
        ? flagged.slice(0, 3)
        : local.featuredIds
            .map((id) => (list || []).find((p) => p.id === id))
            .filter(Boolean)
            .slice(0, 3);

      const patch = {};
      if (featured.length) patch.featured = featured;
      if (shop) {
        if (shop.notices && shop.notices.length) patch.notices = shop.notices;
        if (shop.noticeEndLines && shop.noticeEndLines.length) patch.noticeEndLines = shop.noticeEndLines;
        if (shop.steps && shop.steps.length) patch.steps = shop.steps;
      }
      this.setData(patch);
    } catch (e) {
      console.warn('[index] 读取云端数据失败，使用本地内容', e);
    }
  },

  goDetail(e) {
    wx.navigateTo({
      url: '/pages/detail/detail?id=' + e.currentTarget.dataset.id
    });
  },

  goGallery() {
    wx.switchTab({ url: '/pages/gallery/gallery' });
  },

  goAbout() {
    wx.navigateTo({ url: '/pages/about/about' });
  }
});
