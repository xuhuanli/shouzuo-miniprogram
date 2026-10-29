// 图片预览：左右滑切图，双指捏合或双击放大看细节，单击关闭
// 用法：wx.navigateTo({ url: '/pages/preview/preview?urls=' + encodeURIComponent(JSON.stringify(urls)) + '&current=0' })
const DOUBLE_SCALE = 2.5;
const DOUBLE_GAP = 280; // 两次点击间隔小于这个算双击（毫秒）

Page({
  data: {
    urls: [],
    current: 0,
    scales: [],
    zoomed: false,
    statusTop: 20,
    hintHide: false
  },

  onLoad(query) {
    let urls = [];
    try {
      urls = JSON.parse(decodeURIComponent(query.urls || '[]'));
    } catch (e) {
      urls = [];
    }
    if (!urls.length) return wx.navigateBack();

    const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    this.realScale = 1; // 当前这张图实际的缩放（捏合时 scale-value 不会跟着变，要自己记）
    this.setData({
      urls,
      current: Math.min(Number(query.current) || 0, urls.length - 1),
      scales: urls.map(() => 1),
      statusTop: info.statusBarHeight || 20
    });
    this.hintTimer = setTimeout(() => this.setData({ hintHide: true }), 2600);
  },

  onUnload() {
    clearTimeout(this.hintTimer);
    clearTimeout(this.tapTimer);
  },

  // 换到下一张：上一张缩回原样
  onChange(e) {
    const prev = this.data.current;
    this.realScale = 1;
    this.setData({
      current: e.detail.current,
      zoomed: false,
      ['scales[' + prev + ']']: this.nextValue(prev, 1)
    });
  },

  // 捏合缩放中：放大后锁住 swiper，拖图时不会误切到下一张
  onScale(e) {
    this.realScale = e.detail.scale;
    const zoomed = this.realScale > 1.05;
    if (zoomed !== this.data.zoomed) this.setData({ zoomed });
  },

  // 单击关闭，双击 放大 / 还原；单击要等一下，确认不是双击的第一下
  onTap() {
    const now = Date.now();
    if (this.lastTap && now - this.lastTap < DOUBLE_GAP) {
      clearTimeout(this.tapTimer);
      this.lastTap = 0;
      this.toggleZoom();
      return;
    }
    this.lastTap = now;
    this.tapTimer = setTimeout(() => {
      this.lastTap = 0;
      this.close();
    }, DOUBLE_GAP);
  },

  toggleZoom() {
    const i = this.data.current;
    const target = this.realScale > 1.05 ? 1 : DOUBLE_SCALE;
    this.realScale = target;
    this.setData({
      zoomed: target > 1,
      ['scales[' + i + ']']: this.nextValue(i, target)
    });
  },

  // movable-view 的 scale-value 和上次一样时不会生效（捏合过后实际缩放已经变了，绑定值还是旧的），
  // 一样就加一点点差值，逼它重新缩放
  nextValue(i, target) {
    return this.data.scales[i] === target ? target + 0.0001 : target;
  },

  close() {
    wx.navigateBack();
  }
});
