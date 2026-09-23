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
    const entry={number:before.length+1,file,hash,date:new Date().toISOString(),author:u.uid,reason:String(reason||'Dokumentation gespeichert').slice(0,500)};
    await firebase.firestore().runTransaction(async tx=>{
      const snap=await tx.get(r),actual=snap.exists?snap.data():null;
      if((actual?.ifDocument?.versions?.at(-1)?.hash||null)!==(last?.hash||null)||(actual?.ifDocument?.versions?.length||0)!==before.length||(!existing&&snap.exists))throw new Error('Zwischenzeitlich wurde eine neue Version gespeichert. Bitte aktuelle Fassung neu laden; Ihre Änderung wurde nicht veröffentlicht.');
      const data=actual||{key:k,clientId:c,ownerUid:u.uid,schemaVersion:1,createdAt:firebase.firestore.FieldValue.serverTimestamp(),envelope:{...acl,label:payload.source.integration.id+' · Interface-Dokumentation',tags:['if-document'],messages:[]}};
      tx.set(r,{...data,updatedAt:firebase.firestore.FieldValue.serverTimestamp(),ifDocument:{model:payload.source.model.id,integration:payload.source.integration.id,versions:[...before,entry]},envelope:{...data.envelope,url:`gs://${firebase.app().options.storageBucket}/${path}`}});
    });
    return read(c,k);
  }
  window.OrcaiIfVersions={read,save,url};
})();
