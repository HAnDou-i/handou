const navCards = [
  {
    icon: '🛒',
    title: '便携版文件',
    description: '解压即可运行无套路',
    url: 'https://e.tb.cn/h.RdpvxZYYYgRqsIR?tk=ivhv5uUsWwc',
    action: '立即购买'
  },
    {
    icon: '📖',
    title: '安装说明',
    description: '便携版文件一些说明',
    url: 'https://www.kdocs.cn/l/coFEdkLtwPSX',
    action: '查看说明'
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
    icon: '🧠',
    title: '灵感',
    description: '',
    url: 'https://www.notion.so',
    action: '打开'
  },
  {
    icon: '⏳',
    title: '倒计时',
    description: '',
    url: 'https://time.is/',
    action: '查看'
  },
  {
    icon: '📋',
    title: '复制',
    description: '',
    url: 'https://www.notion.so',
    action: '前往'
  },
  {
    icon: '🍰',
    title: '热量',
    description: '',
    url: 'https://your-project-ref.supabase.co/functions/v1/calories?food=蛋糕',
    action: '查询'
  },
  {
    icon: '📆',
    title: '日历',
    description: '',
    url: 'https://calendar.google.com/',
    action: '打开'
  },
  {
    icon: '🗂️',
    title: '网盘',
    description: '',
    url: 'https://drive.google.com/',
    action: '进入'
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
    const link = fragment.querySelector('.nav-card')
    const icon = fragment.querySelector('.nav-card__icon')
    const title = fragment.querySelector('.nav-card__title')
    const description = fragment.querySelector('.nav-card__description')
    const action = fragment.querySelector('.nav-card__action')

    link.href = normalizeUrl(card.url)
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

    action.textContent = card.action || '立即前往'

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
