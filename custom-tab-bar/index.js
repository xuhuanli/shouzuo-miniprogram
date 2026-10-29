// 自定义底部导航：选中项有滑动的粉色底块 + 图标弹一下
// 每个 tab 页都会各自生成一个本组件实例，所以「上一次停在哪」记在模块变量里，
// 新页面的导航先停在上一个位置，再滑到自己这一格，切换时才看得到动画
const cart = require('../utils/cart.js');

const LIST = [
  { pagePath: '/pages/index/index', text: '首页', icon: 'home' },
  { pagePath: '/pages/gallery/gallery', text: '作品', icon: 'bag' },
  { pagePath: '/pages/cart/cart', text: '购物车', icon: 'cart' },
  { pagePath: '/pages/orders/orders', text: '我的', icon: 'me' }
];

let shown = 0;

Component({
  options: { styleIsolation: 'apply-shared' },

  data: {
    list: LIST,
    selected: shown,
    badge: ''
  },

  lifetimes: {
    attached() {
      this.setData({ selected: shown, badge: badgeText(cart.count()) });
    }
  },

  methods: {
    // tab 页 onShow 时调用：滑到自己这一格，顺便刷新购物车角标
    refresh(index) {
      const badge = badgeText(cart.count());
      if (this.data.selected === shown && shown === index) {
        this.setData({ badge });
        return;
      }
      // 先回到上一个位置，下一帧再滑过来，两次 setData 分开才会有过渡
      this.setData({ selected: shown, badge });
      shown = index;
      setTimeout(() => this.setData({ selected: index }), 30);
    },

    setBadge(n) {
      this.setData({ badge: badgeText(n) });
    },

    switchTab(e) {
      const i = Number(e.currentTarget.dataset.i);
      if (i === this.data.selected) return;
      wx.switchTab({ url: LIST[i].pagePath });
    }
  }
});

function badgeText(n) {
  if (!n) return '';
  return n > 99 ? '99+' : String(n);
}
