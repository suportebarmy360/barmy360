(function(){
  const PUBLIC_MARK='/storage/v1/object/public/';
  const RENDER_MARK='/storage/v1/render/image/public/';
  function optimizedUrl(url,width=900,quality=68){
    const raw=String(url||'').trim();
    if(!raw || !raw.startsWith('http') || !raw.includes(PUBLIC_MARK)) return raw;
    const base=raw.replace(PUBLIC_MARK,RENDER_MARK).split('?')[0];
    return `${base}?width=${Math.max(100,Math.round(width))}&quality=${Math.max(20,Math.min(100,Math.round(quality)))}`;
  }
  async function compressImage(file, opts={}){
    if(!file || !String(file.type||'').startsWith('image/')) return file;
    const maxWidth=opts.maxWidth||1600, maxHeight=opts.maxHeight||1600, quality=opts.quality||0.78;
    if(file.type==='image/gif' || file.type==='image/svg+xml') return file;
    const bitmap=await createImageBitmap(file);
    const scale=Math.min(1,maxWidth/bitmap.width,maxHeight/bitmap.height);
    const width=Math.max(1,Math.round(bitmap.width*scale));
    const height=Math.max(1,Math.round(bitmap.height*scale));
    const canvas=document.createElement('canvas'); canvas.width=width; canvas.height=height;
    const ctx=canvas.getContext('2d',{alpha:false}); ctx.drawImage(bitmap,0,0,width,height); bitmap.close?.();
    const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Falha ao otimizar imagem.')),'image/webp',quality));
    const name=String(file.name||'imagem').replace(/\.[^.]+$/, '')+'.webp';
    return new File([blob],name,{type:'image/webp',lastModified:Date.now()});
  }
  window.BARMY_IMAGE={optimizedUrl,compressImage};
})();
