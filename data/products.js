// 商品数据：价格 / 文案 / 图片都在这里，接云开发后在「店主管理」里改
//
// 每件作品的结构：
//   name            作品名
//   cat             分类（要和下面 cats 里的一致）
//   summary         作品页卡片上的一句话
//   images          作品图，多张可左右滑动
//   grades          材质档位 [{ k:'普通', price:25.9 }, { k:'缎面', price:30.9 }]
//   size            产品尺寸（详情页「关于这件作品」里那个小框）
//   desc            关于这件作品（后台可改）
//   tableFabrics    表布可选，[{ n:'名字', img:'图片', g:'普通/缎面' }] 可多张
//   liningFabrics   里布可选，同上
//   g               这块布属于哪档材质；普通和缎面的布可以完全不一样
const products = [
  {
    id: 'toilet-pouch',
    name: '厕所包',
    cat: '布包',
    summary: '巴掌大的挂包，纸巾口红钥匙刚好装下',
    images: ['/assets/p-toilet.jpg'],
    img: '/assets/p-toilet.jpg',
    grades: [
      { k: '普通', price: 25.9 },
      { k: '缎面', price: 30.9 }
    ],
    price: 25.9,
    unit: '起',
    size: '约 12 × 9 × 4 cm，可挂手提包内侧',
    desc: '外层是绗缝波点棉布，压了云朵一样的格纹，摸起来软而有型。拉链绕过三边，开口大、好拿东西；里面没有隔层，装纸巾、口红、钥匙、创可贴都放得下。',
    tableFabrics: [
      { n: '奶白波点绗缝', img: '/assets/f-toilet-face.jpg', g: '普通' },
      { n: '奶白小熊绗缝', img: '/assets/f-toast-face.jpg', g: '普通' },
      { n: '奶白小花缎面', img: '/assets/f-shell-face.jpg', g: '缎面' }
    ],
    liningFabrics: [
      { n: '米黄棉布', img: '/assets/f-toilet-lining.jpg', g: '普通' },
      { n: '红底白波点', img: '/assets/f-shell-lining.jpg', g: '缎面' }
    ]
  },
  {
    id: 'shell-pouch',
    name: '贝壳风琴首饰包',
    cat: '首饰',
    summary: '打开像贝壳一样展开，戒指耳钉各归各位',
    images: ['/assets/p-shell.jpg'],
    img: '/assets/p-shell.jpg',
    grades: [
      { k: '普通', price: 39.9 },
      { k: '缎面', price: 45.9 }
    ],
    price: 39.9,
    unit: '起',
    size: '约 10 × 10 × 7 cm（合上后）',
    desc: '风琴隔层是手工一片片缝起来的，拉开像贝壳张开，八个口袋分开装戒指、耳钉、项链，不打结也不互相刮花。外层缎面，收口用同色拉链，出门直接塞进包里。',
    tableFabrics: [
      { n: '奶白小花缎面', img: '/assets/f-shell-face.jpg', g: '缎面' },
      { n: '奶白波点绗缝', img: '/assets/f-toilet-face.jpg', g: '普通' }
    ],
    liningFabrics: [
      { n: '红底白波点', img: '/assets/f-shell-lining.jpg', g: '缎面' },
      { n: '米黄棉布', img: '/assets/f-toilet-lining.jpg', g: '普通' }
    ]
  },
  {
    id: 'toast-pouch',
    name: '吐司化妆包',
    cat: '化妆',
    summary: '吐司形状的化妆包，软软的能装下一整套',
    images: ['/assets/p-toast.jpg'],
    img: '/assets/p-toast.jpg',
    grades: [
      { k: '普通', price: 39.9 },
      { k: '缎面', price: 45.9 }
    ],
    price: 39.9,
    unit: '起',
    size: '约 18 × 10 × 9 cm（含提手）',
    desc: '做成一片吐司的样子，边角是圆弧的，塞进包里不硌手。外层绗缝小熊印花棉布，里面配一块红底白波点的里布，打开就有好心情。容量能装下粉底、散粉、眼影盘和一整套刷子，另有一个小提手可以拎着走。',
    tableFabrics: [
      { n: '奶白小熊绗缝', img: '/assets/f-toast-face.jpg', g: '普通' },
      { n: '奶白波点绗缝', img: '/assets/f-toilet-face.jpg', g: '普通' },
      { n: '奶白小花缎面', img: '/assets/f-shell-face.jpg', g: '缎面' }
    ],
    liningFabrics: [
      { n: '红底白波点', img: '/assets/f-toast-lining.jpg', g: '普通' },
      { n: '米黄棉布', img: '/assets/f-toilet-lining.jpg', g: '缎面' }
    ]
  }
];

const cats = ['全部', '布包', '首饰', '化妆'];

// 首页「精选款式」放的 3 款（写商品 id，顺序即显示顺序）
const featuredIds = ['toilet-pouch', 'shell-pouch', 'toast-pouch'];

function getById(id) {
  return products.find((p) => p.id === id) || null;
}

function getFeatured() {
  return featuredIds.map(getById).filter(Boolean).slice(0, 3);
}

module.exports = { products, cats, featuredIds, getById, getFeatured };
