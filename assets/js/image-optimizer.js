(function(){
  const PUBLIC_MARK='/storage/v1/object/public/';
  const RENDER_MARK='/storage/v1/render/image/public/';

  function optimizedUrl(url,width=900,quality=68){
    const raw=String(url||'').trim();
    if(!raw || !raw.startsWith('http') || !raw.includes(PUBLIC_MARK)) return raw;
    if(raw.includes(RENDER_MARK)) return raw;
    const base=raw.replace(PUBLIC_MARK,RENDER_MARK).split('?')[0];
    return `${base}?width=${Math.max(100,Math.round(width))}&quality=${Math.max(20,Math.min(100,Math.round(quality)))}`;
  }

  function formatBytes(bytes){
    const n=Number(bytes||0);
    if(n<1024) return `${n} B`;
    if(n<1024*1024) return `${(n/1024).toFixed(1)} KB`;
    return `${(n/1024/1024).toFixed(2)} MB`;
  }

  async function decodeImage(file){
    if(typeof createImageBitmap==='function'){
      try{
        const bitmap=await createImageBitmap(file);
        return {width:bitmap.width,height:bitmap.height,draw:(ctx,w,h)=>ctx.drawImage(bitmap,0,0,w,h),close:()=>bitmap.close?.()};
      }catch(error){ console.warn('createImageBitmap falhou; usando fallback.', error); }
    }
    const objectUrl=URL.createObjectURL(file);
    try{
      const img=await new Promise((resolve,reject)=>{
        const el=new Image();
        el.onload=()=>resolve(el);
        el.onerror=()=>reject(new Error('O navegador não conseguiu abrir esta imagem.'));
        el.src=objectUrl;
      });
      return {width:img.naturalWidth||img.width,height:img.naturalHeight||img.height,draw:(ctx,w,h)=>ctx.drawImage(img,0,0,w,h),close:()=>{}};
    }finally{ URL.revokeObjectURL(objectUrl); }
  }

  async function compressImage(file,opts={}){
    if(!file || !String(file.type||'').startsWith('image/')) return file;
    if(file.type==='image/gif' || file.type==='image/svg+xml') return file;
    const maxWidth=Number(opts.maxWidth||1600), maxHeight=Number(opts.maxHeight||1600);
    const quality=Math.max(.45,Math.min(.92,Number(opts.quality||.78)));
    const decoded=await decodeImage(file);
    try{
      const scale=Math.min(1,maxWidth/decoded.width,maxHeight/decoded.height);
      const width=Math.max(1,Math.round(decoded.width*scale));
      const height=Math.max(1,Math.round(decoded.height*scale));
      const canvas=document.createElement('canvas');
      canvas.width=width; canvas.height=height;
      const ctx=canvas.getContext('2d',{alpha:false,desynchronized:true});
      if(!ctx) throw new Error('O navegador não permitiu otimizar a imagem.');
      ctx.fillStyle='#fff'; ctx.fillRect(0,0,width,height);
      decoded.draw(ctx,width,height);
      const blob=await new Promise((resolve,reject)=>canvas.toBlob(
        b=>b?resolve(b):reject(new Error('Falha ao gerar o arquivo WebP.')),
        'image/webp', quality
      ));
      if(blob.type!=='image/webp') throw new Error('Este navegador não gerou WebP corretamente.');
      const name=String(file.name||'imagem').replace(/\.[^.]+$/, '')+'.webp';
      const result=new File([blob],name,{type:'image/webp',lastModified:Date.now()});
      result.__barmyOptimization={originalBytes:file.size,finalBytes:result.size,width,height};
      return result;
    }finally{ decoded.close?.(); }
  }

  window.BARMY_IMAGE={optimizedUrl,compressImage,formatBytes};
})();
