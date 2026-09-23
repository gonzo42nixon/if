/* Version payloads live in Storage; only the version index lives in the envelope. */
(() => {
  'use strict';
  const valid=/^ORCAI-\d{6}-\d{2}H\d{2}-IFDOC-[A-Z0-9]{5}$/;
  const digest=payload=>OrcaiDocumentSources.hash({...payload,source:OrcaiDocumentSources.hashInput(payload.source)});
  const key=()=>{const d=new Date(),p=n=>String(n).padStart(2,'0');return 'ORCAI-'+String(d.getUTCFullYear()).slice(2)+p(d.getUTCMonth()+1)+p(d.getUTCDate())+'-'+p(d.getUTCHours())+'H'+p(d.getUTCMinutes())+'-IFDOC-'+crypto.randomUUID().replaceAll('-','').slice(0,5).toUpperCase();};
  function client(value){if(!/^[A-Z0-9]{2,16}$/.test(value||''))throw new Error('Bitte gültige Client-ID auswählen (2–16 Großbuchstaben/Ziffern).');return value;}
  function ref(c,k){client(c);if(!valid.test(k))throw new Error('Ungültiger Dokument-Schlüssel.');return firebase.firestore().doc(`clients/${c}/envelopes/${k}`);}
  async function user(){const auth=firebase.auth();if(!auth.currentUser)await new Promise(resolve=>{const off=auth.onAuthStateChanged(()=>{off();resolve();});});if(!auth.currentUser)throw new Error('Bitte oben rechts anmelden und den Dokumentlink erneut öffnen.');return auth.currentUser;}
  function url(source,c,k,v){const u=new URL(OrcaiIfModel.canonicalUrl(source.model.id,source.integration.id,location.origin));u.searchParams.set('client',c);u.searchParams.set('doc',k);if(v)u.searchParams.set('version',v);return u.href;}
  async function read(c,k,version){
    const u=await user(),snap=await ref(c,k).get({source:'server'});
    if(!snap.exists)throw new Error('Gespeicherte Dokumentation nicht gefunden.');
    const head=snap.data(),history=head.ifDocument?.versions;
    if(!Array.isArray(history)||!history.length)throw new Error('Dokumenthistorie fehlt.');
    const entry=version?history.find(v=>String(v.number)===String(version)):history.at(-1);
    if(!entry)throw new Error('Diese Dokumentversion existiert nicht.');
    const path=`clients/${c}/records/${k}/${entry.file}`;
    if(!/^v-[a-f0-9-]+\.json$/.test(entry.file))throw new Error('Ungültige Versionsreferenz.');
    // Authenticated download: never create a public Storage download-token link.
    const bucket=firebase.app().options.storageBucket;
    const response=await fetch(`https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(path)}?alt=media`,{headers:{Authorization:'Firebase '+await u.getIdToken()}});
    if(!response.ok)throw new Error('Dokumentinhalt nicht zugänglich ('+response.status+').');
    const payload=await response.json();
    if(await digest(payload)!==entry.hash)throw new Error('Integritätsprüfung der Dokumentversion fehlgeschlagen.');
    return {client:c,key:k,head,entry,payload};
  }
  async function save(payload,existing,c,reason){
    const u=await user();c=client(existing?.client||c);const k=existing?.key||key(),r=ref(c,k);
    const hash=await digest(payload),before=existing?.head?.ifDocument?.versions||[],last=before.at(-1);
    if(existing&&existing.entry.number!==last.number)throw new Error('Historische Version: Bitte zuerst die aktuelle Fassung öffnen.');
    if(last?.hash===hash)return existing;
    if(before.length>=500)throw new Error('Versionsindex voll. Bitte Archivierung durch den Administrator veranlassen.');
    const file='v-'+crypto.randomUUID()+'.json',path=`clients/${c}/records/${k}/${file}`;
    const acl=existing?.head?.envelope||{whitelistRead:[],whitelistUpdate:[],whitelistDelete:[],whitelistExecute:[]};
    const packed=name=>'|'+(acl[name]||[]).join('|')+'|';
    await firebase.storage().ref(path).put(new Blob([JSON.stringify(payload)],{type:'application/json'}),{contentType:'application/json',customMetadata:{clientId:c,key:k,ownerUid:existing?.head.ownerUid||u.uid,readUids:packed('whitelistRead'),updateUids:packed('whitelistUpdate'),deleteUids:packed('whitelistDelete'),executeUids:packed('whitelistExecute')}});
    const vNum=before.length+1,intId=payload.source.integration.id,modId=payload.source.model.id;
    const entry={number:vNum,file,hash,date:new Date().toISOString(),author:u.uid,reason:String(reason||'Dokumentation gespeichert').slice(0,500)};
    const tagsSet=new Set(existing?.head?.envelope?.tags||[]);
    tagsSet.add('Type="Interface Documentation"');
    tagsSet.add(`Interface-ID="${intId}"`);
    tagsSet.add(`Model-ID="${modId}"`);
    tagsSet.add('type:interface-documentation');
    tagsSet.add('if-document');
    tagsSet.add('interface-documentation');
    tagsSet.add(intId.toLowerCase());
    for(let v=1;v<=vNum;v++)tagsSet.add(`IF-Version="${v}"`);
    const label=`${intId} · ${payload.source.integration.name||'Interface-Dokumentation'} · V${vNum}`;
    const viewerUrl=`/if/?model=${encodeURIComponent(modId)}&int=${encodeURIComponent(intId)}&client=${encodeURIComponent(c)}&doc=${encodeURIComponent(k)}`;
    await firebase.firestore().runTransaction(async tx=>{
      const snap=await tx.get(r),actual=snap.exists?snap.data():null;
      if((actual?.ifDocument?.versions?.at(-1)?.hash||null)!==(last?.hash||null)||(actual?.ifDocument?.versions?.length||0)!==before.length||(!existing&&snap.exists))throw new Error('Zwischenzeitlich wurde eine neue Version gespeichert. Bitte aktuelle Fassung neu laden; Ihre Änderung wurde nicht veröffentlicht.');
      const data=actual||{key:k,clientId:c,ownerUid:u.uid,schemaVersion:1,createdAt:firebase.firestore.FieldValue.serverTimestamp(),envelope:{...acl,label,tags:[...tagsSet],messages:[]}};
      tx.set(r,{
        ...data,
        updatedAt:firebase.firestore.FieldValue.serverTimestamp(),
        ifDocument:{
          type:'Interface Documentation',
          model:modId,
          integration:intId,
          latestVersion:vNum,
          latestHash:hash,
          versions:[...before,entry]
        },
        envelope:{
          ...data.envelope,
          label,
          viewerUrl,
          tags:[...tagsSet],
          url:`gs://${firebase.app().options.storageBucket}/${path}`
        }
      });
    });
    return read(c,k);
  }
  async function find(c,model,integration){
    c=client(c||localStorage.getItem('orcai-active-client')||'ACME');
    const auth=firebase.auth();
    if(!auth.currentUser){
      await new Promise(resolve=>{
        const off=auth.onAuthStateChanged(()=>{off();resolve();});
        setTimeout(resolve,1500);
      });
    }
    const collection=firebase.firestore().collection(`clients/${c}/envelopes`);
    let docs=[];
    try{
      const tagSnap=await collection.where('envelope.tags','array-contains',`Interface-ID="${integration}"`).get({source:'server'});
      docs=tagSnap.docs;
    }catch(e1){
      console.warn('[IF find] Tag query failed, trying ifDocument.integration:',e1?.message);
      try{
        const snap2=await collection.where('ifDocument.integration','==',integration).get({source:'server'});
        docs=snap2.docs;
      }catch(e2){
        if(e2.code!=='permission-denied')throw e2;
        if(auth.currentUser){
          try{
            const results=await Promise.all([
              collection.where('ownerUid','==',auth.currentUser.uid).get({source:'server'}),
              collection.where('envelope.whitelistRead','array-contains',auth.currentUser.uid).get({source:'server'})
            ]);
            docs=[...new Map(results.flatMap(s=>s.docs).map(d=>[d.id,d])).values()];
          }catch(e3){console.warn('[IF find] Restricted user query failed:',e3?.message);}
        }
      }
    }
    return docs.map(d=>({key:d.id,head:d.data()}))
      .filter(d=>{
        const ifDoc=d.head.ifDocument;
        if(!valid.test(d.key)||!ifDoc||!ifDoc.versions?.length)return false;
        const matchesInt=ifDoc.integration===integration||(d.head.envelope?.tags||[]).includes(`Interface-ID="${integration}"`);
        const matchesModel=!model||ifDoc.model===model||(d.head.envelope?.tags||[]).includes(`Model-ID="${model}"`);
        return matchesInt&&matchesModel;
      })
      .map(d=>({...d,client:c,entry:d.head.ifDocument.versions.at(-1),latestVersion:d.head.ifDocument.versions.length}))
      .sort((a,b)=>String(b.entry.date).localeCompare(String(a.entry.date))||b.latestVersion-a.latestVersion||a.key.localeCompare(b.key));
  }
  window.OrcaiIfVersions={read,save,url,find};
})();
