/* Desktop cockpit layout rendered as vectors and uniformly fitted to one A4 page. */
(() => {
  'use strict';
  async function build(source, hash, base = 'https://orcai-54321.web.app') {
    const {PDFDocument,StandardFonts,rgb,PDFName,PDFString}=PDFLib;
    const doc=await PDFDocument.create(),page=doc.addPage([595.276,841.89]);
    const font=await doc.embedFont(StandardFonts.Helvetica),bold=await doc.embedFont(StandardFonts.HelveticaBold);
    const ink=rgb(.09,.17,.23),blue=rgb(.02,.36,.61),muted=rgb(.32,.40,.46),pale=rgb(.953,.965,.973),border=rgb(.71,.77,.82),white=rgb(1,1,1);
    const sections=window.OrcaiDocumentGuide.sections(source),steps=source.steps||[],ops=[];
    const reference=window.OrcaiIfDocumentEditor?.reference();
    const url=reference?.url||window.OrcaiIfModel.canonicalUrl(source.model.id,source.integration.id,base);
    const clean=value=>[...String(value??'').replace(/[→➔]/g,' > ').replace(/[–—‑]/g,'-')].map(c=>{if(c==='\n')return c;try{font.encodeText(c);return c;}catch(_){return '?';}}).join('');
    function lines(value,width,size,face=font) {
      const result=[];
      for(const paragraph of clean(value).split('\n')) {
        let line='';
        for(const word of paragraph.split(/\s+/)) {
          const next=line?line+' '+word:word;
          if(face.widthOfTextAtSize(next,size)<=width){line=next;continue;}
          if(line)result.push(line);line='';
          for(const char of word){if(face.widthOfTextAtSize(line+char,size)>width){result.push(line);line='';}line+=char;}
        }
        result.push(line);
      }
      return result;
    }
    function text(value,x,y,width,size=12,face=font,color=ink,center=false) {
      const wrapped=lines(value,width,size,face);
      wrapped.forEach((line,i)=>ops.push({kind:'text',line,x:center?x+(width-face.widthOfTextAtSize(line,size))/2:x,y:y+i*size*1.4,size,face,color}));
      return wrapped.length*size*1.4;
    }
    const box=(x,y,w,h,color=white,stroke=border)=>ops.push({kind:'box',x,y,w,h,color,stroke});
    const link=(x,y,w,h)=>ops.push({kind:'link',x,y,w,h});
    let y=32;
    if(reference)y+=text('Dokumentversion '+reference.version+' · '+new Date(reference.date).toLocaleDateString('de-DE')+' · Online-Link: aktuelle Fassung',32,y,986,11,font,muted)+8;
    y+=text(source.integration.id+' · '+(source.integration.name||source.integration.title||''),32,y,986,23,bold)+12;
    const sub=text((source.model.name||source.model.id)+' · Vorlage '+(source.templateVersion||'OFFEN')+' · Quellen-Hash '+hash.slice(0,12),32,y,785,12,font,muted);
    box(836,y,182,30,rgb(1,.992,.91),rgb(.57,.41,0));
    text('MODELLIERT · KEINE FREIGABE',842,y+9,170,10,bold,rgb(.57,.41,0),true);
    y+=Math.max(30,sub)+16;box(32,y,986,1,ink,ink);y+=20;
    const flowTop=y,flowStart=ops.length;y+=36;
    if(!steps.length)y+=text('Keine Verbindungen hinterlegt.',46,y,958)+16;
    // Reuse exactly the same scene as the interactive view, fitted to one A4 page.
    const flowImage=await window.OrcaiIfDataFlow.png(source);
    if(flowImage){const image=await doc.embedPng(flowImage.data),h=958*flowImage.height/flowImage.width;ops.push({kind:'image',image,x:46,y,w:958,h});y+=h+12;
      y+=text('Stores: logische Modellannahmen, keine bestätigte Speicherung. Oben: Nachrichten; unten: Mappings. EIP-inspirierte ORCAI-Sicht.',46,y,950,11,font,muted);}
    y+=4;ops.splice(flowStart,0,{kind:'box',x:32,y:flowTop,w:986,h:y-flowTop,color:pale,stroke:border});
    text('Datenfluss · modellierte Verbindungen',46,flowTop+14,950,14,bold);y+=18;
    const diagrams=await window.OrcaiIfDiagrams?.images()||[];
    for(const diagram of diagrams){
      y+=text('BPMN · '+diagram.id+' · '+diagram.name+' · '+source.integration.id+' gold hervorgehoben',32,y,986,14,bold)+6;
      const image=await doc.embedPng(diagram.data),h=958*diagram.height/diagram.width;
      ops.push({kind:'image',image,x:46,y,w:958,h});link(46,y,958,h);y+=h+14;
    }
    if(!diagrams.length)y+=text('BPMN: kein darstellbares Prozessdiagramm zugeordnet.',32,y,986,12,font,muted)+10;
    for(let row=0;row<Math.ceil(sections.length/5);row++) {
      const items=sections.slice(row*5,row*5+5),h=Math.max(...items.map(s=>42+lines(s.number+'. '+s.title,174,13,bold).length*19));
      items.forEach((s,col)=>{
        const x=32+col*199,missing=s.fields.filter(f=>!f.entries.length).length;
        box(x,y,190,h);box(x,y,3,h,missing===0?rgb(.18,.49,.20):missing===s.fields.length?rgb(.78,.15,.15):rgb(.98,.66,.15));
        text(s.number+'. '+s.title,x+8,y+8,174,13,bold);
        text(missing+'/'+s.fields.length+' offen · Details online',x+8,y+h-23,174,11,font,blue);link(x,y,190,h);
      });y+=h+9;
    }
    y+=9;
    const infoY=y;
    y+=text('Info & Details online: Erläuterungen, offene Punkte, Quellen, Nachrichten, Mappings und Tests. Diagramme zum Vergrößern anklicken.',32,y,986,12,font,blue)+12;
    link(32,infoY,986,y-infoY);
    const selfTop=y,selfStart=ops.length;y+=16;
    y+=text('Interaktives Cockpit · Details und Diagramme in voller Größe',187,y,813,14,bold)+6;
    y+=text('Interface-ID: '+source.integration.id+' · Modell: '+source.model.id,187,y,813,12)+12;
    const linkTop=y;y+=text(url,187,y,813,12,font,blue)+12;link(187,linkTop,813,y-linkTop);
    y+=text('SHA-256: '+hash,187,y,813,11,font,muted)+16;y=Math.max(y,selfTop+152);
    ops.splice(selfStart,0,{kind:'box',x:32,y:selfTop,w:986,h:y-selfTop,color:pale,stroke:border});
    if(window.qrcode){
      const qr=window.qrcode(0,'M');qr.addData(url);qr.make();const count=qr.getModuleCount(),unit=120/(count+8);
      box(46,selfTop+16,120,120,white,white);
      for(let r=0;r<count;r++)for(let c=0;c<count;c++)if(qr.isDark(r,c))ops.push({kind:'box',x:46+(c+4)*unit,y:selfTop+16+(r+4)*unit,w:unit,h:unit,color:rgb(0,0,0)});
    }
    y+=18;box(32,y,986,1,border,border);y+=14;
    y+=text('Modellierte Angaben sind kein Produktivnachweis. OFFEN bedeutet: in den verwendeten Quellen nicht dokumentiert. Kapitel-Ampeln zeigen nur die Vollständigkeit, keine technische oder fachliche Freigabe.',32,y,986,12,font,muted)+24;
    const scale=Math.min(595.276/1050,821.89/y),left=(595.276-1050*scale)/2,top=10,annotations=[];
    for(const op of ops){
      const x=left+op.x*scale,py=841.89-top-op.y*scale;
      if(op.kind==='text')page.drawText(op.line,{x,y:py-op.size*scale,size:op.size*scale,font:op.face,color:op.color});
      if(op.kind==='box')page.drawRectangle({x,y:py-op.h*scale,width:op.w*scale,height:op.h*scale,color:op.color,borderColor:op.stroke,borderWidth:op.stroke?0.7*scale:0});
      if(op.kind==='image')page.drawImage(op.image,{x,y:py-op.h*scale,width:op.w*scale,height:op.h*scale});
      if(op.kind==='arrow'){const line=(a,b,c,d)=>page.drawLine({start:{x:x+a*scale,y:py+b*scale},end:{x:x+c*scale,y:py+d*scale},thickness:1.5*scale,color:blue});line(-8,0,8,0);line(3,4,8,0);line(3,-4,8,0);}
      if(op.kind==='link')annotations.push(doc.context.register(doc.context.obj({Type:'Annot',Subtype:'Link',Rect:[x,py-op.h*scale,x+op.w*scale,py],Border:[0,0,0],A:{S:'URI',URI:PDFString.of(url)}})));
    }
    page.node.set(PDFName.of('Annots'),doc.context.obj(annotations));doc.setTitle(source.integration.id+' - ORCAI IF Cockpit');doc.setCreator('ORCAI IF');return doc.save();
  }
  async function download(source,hash){
    const bytes=await build(source,hash,location.origin),url=URL.createObjectURL(new Blob([bytes],{type:'application/pdf'}));
    const a=document.createElement('a');a.href=url;a.download=source.integration.id+'-A4.pdf';a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);
  }
  window.OrcaiIfPdf={build,download};
})();
