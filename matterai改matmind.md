  完整的恢复说明更新：

  恢复原始图标：

  在 NewApp.tsx 第310-323行删除img标签，取消注释SVG代码

  恢复研究所logo：

  1. NewApp.tsx - 取消注释第252-257行
  2. MindsChat.tsx - 取消注释第79-84行
  3. MindsWelcome.tsx - 取消注释第133-138行

  恢复MatterAI名字：

  1. NewMessageList.tsx - 将两处改回botName = 'MatterAI'
  2. NewApp.tsx - 将第65行改回"MatterAI Agent"，第404行改回"向 MatterAI
  发送消息"
  3. SessionList.tsx - 将第142行改回"MatterAI Agent"
  4. NewSidebar.tsx - 将第318行改回appTitle = "MatterAI"

  现在侧边栏也会显示"MatMind"相关文字，而不是"MatterAI"。