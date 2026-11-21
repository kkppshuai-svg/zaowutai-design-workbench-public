# 造物台 · AI 工业设计工作台

[打开工作台](https://zaowutai-wheel-studio.goldendace4.chatgpt.site/)

从设计灵感、工业设计图、Blender 建模到材质布光与效果渲染的浏览器工作台。示例项目包含轮毂盖参考板、七张渲染图和 Blender 工程。

在仓库根目录运行即可本地预览：

```sh
python -m http.server 8000 --directory dist
```

打开 http://localhost:8000，选择设计阶段，填写模型服务的 API Key，再生成阶段成果。API Key 仅在当前页面使用；服务商须允许浏览器访问。自建项目保存在浏览器中，可通过「项目迁移」备份。生成的 Blender 脚本可在本机 Blender 中检查并运行。
