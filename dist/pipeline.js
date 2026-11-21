const pipeline = (() => {
  const types=['设计方案.md','工业设计图.png','建模.py','材质灯光.py','渲染.py'];
  const jobs=[
    '交付可执行的中文工业设计方案 Markdown，覆盖造型、结构、材料、尺寸假设和验收要点。',
    '交付工业设计概念线图。只输出 JSON，结构为 {"views":[{"name":"正视","lines":[[[x,y],[x,y]]]}]}。分别绘制正视和侧视，坐标范围 0 到 100，y 向下。每条折线至少两个点，用足够的折线描出产品的主体、开口、连接及特征线。圆弧离散成点。仅使用已知尺寸。',
    '交付可在 Blender 5 的脚本编辑器运行的完整 bpy Python 建模脚本。用毫米表达设计意图并换算场景单位。把生成的几何置于名为 DesignProduct 的集合中。保留场景已有对象。只输出代码。',
    '交付完整 Blender bpy 材质与棚拍灯光脚本。读取上游脚本使用的命名，在 DesignProduct 集合已有模型上配置节点、材质和灯光。保留用户其他对象。只输出代码。',
    '交付完整 Blender bpy 渲染脚本，针对 DesignProduct 集合设置相机取景、Cycles 和输出，执行渲染到工程旁唯一命名的 PNG，保留场景已有资产。只输出代码。'
  ];
  async function brief(question,include){
    const parts=['项目：'+p.name,'阶段：'+stages[step],'设计要求：'+(question||'依照已有项目继续设计')];
    if(include)for(let n=0;n<=step;n++){
      if(p.notes[n])parts.push(stages[n]+'笔记：'+p.notes[n]);
      const latest=p.assets[n].filter(a=>a.name.startsWith('AI · ')&&a.blob&&/\.(md|py|json)$/.test(a.name)).at(-1);
      if(latest)parts.push(stages[n]+'已保存成果：'+(await latest.blob.text()).slice(0,24000));
    }
    return parts.join('\n\n');
  }
  function clean(s){return s.trim().replace(/^\x60{3}[^\n]*\n/,'').replace(/\n?\x60{3}$/,'').trim()}
  async function drawing(raw){
    const spec=JSON.parse(clean(raw));if(!Array.isArray(spec.views)||spec.views.length<2)throw Error('设计图缺少视图，请重新生成');
    const views=spec.views.slice(0,4), c=document.createElement('canvas');c.width=600*views.length;c.height=650;
    const g=c.getContext('2d');g.fillStyle='#f5f5ef';g.fillRect(0,0,c.width,c.height);g.strokeStyle='#23332b';g.lineWidth=2;g.font='22px sans-serif';g.fillStyle='#23332b';
    views.forEach((view,i)=>{if(!Array.isArray(view.lines)||!view.lines.length)throw Error('视图缺少轮廓线');g.fillText(String(view.name||'视图'),i*600+35,610);for(const line of view.lines){if(!Array.isArray(line)||line.length<2)throw Error('无效的图纸线段');g.beginPath();line.forEach((point,j)=>{if(!Array.isArray(point)||point.length!==2||!point.every(v=>Number.isFinite(v)&&v>=0&&v<=100))throw Error('无效的图纸坐标');const x=i*600+35+point[0]*5.3,y=30+point[1]*5.3;j?g.lineTo(x,y):g.moveTo(x,y)});g.stroke()}});
    return await new Promise((ok,no)=>c.toBlob(b=>b?ok(b):no(Error('图纸导出失败'))));
  }
  async function commit(files){
    const target=p.assets[step];const first=target.length;
    target.push(...files);try{await persist()}catch{target.splice(first,files.length);throw Error('保存失败，请检查浏览器空间')}
    item=target.length-1;dual=false;draw();
  }
  function asset(name,blob,kind='file'){return {name:'AI · '+name,kind,blob}}
  async function finish(result){
    const raw=clean(result), name=types[step];let files;
    if(step===1)files=[asset('设计图.json',new Blob([raw],{type:'application/json'})),asset(name,await drawing(raw),'image')];
    else files=[asset(name,new Blob([raw],{type:'text/plain;charset=utf-8'}))];
    await commit(files);return raw;
  }
  async function finishImage(data){
    const encoded=data.data?.[0]?.b64_json;if(!encoded)throw Error('图像服务需要返回 b64_json 格式的图片');
    const bytes=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0));
    const blob=new Blob([bytes],{type:'image/png'});const image=await createImageBitmap(blob);image.close();
    await commit([asset('效果图.png',blob,'image')]);
  }
  return {jobs,brief,finish,finishImage};
})();
async function editGenerated(asset){
  const dialog=el('editResult');
  el('editTitle').textContent=asset.name;el('editText').value=await asset.blob.text();el('editStatus').textContent='';
  el('editSave').onclick=async()=>{
    const old=asset.blob;asset.blob=new Blob([el('editText').value],{type:old.type});
    try{await persist();dialog.close();draw()}catch{asset.blob=old;el('editStatus').textContent='保存失败，请重试'}
  };
  el('editClose').onclick=()=>dialog.close();dialog.showModal();
}
