(() => {
  const panel=el('ai'), provider=el('provider'), endpoint=el('endpoint'), key=el('key');
  const model=el('model'), manual=el('manualModel'), status=el('aiStatus'), answer=el('answer');
  let active;
  const manualOption=()=>new Option('手动输入模型 ID','');
  function resetConnection(){
    key.value=''; model.replaceChildren(manualOption()); manual.hidden=false;manual.value='';
    status.textContent='';answer.textContent='';
  }
  provider.onchange=()=>{endpoint.value=provider.value;endpoint.readOnly=!!provider.value;resetConnection()};
  endpoint.oninput=resetConnection;
  model.onchange=()=>{manual.hidden=!!model.value};
  el('aiOpen').onclick=()=>{
    if(!p)return; el('taskInfo').textContent=pipeline.jobs[step].split('。')[0]+'。'; el('aiTitle').textContent=stages[step]+' · 生成';el('outputMode').hidden=step!==4;el('renderMode').value='scene';answer.textContent='';status.textContent='';const hasImage=p?.assets[step]?.[item]?.kind==='image';
    el('sendImage').disabled=!hasImage;el('sendImage').checked=false;el('sendNotes').checked=true;
    panel.showModal();
  };
  el('renderMode').onchange=()=>{el('sendImage').disabled=el('renderMode').value==='image'||p.assets[step][item]?.kind!=='image';el('sendImage').checked=false;el('taskInfo').textContent=el('renderMode').value==='image'?'选择支持图像生成的模型，使用上游设计描述生成效果图。':pipeline.jobs[step].split('。')[0]}; el('aiClose').onclick=()=>panel.close();
  panel.onclose=()=>active?.abort();
  function base(){
    let u;try{u=new URL(endpoint.value.trim())}catch{throw Error('请输入完整的 HTTPS 服务地址')}
    if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash)throw Error('请使用无认证参数的 HTTPS 服务地址');
    return u.href.replace(/\/+$/,'');
  }
  async function run(mode){
    if(active)return;
    const controller=new AbortController();active=controller;
    const timeout=setTimeout(()=>controller.abort(),120000);
    el('aiFields').disabled=true;answer.textContent='';
    try{
      const address=base(), token=key.value.trim();
      if(!token)throw Error('请填写该服务的 API Key');
      const options={headers:{Authorization:'Bearer '+token},credentials:'omit',redirect:'error',referrerPolicy:'no-referrer',cache:'no-store',signal:controller.signal};
      let route='/models';
      if(mode==='ask'){
        const id=model.value||manual.value.trim(), question=el('question').value.trim();
        if(!id)throw Error('请选择或填写模型 ID');
        let content=await pipeline.brief(question,el('sendNotes').checked);
        const makeImage=step===4&&el('renderMode').value==='image';content+='\n\n'+(makeImage?'生成工业设计产品棚拍效果图':pipeline.jobs[step]);
        if(el('sendImage').checked){
          const asset=p.assets[step][item];
          const blob=asset.blob||await (async()=>{const res=await fetch(asset.url,{signal:controller.signal});if(!res.ok)throw Error('图片读取失败');return res.blob()})();
          const data=await new Promise((ok,no)=>{const reader=new FileReader();reader.onload=()=>ok(reader.result);reader.onerror=()=>no(Error('图片读取失败'));reader.readAsDataURL(blob)});
          content=[{type:'text',text:content},{type:'image_url',image_url:{url:data}}];
        }
        route=makeImage?'/images/generations':'/chat/completions';options.method='POST';options.headers['Content-Type']='application/json';
        options.body=JSON.stringify(makeImage?{model:id,prompt:content,n:1,size:"1024x1024"}:{model:id,messages:[{role:'user',content}],stream:false});
      }
      status.textContent='正在连接 '+new URL(address).hostname+'…';
      const res=await fetch(address+route,options);
      if(!res.ok){
        const hints={401:'请检查 API Key',403:'请检查密钥权限',429:'请检查额度或稍后重试',400:'请检查模型与输入类型',404:'请检查服务地址或模型 ID'};
        throw Error('服务返回 '+res.status+'。'+(hints[res.status]||'请稍后重试'));
      }
      const data=await res.json();
      if(mode==='list'){
        const ids=[...new Set((data.data||[]).map(x=>x.id).filter(x=>typeof x==='string'&&x))].sort();
        model.replaceChildren(manualOption(),...ids.map(id=>new Option(id,id)));
        if(ids.length)model.value=ids[0];model.onchange();status.textContent='已读取 '+ids.length+' 个模型，也可手动输入 ID。';
      }else if(mode==='ask'&&step===4&&el('renderMode').value==='image'){await pipeline.finishImage(data);status.textContent='效果图已保存到项目';}else{
        const result=data.choices?.[0]?.message?.content;
        if(typeof result!=='string'||!result.trim())throw Error('模型未返回文字，请选择支持对话的模型');
        await pipeline.finish(result);answer.textContent=step===1?'设计图已生成，可在阶段图库中查看。':result;status.textContent='成果已保存，可关闭窗口查看或下载。';
      }
    }catch(err){status.textContent=err.name==='AbortError'?'请求已停止或超时':err instanceof TypeError?'连接失败，请检查网络、服务地址和服务商的浏览器跨域设置。':err.message}
    finally{clearTimeout(timeout);active=null;el('aiFields').disabled=false}
  }
  el('models').onclick=()=>run('list');el('ask').onclick=()=>run('ask');
})();

