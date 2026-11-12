(() => {
  const $ = id => document.getElementById(id);
  const grid=$('songs-grid'),audio=$('audio'),search=$('search'),count=$('song-count');
  const albumsGrid=$('albums-grid');
  if(!grid||!audio||!search||!count)return;
  if(!window.supabase?.createClient||!window.SUPABASE_URL||!window.SUPABASE_PUBLISHABLE_KEY){
    grid.textContent='Website connection is unavailable. Please refresh.';return;
  }
  const db=window.supabase.createClient(window.SUPABASE_URL,window.SUPABASE_PUBLISHABLE_KEY);
  let songs=[],albums=[],links=[],activeAlbum=null,currentVisible=[],playQueue=[],currentIndex=-1;
  let seeking=false;
  const readList=k=>{try{return JSON.parse(localStorage.getItem(k)||'[]')}catch(_){return []}};
  const writeList=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(_){}};
  let favorites=readList('anna-favorites'),recent=readList('anna-recent');
  let visitorId=localStorage.getItem('anna-visitor-id');
  if(!visitorId){visitorId=(crypto.randomUUID?crypto.randomUUID():String(Date.now())+Math.random());try{localStorage.setItem('anna-visitor-id',visitorId)}catch(_){}}
  const publicUrl=(p,bucket=window.SONGS_BUCKET)=>p?db.storage.from(bucket||window.SONGS_BUCKET).getPublicUrl(p).data.publicUrl:'';
  const sharedPhoto='data:image/jpeg;base64,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';
  const coverUrl=song=>song?.cover_path && song.cover_path!=='__shared_cover__' ? publicUrl(song.cover_path) : sharedPhoto;
  const setSafeCover=(img,song)=>{img.src=coverUrl(song);img.onerror=()=>{img.onerror=null;img.src='cover-placeholder.svg';};};
  const timeText=value=>{
    if(!Number.isFinite(value))return '0:00';
    const m=Math.floor(value/60),s=Math.floor(value%60);
    return m+':'+String(s).padStart(2,'0');
  };
  function updatePlayButton(){
    const btn=$('toggle-play');
    if(btn){btn.textContent=audio.paused?'▶':'Ⅱ';btn.setAttribute('aria-label',audio.paused?'Play':'Pause');}
  }
  function updateProgress(){
    const slider=$('progress');
    if(!slider)return;
    if(!seeking&&Number.isFinite(audio.duration)&&audio.duration>0){
      slider.value=String(Math.round(audio.currentTime/audio.duration*1000));
    }
    $('elapsed').textContent=timeText(audio.currentTime);
    $('duration').textContent=timeText(audio.duration);
  }
  function updateMediaSession(song){
    if(!('mediaSession' in navigator))return;
    try{
      if('MediaMetadata' in window){
        navigator.mediaSession.metadata=new MediaMetadata({
          title:song.title||'Untitled',artist:song.artist||'Anna',album:"Anna's Song",
          artwork:[96,128,192,256,384,512].map(size=>({src:coverUrl(song),sizes:size+'x'+size,type:'image/svg+xml'}))
        });
      }
      navigator.mediaSession.setActionHandler('play',()=>audio.play());
      navigator.mediaSession.setActionHandler('pause',()=>audio.pause());
      navigator.mediaSession.setActionHandler('previoustrack',playPrevious);
      navigator.mediaSession.setActionHandler('nexttrack',playNext);
      navigator.mediaSession.setActionHandler('seekbackward',details=>{audio.currentTime=Math.max(0,audio.currentTime-(details.seekOffset||10));});
      navigator.mediaSession.setActionHandler('seekforward',details=>{audio.currentTime=Math.min(audio.duration||Infinity,audio.currentTime+(details.seekOffset||10));});
    }catch(_){}
  }
  function rememberPlay(song){
    recent=[song.id,...recent.filter(id=>id!==song.id)].slice(0,12);writeList('anna-recent',recent);
    db.from('song_plays').insert({song_id:song.id,visitor_id:visitorId}).then(()=>{});
    renderRecent();
  }
  function showPlaying(song,queue=currentVisible){
    playQueue=queue.length?queue:[song];
    currentIndex=playQueue.findIndex(item=>item.id===song.id);
    if(currentIndex<0){playQueue=[song];currentIndex=0;}
    const cover=$('now-cover');
    if(cover){setSafeCover(cover,song);cover.alt=(song.title||'Song')+' cover';cover.style.animation='none';void cover.offsetWidth;cover.style.animation='coverIn .55s ease both';}
    $('now-title').textContent=song.title||'Untitled';
    $('now-artist').textContent=song.artist||'Anna';
    audio.src=publicUrl(song.audio_path,song.audio_bucket);
    rememberPlay(song);
    audio.load();
    updateMediaSession(song);
    audio.play().then(updatePlayButton).catch(updatePlayButton);
  }
  function playNext(){
    if(!playQueue.length)return;
    const next=(currentIndex+1)%playQueue.length;
    showPlaying(playQueue[next],playQueue);
  }
  function playPrevious(){
    if(audio.currentTime>3){audio.currentTime=0;return;}
    if(!playQueue.length)return;
    const prev=(currentIndex-1+playQueue.length)%playQueue.length;
    showPlaying(playQueue[prev],playQueue);
  }
  $('toggle-play').addEventListener('click',()=>{
    if(!audio.src){if(currentVisible.length)showPlaying(currentVisible[0],currentVisible);return;}
    if(audio.paused)audio.play().catch(()=>{});else audio.pause();
  });
  $('next').addEventListener('click',playNext);
  $('previous').addEventListener('click',playPrevious);
  $('progress').addEventListener('input',()=>{seeking=true;});
  $('progress').addEventListener('change',e=>{
    if(Number.isFinite(audio.duration)&&audio.duration>0)audio.currentTime=(Number(e.target.value)/1000)*audio.duration;
    seeking=false;updateProgress();
  });
  audio.addEventListener('timeupdate',updateProgress);
  audio.addEventListener('loadedmetadata',updateProgress);
  audio.addEventListener('durationchange',updateProgress);
  audio.addEventListener('play',updatePlayButton);
  audio.addEventListener('pause',updatePlayButton);
  audio.addEventListener('ended',playNext);

  function renderAlbums(){
    if(!albumsGrid)return;
    albumsGrid.innerHTML='';
    const all=document.createElement('button');
    all.type='button';all.className='all-songs';all.textContent=activeAlbum===null?'✓ All songs':'All songs';
    all.onclick=()=>{activeAlbum=null;renderAlbums();renderSongs();};
    albumsGrid.append(all);
    albums.forEach(album=>{
      const card=document.createElement('button');card.type='button';card.className='album-card'+(activeAlbum===album.id?' active':'');
      const img=document.createElement('img');setSafeCover(img,album);img.alt=album.title+' cover';
      const name=document.createElement('strong');name.textContent=album.title;
      const n=links.filter(x=>x.album_id===album.id).length;
      const small=document.createElement('small');small.textContent=n+' songs';
      card.append(img,name,small);
      card.onclick=()=>{activeAlbum=activeAlbum===album.id?null:album.id;renderAlbums();renderSongs();};
      albumsGrid.append(card);
    });
  }
  function renderSongs(){
    const q=search.value.trim().toLowerCase();
    const albumSongIds=new Set(links.map(x=>x.song_id));
    let visible=songs;
    if(activeAlbum!==null){
      const ids=new Set(links.filter(x=>x.album_id===activeAlbum).map(x=>x.song_id));
      visible=visible.filter(s=>ids.has(s.id));
    }else visible=visible.filter(s=>!albumSongIds.has(s.id));
    visible=visible.filter(s=>(String(s.title||'')+' '+String(s.artist||'')).toLowerCase().includes(q));
    currentVisible=visible;
    count.textContent=visible.length+' songs'+(activeAlbum!==null?' in album':'');
    grid.innerHTML='';
    if(!visible.length){const empty=document.createElement('div');empty.className='empty';empty.textContent='No songs found.';grid.append(empty);return;}
    visible.forEach(song=>{
      const card=document.createElement('div');card.className='song';
      const cover=document.createElement('img');cover.className='cover';cover.alt='Song cover';setSafeCover(cover,song);
      const info=document.createElement('div');info.className='song-info';
      const title=document.createElement('strong');title.textContent=song.title||'Untitled';
      const artist=document.createElement('small');artist.textContent=song.artist||'Anna';info.append(title,artist);
      const btn=document.createElement('button');btn.type='button';btn.className='play-button';btn.textContent='▶ Play';
      btn.addEventListener('click',()=>showPlaying(song,currentVisible));
      const actions=document.createElement('div');actions.className='song-actions';
      const fav=document.createElement('button');fav.type='button';fav.className='mini-action';fav.textContent=favorites.includes(song.id)?'♥ Saved':'♡ Save';fav.setAttribute('aria-label','Save favourite');
      fav.onclick=()=>{favorites=favorites.includes(song.id)?favorites.filter(id=>id!==song.id):[song.id,...favorites];writeList('anna-favorites',favorites);fav.textContent=favorites.includes(song.id)?'♥ Saved':'♡ Save';renderFavorites();};
      const share=document.createElement('button');share.type='button';share.className='mini-action';share.textContent='↗ Share';
      share.onclick=async()=>{const url=new URL(location.href);url.searchParams.set('song',song.id);try{if(navigator.share)await navigator.share({title:song.title,text:"Listen to "+song.title+" on Anna's Song",url:url.href});else{await navigator.clipboard.writeText(url.href);share.textContent='Copied!';}}catch(_){}};
      actions.append(fav,share);card.append(cover,info,btn,actions);grid.append(card);
    });
  }
  search.addEventListener('input',renderSongs);
  function renderFavorites(){
    const box=$('favorites-list');if(!box)return;box.innerHTML='';
    const items=favorites.map(id=>songs.find(s=>s.id===id)).filter(Boolean);
    if(!items.length){box.textContent='Tap ♡ Save on any song to keep it here.';return;}
    items.forEach(song=>{const b=document.createElement('button');b.className='recent-chip';b.type='button';b.textContent='▶ '+song.title;b.onclick=()=>showPlaying(song,[song]);box.append(b);});
  }
  function renderRecent(){
    const box=$('recent-list');if(!box)return;box.innerHTML='';
    const items=recent.map(id=>songs.find(s=>s.id===id)).filter(Boolean).slice(0,8);
    if(!items.length){box.textContent='Songs you play will appear here.';return;}
    items.forEach(song=>{const b=document.createElement('button');b.className='recent-chip';b.type='button';b.textContent='▶ '+song.title;b.onclick=()=>showPlaying(song,[song]);box.append(b);});
  }
  function renderSongOfDay(){
    const box=$('song-of-day');if(!box)return;
    db.from('song_of_day').select('song_id').eq('id',true).maybeSingle().then(({data})=>{
      const song=songs.find(s=>s.id===data?.song_id);if(!song){box.hidden=true;return;}
      box.hidden=false;box.innerHTML='';
      const h=document.createElement('strong');h.textContent='✦ Song of the Day';
      const name=document.createElement('span');name.textContent=song.title+' — '+(song.artist||'Anna');
      const play=document.createElement('button');play.className='play-button';play.textContent='▶ Listen';play.onclick=()=>showPlaying(song,[song]);
      const share=document.createElement('button');share.className='mini-action';share.textContent='↗ Share';share.onclick=()=>{const u=new URL(location.href);u.searchParams.set('song',song.id);navigator.clipboard?.writeText(u.href).then(()=>share.textContent='Copied!').catch(()=>{});};
      box.append(h,name,play,share);
    });
  }
  async function load(){
    grid.textContent='Loading songs…';
    const {data:s,error}=await db.from('songs').select('*').order('created_at',{ascending:false});
    if(error){grid.textContent='Could not load songs: '+error.message;return;}
    songs=s||[];
    const [a,l]=await Promise.all([
      db.from('albums').select('*').order('created_at',{ascending:false}),
      db.from('album_songs').select('*')
    ]);
    albums=a.error?[]:(a.data||[]);
    links=l.error?[]:(l.data||[]);
    renderAlbums();renderSongs();renderRecent();renderFavorites();renderSongOfDay();updateProgress();

  }

  const commentForm=$('comment-form');
  if(commentForm){
    let lastCommentAt=0;
    const songSelect=$('comment-song');
    function fillCommentSongs(){
      if(!songSelect)return;
      const chosen=songSelect.value;
      songSelect.innerHTML='<option value="">General comment</option>';
      songs.forEach(song=>{
        const option=document.createElement('option');
        option.value=song.id;option.textContent=song.title||'Untitled';
        songSelect.append(option);
      });
      songSelect.value=chosen;
    }
    async function loadComments(){
      const list=$('comments-list');
      if(!list)return;
      const {data,error}=await db.from('comments').select('id,song_id,display_name,message,created_at,is_pinned').order('is_pinned',{ascending:false}).order('created_at',{ascending:false}).limit(100);
      list.innerHTML='';
      if(error){list.textContent='Comments could not be loaded right now.';return;}
      if(!data?.length){list.innerHTML='<div class="empty">No comments yet. Be the first to leave a little note ♡</div>';return;}
      const ids=data.map(c=>c.id);
      let likeRows=[];
      if(ids.length){const lr=await db.from('comment_likes').select('comment_id,visitor_id').in('comment_id',ids);likeRows=lr.data||[];}
      data.forEach(comment=>{
        const item=document.createElement('article');item.className='comment-item';
        const meta=document.createElement('div');meta.className='comment-meta';
        const name=document.createElement('strong');name.textContent=comment.display_name;
        const date=document.createElement('time');
        const parsed=new Date(comment.created_at);
        date.textContent=Number.isNaN(parsed.getTime())?'':parsed.toLocaleString();
        meta.append(name,date);
        const message=document.createElement('p');message.textContent=comment.message;
        item.append(meta,message);
        if(comment.is_pinned){const pin=document.createElement('span');pin.className='pinned-label';pin.textContent='📌 Pinned';item.append(pin);}
        const likeBtn=document.createElement('button');likeBtn.type='button';likeBtn.className='comment-like';
        const liked=likeRows.some(x=>x.comment_id===comment.id&&x.visitor_id===visitorId);
        const total=likeRows.filter(x=>x.comment_id===comment.id).length;
        likeBtn.textContent=(liked?'♥':'♡')+' Like · '+total;
        likeBtn.onclick=async()=>{likeBtn.disabled=true;
          if(liked){await db.from('comment_likes').delete().eq('comment_id',comment.id).eq('visitor_id',visitorId);}
          else{await db.from('comment_likes').insert({comment_id:comment.id,visitor_id:visitorId});}
          await loadComments();
        };
        item.append(likeBtn);
        if(comment.song_id){
          const song=songs.find(s=>s.id===comment.song_id);
          if(song){const tag=document.createElement('span');tag.className='comment-song';tag.textContent='♪ '+song.title;item.append(tag);}
        }
        list.append(item);
      });
    }
    commentForm.addEventListener('submit',async event=>{
      event.preventDefault();
      const name=$('comment-name').value.trim();
      const message=$('comment-message').value.trim();
      const songId=songSelect.value||null;
      const status=$('comment-status'),button=$('comment-submit');
      if(!name||!message){status.textContent='Please add your name and comment.';return;}
      if(Date.now()-lastCommentAt<30000){status.textContent='Please wait a little before posting another comment.';return;}
      button.disabled=true;status.textContent='Posting your comment…';
      const {error}=await db.from('comments').insert({display_name:name,message,song_id:songId});
      button.disabled=false;
      if(error){status.textContent='Could not post comment. Please try again.';return;}
      lastCommentAt=Date.now();$('comment-message').value='';
      status.textContent='Your comment is posted. Thank you ♡';
      await loadComments();
    });
    window.refreshGuestbook=loadComments;
    window.addEventListener('focus',loadComments);
    loadComments();
  }

  load().then(()=>{
    const shareId=new URLSearchParams(location.search).get('song');if(shareId){const shared=songs.find(s=>s.id===shareId);if(shared)showPlaying(shared,[shared]);}
    const select=$('comment-song');
    if(select){const selected=select.value;select.innerHTML='<option value="">General comment</option>';songs.forEach(song=>{const option=document.createElement('option');option.value=song.id;option.textContent=song.title||'Untitled';select.append(option);});select.value=selected;}
    if(window.refreshGuestbook)window.refreshGuestbook();
  });
})();