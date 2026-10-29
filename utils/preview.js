// 打开自己的图片预览页（pages/preview）：左右滑、捏合 / 双击放大
// urls 是这一组要看的图，current 是先显示哪一张（传图片地址）
function open(urls, current) {
  const list = (urls || []).filter(Boolean);
  if (!list.length) return;
  wx.navigateTo({
    url:
      '/pages/preview/preview?urls=' +
      encodeURIComponent(JSON.stringify(list)) +
      '&current=' +
      Math.max(0, list.indexOf(current))
  });
}

module.exports = { open };
