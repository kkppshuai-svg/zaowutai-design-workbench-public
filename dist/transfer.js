async function packAsset(asset) {
  if (!asset.blob) return {name:asset.name, builtin:asset.url.split('/').pop(), kind:asset.kind};
  const data = await new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onload=()=>resolve(reader.result);
    reader.onerror=()=>reject(reader.error);
    reader.readAsDataURL(asset.blob);
  });
  return {name:asset.name,kind:asset.kind,data};
}
const transferMessage = message => document.getElementById('transferStatus').textContent=message;
document.getElementById('exportDesk').onclick=async()=>{
  try {
    await writes;
    const records=[];
    for (const project of structuredClone(projects)) {
      const assets=[];
      for (const stage of project.assets) assets.push(await Promise.all(stage.map(packAsset)));
      records.push({name:project.name,notes:project.notes,assets});
    }
    const link=document.createElement('a');
    const address=URL.createObjectURL(new Blob([JSON.stringify({format:'formdesk-v1',projects:records})],{type:'application/json'}));
    link.href=address;link.download='造物台项目备份.json';link.click();
    setTimeout(()=>URL.revokeObjectURL(address),30000);
    transferMessage('项目备份已生成');
  } catch { transferMessage('导出失败，请重试'); }
};
const importButton=document.getElementById('importDesk');
if(importButton){
  importButton.onclick=()=>document.getElementById('archive').click();
  document.getElementById('archive').onchange=async event=>{
    const file=event.target.files[0];event.target.value='';if(!file)return;
    try {
      const payload=JSON.parse(await file.text());
      if(payload.format!=='formdesk-v1'||!Array.isArray(payload.projects)||!payload.projects.length)throw Error();
      const builtins=new Map(seed.assets.flat().map(a=>[a.url.split('/').pop(),a]));
      const imported=[];
      for(const record of payload.projects){
        if(typeof record.name!=='string'||!Array.isArray(record.notes)||!record.notes.every(n=>n===null||typeof n==='string')||record.assets.length!==stages.length)throw Error();
        const assets=[];
        for(const stage of record.assets){
          if(!Array.isArray(stage))throw Error();
          const files=[];
          for(const entry of stage){
            if(entry.builtin && builtins.has(entry.builtin)){files.push({...builtins.get(entry.builtin)});continue;}
            if(typeof entry.name!=='string'||!['image','file'].includes(entry.kind)||!/^data:[^,]*;base64,/.test(entry.data))throw Error();
            const comma=entry.data.indexOf(',');
            const bytes=Uint8Array.from(atob(entry.data.slice(comma+1)),c=>c.charCodeAt(0));
            const mime=entry.data.slice(5,comma).split(';')[0];
            files.push({name:entry.name,kind:entry.kind,blob:new Blob([bytes],{type:mime})});
          }
          assets.push(files);
        }
        imported.push({id:crypto.randomUUID(),name:record.name,notes:record.notes,assets});
      }
      await writes.catch(()=>{});
      await new Promise((resolve,reject)=>{const tx=db.transaction('projects','readwrite');for(const project of imported)tx.objectStore('projects').add(project);tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error);});
      projects.push(...imported);p=imported[0];step=0;item=0;dual=false;draw();transferMessage('已导入 '+imported.length+' 个项目副本');
    }catch{transferMessage('导入失败，请检查备份格式和浏览器存储空间');}
  };
}
