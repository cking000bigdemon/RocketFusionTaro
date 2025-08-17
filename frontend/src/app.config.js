export default defineAppConfig({
  pages: [
    'pages/index/index',
    'pages/about/index'
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#fff',
    navigationBarTitleText: 'Rocket Taro App',
    navigationBarTextStyle: 'black'
  },
  tabBar: {
    color: '#7A7E83',
    selectedColor: '#3cc51f',
    borderStyle: 'black',
    backgroundColor: '#ffffff',
    list: [
      {
        pagePath: 'pages/index/index',
        iconPath: 'assets/tab-bar/home.png',
        selectedIconPath: 'assets/tab-bar/home-active.png',
        text: '首页'
      },
      {
        pagePath: 'pages/about/index',
        iconPath: 'assets/tab-bar/about.png',
        selectedIconPath: 'assets/tab-bar/about-active.png',
        text: '关于'
      }
    ]
  }
})