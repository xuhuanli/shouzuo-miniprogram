const db = require('../../utils/db.js');
const store = require('../../utils/store.js');
const cart = require('../../utils/cart.js');
const preview = require('../../utils/preview.js');

const FREE_SHIP = 69;
const SHIP_FEE = 6;

Page({
  data: {
    items: [],
    count: 0,
    goodsTotal: 0,
    urgentFee: 0,
    shipping: 0,
    payTotal: 0,
    urgent: false,
    remark: '',
    nickname: '',
    receiver: '',
    submitting: false,
    // 提交成功的弹窗（自己画的，好控字）
    doneShow: false,
    doneTitle: '',
    doneLines: []
  },

  onLoad() {
    const contact = store.getContact();
    const items = wx.getStorageSync('sz_checkout') || [];

    if (!items.length) {
      wx.showToast({ title: '购物车里没有选中的作品', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 900);
      return;
    }

    const goodsTotal = items.reduce((s, x) => s + x.price * x.qty, 0);
    this.setData(
      {
        items,
        count: items.reduce((s, x) => s + x.qty, 0),
        goodsTotal: Math.round(goodsTotal * 100) / 100,
        nickname: contact.nickname || '',
        receiver: contact.receiver || ''
      },
      () => this.updateTotal()
    );
  },

  onUrgent(e) {
    this.setData({ urgent: e.detail.value }, () => this.updateTotal());
  },

  onRemark(e) {
    this.setData({ remark: e.detail.value });
  },

  onNickname(e) {
    this.setData({ nickname: e.detail.value });
  },

  onReceiver(e) {
    this.setData({ receiver: e.detail.value });
  },

  goCart() {
    wx.switchTab({ url: '/pages/cart/cart' });
  },

  // 满 69 包邮，不满补 6r 运费
  updateTotal() {
    const { goodsTotal, urgent } = this.data;
    const urgentFee = urgent ? Math.round(goodsTotal * 0.2 * 100) / 100 : 0;
    const subtotal = goodsTotal + urgentFee;
    const shipping = subtotal > 0 && subtotal < FREE_SHIP ? SHIP_FEE : 0;
    this.setData({
      urgentFee,
      shipping,
      payTotal: Math.round((subtotal + shipping) * 100) / 100
    });
  },

  async submit() {
    const d = this.data;
    if (d.submitting) return;
    if (!d.items.length) return this.toast('购物车里没有选中的作品');
    if (!d.receiver.trim()) return this.toast('请填写收货信息');
    if (!String(d.nickname || '').trim()) return this.toast('请填写微信昵称');

    this.setData({ submitting: true });
    wx.showLoading({ title: '提交中…', mask: true });

    try {
      // 一次预约 = 一张单：购物车里勾的几件都放进 items，费用按整单算
      const order = {
        no: store.genOrderNo(),
        items: d.items.map((it) => ({
          styleId: it.styleId,
          styleName: it.styleName,
          img: it.img,
          grade: it.grade,
          tableFabric: it.tableFabric,
          liningFabric: it.liningFabric,
          qty: it.qty,
          price: it.price,
          amount: Math.round(it.price * it.qty * 100) / 100
        })),
        count: d.count,
        urgent: d.urgent,
        remark: d.remark,
        nickname: d.nickname,
        receiver: d.receiver,
        goodsTotal: d.goodsTotal,
        urgentFee: d.urgentFee,
        shippingFee: d.shipping,
        payTotal: d.payTotal,
        priceEstimate: '参考价 ¥' + d.payTotal
      };
      const saved = Object.assign({}, order, await db.addOrder(order));

      store.setContact({ nickname: d.nickname, receiver: d.receiver });

      // 下单成功：把购物车里这几件清掉
      cart.remove(d.items.map((x) => x.key));
      wx.removeStorageSync('sz_checkout');

      wx.hideLoading();
      const cloud = db.isCloud();
      const text = store.buildOrderText(saved);

      // 本地模式下店主收不到这张单，先把预约单复制到剪贴板
      if (!cloud) wx.setClipboardData({ data: text });

      // 用页面自己的弹窗，不用 wx.showModal：系统弹窗对 \n 的处理不稳定（换行会变空格），
      // 长句会被挤成奇怪的两行，字号也不受控
      this.setData({
        doneShow: true,
        doneTitle: cloud ? '您的预约已提交给总裁' : '记得找总裁复核订单喔~',
        doneLines: cloud
          ? ['记得找总裁复核总价喔~']
          : ['预约单已帮您复制好', '去微信上粘贴给总裁吧~']
      });
    } catch (e) {
      wx.hideLoading();
      console.error(e);
      wx.showModal({ title: '提交失败', content: e.message || '请检查网络后重试', showCancel: false });
    } finally {
      this.setData({ submitting: false });
    }
  },

  // 弹窗：回作品继续逛 / 去看刚提交的单（购物车这时已经空了，所以不回购物车）
  doneBack() {
    this.setData({ doneShow: false });
    wx.switchTab({ url: '/pages/gallery/gallery' });
  },

  doneOrders() {
    this.setData({ doneShow: false });
    wx.switchTab({ url: '/pages/orders/orders' });
  },

  // 点作品小图：这次要预约的几件一起看
  previewImg(e) {
    preview.open(this.data.items.map((x) => x.img), e.currentTarget.dataset.src);
  },

  toast(title) {
    wx.showToast({ title, icon: 'none' });
  }
});
