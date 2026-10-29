const db = require('../../utils/db.js');
const cart = require('../../utils/cart.js');
const preview = require('../../utils/preview.js');

const DEF_GRADE = '普通';

// 按材质挑出属于它的布料；这一档还没配布就先用全部布料兜底
function pickFabrics(all, grade) {
  const own = (all || []).filter((f) => (f.g || DEF_GRADE) === grade);
  if (own.length) return { list: own, fallback: false };
  return { list: all || [], fallback: !!(all && all.length) };
}

Page({
  data: {
    p: null,
    loading: true,
    current: 0,
    gradeIndex: 0,
    price: 0,
    priceLine: '',
    tableList: [],
    liningList: [],
    tableIndex: 0,
    liningIndex: 0,
    qty: 1,
    tableFallback: false,
    liningFallback: false
  },

  async onLoad(options) {
    this.productId = options.id;
    this.picked = {}; // 每档材质各自记住选过的布料
    const p = await db.getProduct(options.id);
    if (!p) {
      wx.showToast({ title: '作品不存在', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1200);
      return;
    }

    const gradeIndex = Math.min(Number(options.grade) || 0, p.grades.length - 1);
    this.setData({
      p,
      loading: false,
      price: p.grades[gradeIndex].price,
      priceLine: p.grades.map((g) => g.k + ' ¥' + g.price).join('　')
    });
    this.applyGrade(gradeIndex);
    wx.setNavigationBarTitle({ title: p.name });
  },

  // 切换材质：价格、表布、里布一起换
  applyGrade(gradeIndex) {
    const p = this.data.p;
    const grade = p.grades[gradeIndex].k;
    const t = pickFabrics(p.tableFabrics, grade);
    const l = pickFabrics(p.liningFabrics, grade);
    const mem = this.picked[grade] || { t: 0, l: 0 };
    const tableIndex = Math.min(mem.t, Math.max(t.list.length - 1, 0));
    const liningIndex = Math.min(mem.l, Math.max(l.list.length - 1, 0));
    this.picked[grade] = { t: tableIndex, l: liningIndex };

    this.setData({
      gradeIndex,
      price: p.grades[gradeIndex].price,
      tableList: t.list,
      liningList: l.list,
      tableFallback: t.fallback,
      liningFallback: l.fallback,
      tableIndex,
      liningIndex
    });
  },

  onSwiper(e) {
    this.setData({ current: e.detail.current });
  },

  previewBig(e) {
    preview.open(this.data.p.images, e.currentTarget.dataset.src);
  },

  pickGrade(e) {
    const i = Number(e.currentTarget.dataset.i);
    if (i === this.data.gradeIndex) return;
    this.applyGrade(i);
  },

  pickTable(e) {
    const tableIndex = Number(e.currentTarget.dataset.i);
    const grade = this.data.p.grades[this.data.gradeIndex].k;
    this.picked[grade] = Object.assign({}, this.picked[grade], { t: tableIndex });
    this.setData({ tableIndex });
  },

  pickLining(e) {
    const liningIndex = Number(e.currentTarget.dataset.i);
    const grade = this.data.p.grades[this.data.gradeIndex].k;
    this.picked[grade] = Object.assign({}, this.picked[grade], { l: liningIndex });
    this.setData({ liningIndex });
  },

  // 数量最少 1，到 1 时减号置灰、点了没反应
  minusQty() {
    if (this.data.qty <= 1) return;
    this.setData({ qty: this.data.qty - 1 });
  },

  plusQty() {
    this.setData({ qty: this.data.qty + 1 });
  },

  // 加入购物车：把当前选好的 材质/表布/里布/数量 一起带过去
  addToCart() {
    const { p, gradeIndex, tableIndex, liningIndex, tableList, liningList, qty } = this.data;
    const g = p.grades[gradeIndex];
    const table = tableList[tableIndex];
    const lining = liningList[liningIndex];

    cart.add({
      styleId: p.id,
      styleName: p.name,
      img: p.img,
      grade: g.k,
      gradeIndex,
      price: g.price,
      tableFabric: table ? table.n : '',
      tableIndex,
      liningFabric: lining ? lining.n : '',
      liningIndex,
      qty
    });

    wx.showToast({ title: qty > 1 ? '已加入购物车 ×' + qty : '已加入购物车', icon: 'none' });
  }
});
