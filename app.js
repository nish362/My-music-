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
  const publicUrl=p=>p?db.storage.from(window.SONGS_BUCKET).getPublicUrl(p).data.publicUrl:'';
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
  function showPlaying(song,queue=currentVisible){
    playQueue=queue.length?queue:[song];
    currentIndex=playQueue.findIndex(item=>item.id===song.id);
    if(currentIndex<0){playQueue=[song];currentIndex=0;}
    const cover=$('now-cover');
    if(cover){setSafeCover(cover,song);cover.alt=(song.title||'Song')+' cover';cover.style.animation='none';void cover.offsetWidth;cover.style.animation='coverIn .55s ease both';}
    $('now-title').textContent=song.title||'Untitled';
    $('now-artist').textContent=song.artist||'Anna';
    audio.src=publicUrl(song.audio_path);
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
      card.append(cover,info,btn);grid.append(card);
    });
  }
  search.addEventListener('input',renderSongs);
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
    renderAlbums();renderSongs();updateProgress();

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
      const {data,error}=await db.from('comments').select('id,song_id,display_name,message,created_at').order('created_at',{ascending:false}).limit(100);
      list.innerHTML='';
      if(error){list.textContent='Comments could not be loaded right now.';return;}
      if(!data?.length){list.innerHTML='<div class="empty">No comments yet. Be the first to leave a little note ♡</div>';return;}
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
    const select=$('comment-song');
    if(select){const selected=select.value;select.innerHTML='<option value="">General comment</option>';songs.forEach(song=>{const option=document.createElement('option');option.value=song.id;option.textContent=song.title||'Untitled';select.append(option);});select.value=selected;}
    if(window.refreshGuestbook)window.refreshGuestbook();
  });
})();