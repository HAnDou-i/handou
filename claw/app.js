const navCards = [
  {
    icon: '🛒',
    title: '便携版文件',
    description: '解压即可运行，适合想快速上手的人。',
    actions: [
      { text: '淘宝购买', url: 'https://e.tb.cn/h.RdpvxZYYYgRqsIR?tk=ivhv5uUsWwc' },
      { text: '博主微信', url: 'https://www.kdocs.cn/l/cpFqiPsjvIFS' },
    ]
  },
  {
    icon: '📖',
    title: '安装说明',
    description: '查看便携版文件说明和使用步骤。',
    url: 'https://www.kdocs.cn/l/coFEdkLtwPSX',
    action: '查看说明'
  },
  {
    icon: '🛠️',
    title: 'Skill 安装方法',
    description: '查看 OpenClaw 技能的安装入口与说明。',
    url: 'https://www.clawhub.com',
    action: '前往查看'
  },
]

const toolCards = [
  {
    icon: '🖼️',
    title: '免费 4K 壁纸',
    description: '高清桌面壁纸资源。',
    url: 'https://haowallpaper.com/',
    action: '打开'
  },
  {
    icon: '📝',
    title: '中文 AI 提示词',
    description: '免费中文提示词资源整理。',
    url: 'https://prompt123.cn/',
    action: '查看'
  },
  {
    icon: '🎵',
    title: '网易云批量下载器',
    description: '批量下载相关工具。',
    url: 'https://mscdownload.pages.dev/',
    action: '前往'
  },
  {
    icon: '🎶',
    title: '抖音直播数据',
    description: '直播相关数据查询。',
    url: 'https://douyin.phpnbw.com/',
    action: '查询'
  },
  {
    icon: '🏛️',
    title: '全景故宫',
    description: '在线沉浸式游览。',
    url: 'https://pano.dpm.org.cn/',
    action: '游览'
  },
  {
    icon: '✨',
    title: '持续添加中',
    description: '后续会继续补充更多工具入口。',
    url: '#',
    action: '敬请期待'
  }
]

const navGrid = document.getElementById('navGrid')
const toolsGrid = document.getElementById('toolsGrid')
const navCardTemplate = document.getElementById('navCardTemplate')
const toolCardTemplate = document.getElementById('toolCardTemplate')
const clockTime = document.getElementById('clockTime')
const clockDate = document.getElementById('clockDate')
const timeNums = clockTime?.querySelectorAll('.time-num')
const hourNode = timeNums?.[0]
const minuteNode = timeNums?.[1]
const secondNode = timeNums?.[2]

function normalizeUrl(url) {
  if (!url || url === '#') return '#'
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
      if (url === '#') {
        cardNode.removeAttribute('target')
        cardNode.setAttribute('aria-disabled', 'true')
      }
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

        if (actionLink.href.endsWith('#')) {
          actionLink.removeAttribute('target')
          actionLink.setAttribute('aria-disabled', 'true')
        }

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

  if (hourNode) hourNode.textContent = pad(now.getHours())
  if (minuteNode) minuteNode.textContent = pad(now.getMinutes())
  if (secondNode) secondNode.textContent = pad(now.getSeconds())

  if (clockDate) {
    clockDate.textContent = `${now.getFullYear()}年${pad(now.getMonth() + 1)}月${pad(now.getDate())}日 ${weekdays[now.getDay()]}`
  }
}

renderCardList(navCards, navGrid, navCardTemplate)
renderCardList(toolCards, toolsGrid, toolCardTemplate)
updateClock()
setInterval(updateClock, 1000)
