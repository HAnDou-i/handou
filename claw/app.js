const navCards = [
  {
    icon: '🛒',
    title: '便携版文件',
    description: '解压即可运行无套路',
    actions: [
      { text: '淘宝\n购买', url: 'https://e.tb.cn/h.RdpvxZYYYgRqsIR?tk=ivhv5uUsWwc' },
      { text: '博主\n微信', url: 'https://www.kdocs.cn/l/cpFqiPsjvIFS' }, 
    ]
  },
  {
    icon: '📖',
    title: '安装说明',
    description: '便携版文件一些说明',
    url: 'https://www.kdocs.cn/l/coFEdkLtwPSX',
    action: '查看\n说明'
  },
  {
    icon: '🛠',
    title: 'skill安装方法',
    description: 'openclaw技能安装方法',
    url: 'https://www.clawhub.com',
    action: '去看看'
  },
]

const toolCards = [
  {
    icon: '🖼️',
    title: '免费4K壁纸',
    description: '',
    url: 'https://haowallpaper.com/',
    action: '打开'
  },
  {
    icon: '📝',
    title: '完全免费的中文AI提示词',
    description: '',
    url: 'https://prompt123.cn/',
    action: '查看'
  },
  {
    icon: '🎵',
    title: '网易云音乐批量下载器',
    description: '',
    url: 'https://mscdownload.pages.dev/',
    action: '前往'
  },
  {
    icon: '🎶',
    title: '抖音直播数据',
    description: '',
    url: 'https://douyin.phpnbw.com/',
    action: '查询'
  },
  {
    icon: '🏛',
    title: '全景故宫',
    description: '',
    url: 'https://pano.dpm.org.cn/',
    action: '点击游览'
  },
  {
    icon: '....',
    title: '持续添加中',
    description: '',
    url: '#',
    action: '无'
  }
]

const navGrid = document.getElementById('navGrid')
const toolsGrid = document.getElementById('toolsGrid')
const navCardTemplate = document.getElementById('navCardTemplate')
const toolCardTemplate = document.getElementById('toolCardTemplate')
const clockTime = document.getElementById('clockTime')
const clockDate = document.getElementById('clockDate')

function normalizeUrl(url) {
  if (!url) return '#'
  if (/^(https?:\/\/|\.\/|\.\.\/|\/)/i.test(url)) return url
  if (/^[\w-]+\.html?(#.*)?$/i.test(url)) return `./${url}`
  return `https://${url}`
}

function renderCardList(list, container, template) {
  if (!container || !template) return

  container.innerHTML = ''

  list.forEach((card) => {
    const fragment = template.content.cloneNode(true)
    const cardNode = fragment.querySelector('.nav-card')
    const icon = fragment.querySelector('.nav-card__icon')
    const title = fragment.querySelector('.nav-card__title')
    const description = fragment.querySelector('.nav-card__description')
    const action = fragment.querySelector('.nav-card__action')
    const actions = fragment.querySelector('.nav-card__actions')
    const url = normalizeUrl(card.url)

    if (cardNode.tagName === 'A') {
      cardNode.href = url
    }

    icon.textContent = card.icon || '✨'
    title.textContent = card.title || '未命名入口'

    if (description) {
      const text = card.description || ''
      if (text) {
        description.textContent = text
      } else {
        description.remove()
      }
    }

    if (actions) {
      const items = Array.isArray(card.actions) && card.actions.length
        ? card.actions
        : [{ text: card.action || '立即前往', url: card.url }]

      actions.innerHTML = ''

      items.forEach((item) => {
        const actionLink = document.createElement('a')
        actionLink.className = 'nav-card__action'
        actionLink.target = '_blank'
        actionLink.rel = 'noopener noreferrer'
        actionLink.href = normalizeUrl(item.url)
        actionLink.textContent = item.text || '立即前往'
        actions.appendChild(actionLink)
      })
    } else if (action) {
      action.textContent = card.action || '立即前往'
    }

    container.appendChild(fragment)
  })
}

function updateClock() {
  const now = new Date()
  const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
  const pad = (value) => String(value).padStart(2, '0')

  clockTime.textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
  clockDate.textContent = `${now.getFullYear()}年${pad(now.getMonth() + 1)}月${pad(now.getDate())}日 ${weekdays[now.getDay()]}`
}

renderCardList(navCards, navGrid, navCardTemplate)
renderCardList(toolCards, toolsGrid, toolCardTemplate)
updateClock()
setInterval(updateClock, 1000)
